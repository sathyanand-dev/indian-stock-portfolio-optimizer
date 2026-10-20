import { env } from '../config/env.js';
import { getCache, setCache } from '../lib/cache.js';
import { badRequest } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { mean, std, maxDrawdown } from '../lib/math.js';
import { fetchFundamentalsTimeseries } from '../lib/yahoo.js';
import { INDIAN_EQUITY_CATALOG } from '../data/indianEquities.js';
import * as marketData from './marketData.service.js';

const FUND_TYPES = [
  'annualTotalRevenue',
  'annualNetIncome',
  'annualDilutedEPS',
  'annualOperatingIncome',
  'annualFreeCashFlow',
  'annualTotalDebt',
  'annualStockholdersEquity',
  'annualGrossProfit',
  'quarterlyTotalRevenue',
  'quarterlyNetIncome',
  'trailingPeRatio',
  'trailingPbRatio',
  'trailingMarketCap',
];

const SECTOR_PROXIES = [
  { test: /(BANK|HDFC|ICICI|SBI|AXIS|KOTAK|INDUSIND|IDFCFIRST)/i, proxy: '^NSEBANK', label: 'Banks' },
  { test: /(TCS|INFY|WIPRO|TECHM|HCLTECH|PERSISTENT|LTIM|COFORGE)/i, proxy: '^CNXIT', label: 'IT' },
  { test: /(SUNPHARMA|DRREDDY|CIPLA|DIVISLAB|AUROPHARMA|BIOCON)/i, proxy: '^CNXPHARMA', label: 'Pharma' },
  { test: /(TATAMOTORS|MARUTI|M&M|BAJAJ-AUTO|HEROMOTOCO|EICHERMOT)/i, proxy: '^CNXAUTO', label: 'Auto' },
  { test: /(TATASTEEL|JSWSTEEL|HINDALCO|VEDL|NMDC|SAIL)/i, proxy: '^CNXMETAL', label: 'Metals' },
  { test: /(RELIANCE|ONGC|BPCL|IOC|GAIL|PETRONET)/i, proxy: '^NSEI', label: 'Energy / conglomerate' },
];

function cagr(first, last, years) {
  if (!Number.isFinite(first) || !Number.isFinite(last) || first <= 0 || years <= 0) return null;
  return (last / first) ** (1 / years) - 1;
}

function yoy(prev, curr) {
  if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev === 0) return null;
  return (curr - prev) / Math.abs(prev);
}

function lastTwo(series = []) {
  if (series.length < 2) return { prev: null, curr: null };
  return { prev: series[series.length - 2], curr: series[series.length - 1] };
}

function scoreBand(score) {
  if (score >= 75) return 'Strong';
  if (score >= 60) return 'Constructive';
  if (score >= 45) return 'Mixed';
  if (score >= 30) return 'Cautious';
  return 'Weak';
}

function clamp(n, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function inferSector(symbol) {
  const bare = symbol.replace(/\.(NS|BO)$/, '');
  for (const row of SECTOR_PROXIES) {
    if (row.test.test(bare)) return row;
  }
  return { proxy: '^NSEI', label: 'Broad market (Nifty 50 proxy)' };
}

function monthlyReturns(dates, prices) {
  const byMonth = new Map();
  dates.forEach((d, i) => {
    const key = d.slice(0, 7);
    byMonth.set(key, { date: d, price: prices[i] });
  });
  const keys = [...byMonth.keys()].sort();
  const out = [];
  for (let i = 1; i < keys.length; i += 1) {
    const prev = byMonth.get(keys[i - 1]).price;
    const curr = byMonth.get(keys[i]).price;
    out.push({
      month: keys[i],
      return: (curr - prev) / prev,
      price: curr,
    });
  }
  return out;
}

function detectVolumeSpikes(dates, volumes, prices) {
  if (volumes.length < 40) return [];
  const recentVol = volumes.slice(-60);
  const avg = mean(recentVol.filter((v) => v > 0));
  if (!avg) return [];
  const spikes = [];
  for (let i = Math.max(1, volumes.length - 120); i < volumes.length; i += 1) {
    if (volumes[i] > avg * 2.5) {
      const dayRet = (prices[i] - prices[i - 1]) / prices[i - 1];
      spikes.push({
        date: dates[i],
        volume_vs_avg: Number((volumes[i] / avg).toFixed(1)),
        day_return: Number(dayRet.toFixed(4)),
        note:
          dayRet > 0.02
            ? 'Heavy volume on an up day — often news / upgrade / block deal interest'
            : dayRet < -0.02
              ? 'Heavy volume on a down day — often profit booking, downgrade, or risk-off'
              : 'Unusual volume without a large price move — watch for pending news',
      });
    }
  }
  // Keep the most significant spikes
  return spikes
    .sort((a, b) => b.volume_vs_avg - a.volume_vs_avg)
    .slice(0, 8)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildGrowth(fundamentals) {
  const rev = fundamentals.annualTotalRevenue || [];
  const ni = fundamentals.annualNetIncome || [];
  const eps = fundamentals.annualDilutedEPS || [];
  const fcf = fundamentals.annualFreeCashFlow || [];
  const op = fundamentals.annualOperatingIncome || [];

  const years = Math.max(1, rev.length - 1);
  const revenueCagr = rev.length >= 2 ? cagr(rev[0].value, rev[rev.length - 1].value, years) : null;
  const earningsCagr = ni.length >= 2 ? cagr(Math.max(ni[0].value, 1), Math.max(ni[ni.length - 1].value, 1), Math.max(1, ni.length - 1)) : null;
  const epsCagr = eps.length >= 2 ? cagr(Math.max(eps[0].value, 0.01), Math.max(eps[eps.length - 1].value, 0.01), Math.max(1, eps.length - 1)) : null;

  const revYoy = (() => {
    const { prev, curr } = lastTwo(rev);
    return prev && curr ? yoy(prev.value, curr.value) : null;
  })();
  const niYoy = (() => {
    const { prev, curr } = lastTwo(ni);
    return prev && curr ? yoy(prev.value, curr.value) : null;
  })();
  const fcfYoy = (() => {
    const { prev, curr } = lastTwo(fcf);
    return prev && curr ? yoy(prev.value, curr.value) : null;
  })();

  let score = 50;
  const drivers = [];
  if (revenueCagr != null) {
    if (revenueCagr > 0.12) {
      score += 15;
      drivers.push(`Revenue CAGR ~${(revenueCagr * 100).toFixed(1)}% — solid top-line compounding`);
    } else if (revenueCagr > 0.05) {
      score += 8;
      drivers.push(`Revenue CAGR ~${(revenueCagr * 100).toFixed(1)}% — moderate growth`);
    } else if (revenueCagr < 0) {
      score -= 12;
      drivers.push(`Revenue CAGR ~${(revenueCagr * 100).toFixed(1)}% — top line has contracted`);
    } else {
      drivers.push(`Revenue CAGR ~${(revenueCagr * 100).toFixed(1)}% — low single-digit growth`);
    }
  }
  if (niYoy != null) {
    if (niYoy > 0.15) {
      score += 12;
      drivers.push(`Latest annual profit up ~${(niYoy * 100).toFixed(1)}% YoY`);
    } else if (niYoy < -0.1) {
      score -= 12;
      drivers.push(`Latest annual profit down ~${(Math.abs(niYoy) * 100).toFixed(1)}% YoY`);
    }
  }
  if (fcfYoy != null) {
    if (fcfYoy > 0.1) {
      score += 8;
      drivers.push('Free cash flow improving — quality of earnings looks healthier');
    } else if (fcfYoy < -0.2) {
      score -= 8;
      drivers.push('Free cash flow weakened — check capex / working capital');
    }
  }
  if (op.length >= 2) {
    const opY = yoy(op[op.length - 2].value, op[op.length - 1].value);
    if (opY != null && opY > 0.1) {
      score += 5;
      drivers.push('Operating income expanding');
    }
  }

  score = clamp(score);
  const label = scoreBand(score);
  let verdict =
    'Growth picture is mixed; use the scorecard with price momentum and leverage before deciding.';
  if (score >= 70) {
    verdict =
      'Fundamentals lean growth-supportive over the recent annual history. Still cross-check valuation and sector cycle.';
  } else if (score < 40) {
    verdict =
      'Growth signals are soft or negative. Treat as a turnaround / value / cyclical idea — not a clean compounder.';
  }

  return {
    score,
    label,
    verdict,
    drivers,
    metrics: {
      revenue_cagr: revenueCagr,
      earnings_cagr: earningsCagr,
      eps_cagr: epsCagr,
      revenue_yoy: revYoy,
      net_income_yoy: niYoy,
      fcf_yoy: fcfYoy,
    },
    series: {
      revenue: rev,
      net_income: ni,
      eps,
      free_cash_flow: fcf,
      operating_income: op,
    },
  };
}

function buildQuality(fundamentals) {
  const debt = fundamentals.annualTotalDebt || [];
  const equity = fundamentals.annualStockholdersEquity || [];
  const fcf = fundamentals.annualFreeCashFlow || [];
  const ni = fundamentals.annualNetIncome || [];
  const pe = fundamentals.trailingPeRatio || [];
  const pb = fundamentals.trailingPbRatio || [];
  const mcap = fundamentals.trailingMarketCap || [];

  const latestDebt = debt.at(-1)?.value ?? null;
  const latestEquity = equity.at(-1)?.value ?? null;
  const de = latestDebt != null && latestEquity ? latestDebt / latestEquity : null;
  const latestFcf = fcf.at(-1)?.value ?? null;
  const latestNi = ni.at(-1)?.value ?? null;
  const roe = latestNi != null && latestEquity ? latestNi / latestEquity : null;

  let score = 55;
  const notes = [];
  if (de != null) {
    if (de < 0.5) {
      score += 12;
      notes.push(`Debt/Equity ~${de.toFixed(2)} — balance sheet looks conservative`);
    } else if (de < 1.2) {
      score += 4;
      notes.push(`Debt/Equity ~${de.toFixed(2)} — moderate leverage`);
    } else {
      score -= 10;
      notes.push(`Debt/Equity ~${de.toFixed(2)} — elevated leverage; watch interest cycle`);
    }
  }
  if (roe != null) {
    if (roe > 0.18) {
      score += 10;
      notes.push(`ROE ~${(roe * 100).toFixed(1)}% — strong capital efficiency`);
    } else if (roe > 0.1) {
      score += 4;
      notes.push(`ROE ~${(roe * 100).toFixed(1)}% — acceptable`);
    } else if (roe < 0.05) {
      score -= 8;
      notes.push(`ROE ~${(roe * 100).toFixed(1)}% — weak returns on equity`);
    }
  }
  if (latestFcf != null) {
    if (latestFcf > 0) {
      score += 6;
      notes.push('Latest annual free cash flow is positive');
    } else {
      score -= 8;
      notes.push('Latest annual free cash flow is negative');
    }
  }

  return {
    score: clamp(score),
    label: scoreBand(clamp(score)),
    notes,
    ratios: {
      debt_to_equity: de,
      roe,
      trailing_pe: pe.at(-1)?.value ?? null,
      trailing_pb: pb.at(-1)?.value ?? null,
      market_cap: mcap.at(-1)?.value ?? null,
      total_debt: latestDebt,
      equity: latestEquity,
      free_cash_flow: latestFcf,
    },
  };
}

function buildPriceReview(hist, niftyHist) {
  const { dates, prices, volumes } = hist;
  const n = prices.length;
  const totalReturn = (prices[n - 1] - prices[0]) / prices[0];
  const daily = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  const vol = std(daily) * Math.sqrt(252);
  const mdd = maxDrawdown(daily);
  const months = monthlyReturns(dates, prices);
  const best = [...months].sort((a, b) => b.return - a.return)[0];
  const worst = [...months].sort((a, b) => a.return - b.return)[0];

  // 3/6/12m windows
  const windowReturn = (tradingDays) => {
    if (n <= tradingDays) return null;
    const a = prices[n - 1 - tradingDays];
    const b = prices[n - 1];
    return (b - a) / a;
  };

  let vsNifty = null;
  if (niftyHist?.dates?.length) {
    const map = Object.fromEntries(niftyHist.dates.map((d, i) => [d, niftyHist.prices[i]]));
    const common = dates.filter((d) => map[d] != null);
    if (common.length > 40) {
      const start = common[0];
      const end = common[common.length - 1];
      const stockR = (prices[dates.indexOf(end)] - prices[dates.indexOf(start)]) / prices[dates.indexOf(start)];
      const niftyR = (map[end] - map[start]) / map[start];
      vsNifty = {
        stock_return: stockR,
        nifty_return: niftyR,
        excess_return: stockR - niftyR,
      };
    }
  }

  const spikes = detectVolumeSpikes(dates, volumes, prices);
  const momentum3 = windowReturn(63);
  const momentum6 = windowReturn(126);
  const momentum12 = windowReturn(252);

  let momentumScore = 50;
  if (momentum12 != null) momentumScore += clamp(momentum12 * 100, -20, 20);
  if (momentum3 != null) momentumScore += clamp(momentum3 * 80, -15, 15);
  if (mdd < -0.35) momentumScore -= 10;
  momentumScore = clamp(momentumScore);

  const actions = [];
  if (best) {
    actions.push({
      type: 'price',
      date: `${best.month}-01`,
      title: `Strongest month: ${(best.return * 100).toFixed(1)}%`,
      detail: `Price momentum peaked around ${best.month}. Often coincides with earnings beats, sector tailwinds, or flows.`,
    });
  }
  if (worst) {
    actions.push({
      type: 'price',
      date: `${worst.month}-01`,
      title: `Weakest month: ${(worst.return * 100).toFixed(1)}%`,
      detail: `Largest monthly drawdown around ${worst.month}. Review whether it was company-specific or market-wide.`,
    });
  }
  for (const s of spikes.slice(0, 5)) {
    actions.push({
      type: 'volume',
      date: s.date,
      title: `Volume spike ${s.volume_vs_avg}× average`,
      detail: s.note,
      day_return: s.day_return,
    });
  }
  actions.sort((a, b) => a.date.localeCompare(b.date));

  return {
    period: { start: dates[0], end: dates[n - 1], sessions: n },
    total_return: totalReturn,
    volatility: vol,
    max_drawdown: mdd,
    returns: {
      m3: momentum3,
      m6: momentum6,
      m12: momentum12,
    },
    best_month: best,
    worst_month: worst,
    vs_nifty: vsNifty,
    volume_events: spikes,
    year_actions: actions,
    momentum_score: momentumScore,
    momentum_label: scoreBand(momentumScore),
    price_series: dates.map((date, i) => ({
      date,
      close: prices[i],
      volume: volumes[i],
    })),
  };
}

function buildGlobalContext(symbol, priceReview, sectorProxyHist, sectorMeta) {
  const notes = [];
  if (priceReview.vs_nifty) {
    const ex = priceReview.vs_nifty.excess_return;
    notes.push(
      ex >= 0
        ? `Over the overlapping window, the stock beat Nifty 50 by ~${(ex * 100).toFixed(1)} percentage points.`
        : `Over the overlapping window, the stock lagged Nifty 50 by ~${(Math.abs(ex) * 100).toFixed(1)} percentage points.`,
    );
  }

  let vsSector = null;
  if (sectorProxyHist?.dates?.length && priceReview.price_series?.length) {
    const map = Object.fromEntries(sectorProxyHist.dates.map((d, i) => [d, sectorProxyHist.prices[i]]));
    const series = priceReview.price_series.filter((p) => map[p.date] != null);
    if (series.length > 40) {
      const s0 = series[0];
      const s1 = series[series.length - 1];
      const stockR = (s1.close - s0.close) / s0.close;
      const secR = (map[s1.date] - map[s0.date]) / map[s0.date];
      vsSector = {
        sector: sectorMeta.label,
        proxy: sectorMeta.proxy,
        stock_return: stockR,
        sector_return: secR,
        excess_return: stockR - secR,
      };
      notes.push(
        `Vs ${sectorMeta.label} proxy (${sectorMeta.proxy}): excess ~${((stockR - secR) * 100).toFixed(1)} pts.`,
      );
    }
  }

  notes.push(
    'Global / macro layer: crude, USD-INR, US rates, and China demand often move Indian energy, metals, and IT differently. This build uses India market proxies; add Finnhub for curated global headlines.',
  );

  return {
    sector: sectorMeta.label,
    sector_proxy: sectorMeta.proxy,
    vs_sector: vsSector,
    narrative: notes,
  };
}

async function fetchFinnhubExtras(symbol) {
  const key = env.FINNHUB_API_KEY;
  if (!key) {
    return {
      enabled: false,
      news: [],
      earnings_calendar: [],
      message:
        'Set FINNHUB_API_KEY in backend/.env (free tier at finnhub.io) to unlock curated company news and earnings calendar.',
    };
  }

  const bare = symbol.replace(/\.(NS|BO)$/, '');
  // Finnhub India symbols often use .NS suffix
  const fhSymbol = symbol.endsWith('.NS') || symbol.endsWith('.BO') ? symbol : `${bare}.NS`;
  const to = new Date();
  const from = new Date(Date.now() - 365 * 86400000);
  const fmt = (d) => d.toISOString().slice(0, 10);

  try {
    const [newsRes, earnRes] = await Promise.all([
      fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(fhSymbol)}&from=${fmt(from)}&to=${fmt(to)}&token=${key}`,
      ),
      fetch(
        `https://finnhub.io/api/v1/calendar/earnings?from=${fmt(to)}&to=${fmt(new Date(Date.now() + 90 * 86400000))}&symbol=${encodeURIComponent(fhSymbol)}&token=${key}`,
      ),
    ]);

    const newsJson = newsRes.ok ? await newsRes.json() : [];
    const earnJson = earnRes.ok ? await earnRes.json() : { earningsCalendar: [] };

    return {
      enabled: true,
      news: (Array.isArray(newsJson) ? newsJson : []).slice(0, 15).map((n) => ({
        date: n.datetime ? new Date(n.datetime * 1000).toISOString().slice(0, 10) : null,
        headline: n.headline,
        source: n.source,
        url: n.url,
        summary: n.summary,
      })),
      earnings_calendar: (earnJson.earningsCalendar || []).slice(0, 8),
      message: null,
    };
  } catch (err) {
    logger.warn(`Finnhub enrichment failed: ${err.message}`);
    return {
      enabled: true,
      news: [],
      earnings_calendar: [],
      message: `Finnhub request failed: ${err.message}`,
    };
  }
}

function buildUpcoming(finnhub, growth) {
  const items = [];
  for (const e of finnhub.earnings_calendar || []) {
    items.push({
      type: 'earnings',
      date: e.date,
      title: 'Scheduled / estimated earnings',
      detail: `EPS estimate: ${e.epsEstimate ?? 'n/a'} · Revenue estimate: ${e.revenueEstimate ?? 'n/a'}`,
    });
  }
  if (!items.length) {
    items.push({
      type: 'guidance',
      date: null,
      title: 'Earnings calendar unavailable on free Yahoo feed',
      detail: finnhub.message
        || 'Add FINNHUB_API_KEY for upcoming earnings dates. Until then, watch exchange announcements and results season (typically quarterly).',
    });
  }
  if (growth.metrics.revenue_yoy != null) {
    items.push({
      type: 'watch',
      date: null,
      title: 'Next results watchpoints',
      detail:
        growth.metrics.revenue_yoy > 0
          ? 'Street will look for continued top-line growth and margin stability vs the last annual print.'
          : 'Street will look for a turnaround in revenue / profit vs the soft latest annual print.',
    });
  }
  return items;
}

function overallScore({ growth, quality, priceReview }) {
  const riskPenalty = clamp(Math.abs(priceReview.max_drawdown) * 80, 0, 25);
  const riskScore = clamp(70 - riskPenalty + (priceReview.volatility < 0.25 ? 10 : 0));
  const overall = clamp(
    Math.round(growth.score * 0.35 + quality.score * 0.3 + priceReview.momentum_score * 0.25 + riskScore * 0.1),
  );
  return {
    overall,
    overall_label: scoreBand(overall),
    pillars: {
      growth: growth.score,
      quality: quality.score,
      momentum: priceReview.momentum_score,
      risk_resilience: riskScore,
    },
  };
}

/**
 * Institutional-style single-company research pack from live market + fundamentals.
 */
export async function researchCompany(symbolInput) {
  if (!symbolInput || !String(symbolInput).trim()) {
    throw badRequest('Provide a company symbol (e.g. RELIANCE.NS or TCS)');
  }
  const symbol = marketData.normalizeSymbol(symbolInput);
  const cacheKey = `research:v1:${symbol}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const name = INDIAN_EQUITY_CATALOG[symbol] || symbol.replace(/\.(NS|BO)$/, '');
  const sectorMeta = inferSector(symbol);

  const [hist, niftyHist, fundamentals, quote, sectorHist, finnhub] = await Promise.all([
    marketData.getHistoricalData(symbol, '1y'),
    marketData.getHistoricalData('^NSEI', '1y').catch(() => null),
    fetchFundamentalsTimeseries(symbol, FUND_TYPES, { years: 6 }),
    marketData.getStockQuote(symbol).catch(() => null),
    marketData.getHistoricalData(sectorMeta.proxy, '1y').catch(() => null),
    fetchFinnhubExtras(symbol),
  ]);

  const growth = buildGrowth(fundamentals);
  const quality = buildQuality(fundamentals);
  const priceReview = buildPriceReview(hist, niftyHist);
  const global = buildGlobalContext(symbol, priceReview, sectorHist, sectorMeta);
  const scorecard = overallScore({ growth, quality, priceReview });
  const upcoming = buildUpcoming(finnhub, growth);

  const report = {
    symbol,
    name,
    as_of: new Date().toISOString(),
    snapshot: {
      price: quote?.current_price ?? hist.prices.at(-1),
      change: quote?.change ?? null,
      change_percent: quote?.change_percent ?? null,
      exchange: symbol.endsWith('.BO') ? 'BSE' : 'NSE',
      sector_guess: sectorMeta.label,
    },
    scorecard,
    growth,
    quality,
    year_in_review: priceReview,
    upcoming_events: upcoming,
    global_impact: global,
    news: finnhub.news,
    data_coverage: {
      available: [
        '1y price / volume path',
        'Annual & quarterly fundamentals (Yahoo timeseries)',
        'Growth & quality scorecard',
        'Vs Nifty and sector proxy',
        'Volume-spike event timeline',
      ],
      limited: [
        'Official corporate announcement text (not scraped)',
        'Management commentary / transcripts',
        'Exact board meeting / AGM calendars without Finnhub',
      ],
      needs_from_you: finnhub.enabled
        ? []
        : [
            'Optional: free Finnhub API key → richer news + earnings calendar (FINNHUB_API_KEY in backend/.env)',
          ],
    },
    disclaimer:
      'Educational research pack — not investment advice. Pro desks also use paid feeds, filings, and human diligence.',
  };

  return setCache(cacheKey, report, 30);
}
