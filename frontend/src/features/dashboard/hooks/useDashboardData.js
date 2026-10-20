import { useCallback, useEffect, useState } from 'react';
import apiService from '../../../api';
import { getApiErrorMessage } from '../../../shared/utils/apiError';

const emptyStats = {
  totalPortfolios: 0,
  totalValue: 0,
  totalReturn: 0,
  totalReturnPercent: 0,
  bestPerformer: '—',
  worstPerformer: '—',
};

function holdingCost(portfolio) {
  return (
    portfolio.holdings?.reduce(
      (sum, holding) =>
        sum +
        (Number(holding.quantity) || 0) * (Number(holding.avg_purchase_price) || 0),
      0
    ) || 0
  );
}

function portfolioCost(portfolio) {
  const fromHoldings = holdingCost(portfolio);
  const fromAmount = Number(portfolio.investment_amount);
  if (Number.isFinite(fromAmount) && fromAmount > 0) return fromAmount;
  return fromHoldings;
}

async function markToMarketValue(portfolio) {
  const invested = portfolioCost(portfolio);
  const holdings = portfolio.holdings || [];
  if (holdings.length === 0) {
    return { value: invested, returnPct: 0 };
  }

  let costBasis = 0;
  let marketValue = 0;

  await Promise.all(
    holdings.map(async (holding) => {
      const qty = Number(holding.quantity) || 0;
      const avg = Number(holding.avg_purchase_price) || 0;
      const weight = Number(holding.weight) || 0;
      const lineCost =
        qty > 0 && avg > 0
          ? qty * avg
          : invested > 0 && weight > 0
            ? invested * weight
            : 0;
      costBasis += lineCost;

      let price = avg;
      try {
        const quote = await apiService.getStockQuote(holding.symbol);
        if (Number.isFinite(quote.current_price) && quote.current_price > 0) {
          price = quote.current_price;
        }
      } catch {
        // keep avg if live quote unavailable
      }

      if (qty > 0) {
        marketValue += qty * price;
      } else if (invested > 0 && weight > 0) {
        marketValue += invested * weight * (avg > 0 ? price / avg : 1);
      }
    })
  );

  const basis = costBasis > 0 ? costBasis : invested;
  const value = marketValue > 0 ? marketValue : invested;
  const returnPct = basis > 0 ? ((value - basis) / basis) * 100 : 0;
  return { value, returnPct };
}

export default function useDashboardData() {
  const [portfolios, setPortfolios] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [marketData, setMarketData] = useState([]);
  const [marketOpen, setMarketOpen] = useState(false);
  const [marketDataTimestamp, setMarketDataTimestamp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const userPortfolios = await apiService.getPortfolios();
      const portfolioList = Array.isArray(userPortfolios) ? userPortfolios : [];
      setPortfolios(portfolioList);

      if (portfolioList.length === 0) {
        setStats({
          ...emptyStats,
          bestPerformer: 'No portfolios yet',
          worstPerformer: 'No portfolios yet',
        });
      } else {
        let totalInvestment = 0;
        let totalValue = 0;
        let bestReturn = -Infinity;
        let worstReturn = Infinity;
        let bestPerformer = portfolioList[0].name || 'Portfolio';
        let worstPerformer = portfolioList[0].name || 'Portfolio';

        for (const portfolio of portfolioList) {
          const invested = portfolioCost(portfolio);
          totalInvestment += invested;
          let currentValue = invested;
          let returnPct = 0;

          try {
            if (portfolio.holdings && portfolio.holdings.length > 0) {
              const analytics = await apiService.getPortfolioAnalytics(portfolio.id);
              const performance = analytics?.performance_analysis;
              const rawReturn = Number(performance?.total_return);

              if (Number.isFinite(rawReturn)) {
                returnPct = Math.abs(rawReturn) <= 5 ? rawReturn * 100 : rawReturn;
                currentValue = invested * (1 + returnPct / 100);
              }

              const rawCurrent = Number(performance?.current_value);
              if (Number.isFinite(rawCurrent) && rawCurrent > 0) {
                currentValue = rawCurrent;
                returnPct =
                  invested > 0 ? ((currentValue - invested) / invested) * 100 : 0;
              } else {
                const mtm = await markToMarketValue(portfolio);
                currentValue = mtm.value;
                returnPct = mtm.returnPct;
              }
            }
          } catch {
            try {
              const mtm = await markToMarketValue(portfolio);
              currentValue = mtm.value;
              returnPct = mtm.returnPct;
            } catch {
              // keep invested baseline
            }
          }

          if (!Number.isFinite(currentValue)) currentValue = invested;
          if (!Number.isFinite(returnPct)) returnPct = 0;
          totalValue += currentValue;

          const label = portfolio.name || `Portfolio #${portfolio.id}`;
          if (returnPct > bestReturn) {
            bestReturn = returnPct;
            bestPerformer = `${label} (${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%)`;
          }
          if (returnPct < worstReturn) {
            worstReturn = returnPct;
            worstPerformer = `${label} (${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%)`;
          }
        }

        const totalReturn = totalValue - totalInvestment;
        const totalReturnPercent =
          totalInvestment > 0 ? (totalReturn / totalInvestment) * 100 : 0;

        setStats({
          totalPortfolios: portfolioList.length,
          totalValue: Number.isFinite(totalValue) ? totalValue : 0,
          totalReturn: Number.isFinite(totalReturn) ? totalReturn : 0,
          totalReturnPercent: Number.isFinite(totalReturnPercent)
            ? totalReturnPercent
            : 0,
          bestPerformer,
          worstPerformer,
        });
      }

      try {
        const indicesResponse = await apiService.getMarketIndices();
        const valid = (indicesResponse.indices || []).filter(
          (item) => Number.isFinite(item.price) && item.price > 0
        );
        setMarketData(valid);
        setMarketOpen(Boolean(indicesResponse.market_open));
        setMarketDataTimestamp(new Date());
        if (valid.length === 0) {
          setError((prev) => prev || 'Live market index data is temporarily unavailable.');
        }
      } catch {
        setMarketData([]);
        setError((prev) => prev || 'Live market index data is temporarily unavailable.');
      }
    } catch (err) {
      setError(
        getApiErrorMessage(err, 'Failed to load dashboard data. Please try again.')
      );
      setPortfolios([]);
      setMarketData([]);
      setStats(emptyStats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    portfolios,
    stats,
    marketData,
    marketOpen,
    marketDataTimestamp,
    loading,
    error,
    refresh: fetchDashboardData,
  };
}
