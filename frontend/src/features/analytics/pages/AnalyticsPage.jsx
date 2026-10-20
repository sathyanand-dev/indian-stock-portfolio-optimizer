import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TableBody,
  TableCell,
  TableRow,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getPortfolios, getPortfolioPerformance } from '../../../api';
import { getApiErrorMessage } from '../../../shared/utils/apiError';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
  safeNumber,
} from '../../../shared/utils/formatters';
import LoadingState from '../../../components/common/LoadingState';
import ErrorState from '../../../components/common/ErrorState';
import EmptyState from '../../../components/common/EmptyState';
import StatCard from '../../../components/common/StatCard';
import ScrollableTable from '../../../components/common/ScrollableTable';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import { ROUTES } from '../../../shared/constants/routes';

/** Chart series colours, resolved from the active (light or dark) palette. */
const chartColors = (theme) => [
  theme.palette.primary.main,
  theme.palette.info.main,
  theme.palette.success.main,
  theme.palette.error.main,
  theme.palette.warning.main,
  theme.palette.secondary.main,
  theme.palette.success.light,
  theme.palette.error.light,
];

function asRatio(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return null;
  }
  const n = Number(value);
  // API may return percent (e.g. 15) or ratio (0.15)
  return Math.abs(n) > 5 ? n / 100 : n;
}

function formatRatioAsPercent(value) {
  const ratio = asRatio(value);
  if (ratio === null) return 'N/A';
  return formatPercent(ratio * 100);
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useIsMobile();
  const seriesColors = chartColors(theme);
  const axisTick = { fontSize: isMobile ? 10 : 12, fill: theme.palette.text.secondary };
  const chartTooltipStyle = {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    color: theme.palette.text.primary,
  };

  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState('');
  const [performanceData, setPerformanceData] = useState(null);
  const [loadingPortfolios, setLoadingPortfolios] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [portfolioError, setPortfolioError] = useState(null);

  const loadPortfolios = useCallback(async () => {
    setLoadingPortfolios(true);
    setPortfolioError(null);
    try {
      const data = await getPortfolios();
      const list = Array.isArray(data) ? data : [];
      setPortfolios(list);
      if (list.length > 0) {
        setSelectedPortfolio(list[0].id);
      } else {
        setSelectedPortfolio('');
        setPerformanceData(null);
      }
    } catch (err) {
      setPortfolios([]);
      setSelectedPortfolio('');
      setPerformanceData(null);
      setPortfolioError(getApiErrorMessage(err, 'Failed to load portfolios'));
    } finally {
      setLoadingPortfolios(false);
    }
  }, []);

  const loadPerformanceData = useCallback(async () => {
    if (!selectedPortfolio) return;
    setLoading(true);
    setError(null);
    setPerformanceData(null);
    try {
      const data = await getPortfolioPerformance(selectedPortfolio);
      const pa = data?.performance_analysis || {};
      setPerformanceData({
        portfolio_info: data.portfolio_info,
        performance_analysis: pa,
        period: data.period,
      });
    } catch (err) {
      setPerformanceData(null);
      setError(getApiErrorMessage(err, 'Failed to load performance data'));
    } finally {
      setLoading(false);
    }
  }, [selectedPortfolio]);

  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios]);

  useEffect(() => {
    if (selectedPortfolio) {
      loadPerformanceData();
    }
  }, [selectedPortfolio, loadPerformanceData]);

  const getPerformanceColor = (value) => {
    const ratio = asRatio(value);
    if (ratio === null) return 'text.secondary';
    return ratio >= 0 ? 'success.main' : 'error.main';
  };

  const getPerformanceIcon = (value) => {
    const ratio = asRatio(value);
    if (ratio === null) return null;
    return ratio >= 0 ? <TrendingUp /> : <TrendingDown />;
  };

  const pa = performanceData?.performance_analysis;
  const sectorEntries = pa?.sector_allocation
    ? Object.entries(pa.sector_allocation)
        .map(([name, value]) => ({
          name,
          value: typeof value === 'number' ? value : 0,
        }))
        .filter((item) => item.value > 0)
    : [];

  const historical = Array.isArray(pa?.historical_performance)
    ? pa.historical_performance
    : [];

  if (loadingPortfolios) {
    return <LoadingState message="Loading portfolios…" />;
  }

  if (portfolioError) {
    return (
      <ErrorState message={portfolioError} onRetry={loadPortfolios} />
    );
  }

  if (portfolios.length === 0) {
    return (
      <EmptyState
        title="No Portfolios Found"
        description="Create a portfolio first to view analytics."
        actionLabel="Create Portfolio"
        onAction={() => navigate(ROUTES.OPTIMIZE)}
      />
    );
  }

  return (
    <Box>
      <Typography
        variant="h4"
        gutterBottom
        sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
      >
        <AnalyticsIcon />
        Portfolio Analytics
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>Select Portfolio</InputLabel>
          <Select
            value={selectedPortfolio}
            onChange={(e) => setSelectedPortfolio(e.target.value)}
            label="Select Portfolio"
          >
            {portfolios.map((portfolio) => (
              <MenuItem key={portfolio.id} value={portfolio.id}>
                {portfolio.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {portfolios.find((p) => p.id === selectedPortfolio) && (
          <Box mt={2}>
            <Typography variant="h6">
              {portfolios.find((p) => p.id === selectedPortfolio)?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {portfolios.find((p) => p.id === selectedPortfolio)?.description ||
                'No description'}
            </Typography>
          </Box>
        )}
      </Paper>

      {error && (
        <ErrorState message={error} onRetry={loadPerformanceData} />
      )}

      {loading && <LoadingState message="Loading analytics…" minHeight={240} />}

      {!loading && !error && !performanceData && selectedPortfolio && (
        <EmptyState
          title="No analytics data"
          description="Performance metrics are not available for this portfolio yet."
          actionLabel="Retry"
          onAction={loadPerformanceData}
        />
      )}

      {performanceData && !loading && !error && (
        <>
          <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <StatCard
                label="Total Return"
                value={formatRatioAsPercent(pa?.total_return)}
                icon={getPerformanceIcon(pa?.total_return)}
                color={getPerformanceColor(pa?.total_return)}
                help="Change in portfolio value over the selected period, including gains and losses."
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                label="Annualized Return"
                value={formatRatioAsPercent(pa?.annualized_return)}
                icon={getPerformanceIcon(pa?.annualized_return)}
                color={getPerformanceColor(pa?.annualized_return)}
                help="The total return restated as a per-year rate, so periods of different lengths compare fairly."
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                label="Volatility"
                value={formatRatioAsPercent(pa?.volatility)}
                help="How much returns swing around their average. Higher volatility means a bumpier ride."
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <StatCard
                label="Sharpe Ratio"
                value={pa?.sharpe_ratio == null ? 'N/A' : formatNumber(pa.sharpe_ratio)}
                help="Return earned per unit of risk taken. Above ~1 is generally considered attractive."
              />
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, mb: 3, minWidth: 0 }}>
            <Typography variant="h6" gutterBottom>
              Performance Comparison
            </Typography>
            {historical.length > 0 ? (
              <ResponsiveContainer width="100%" height={isMobile ? 240 : 360}>
                <LineChart data={historical} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis
                    dataKey="date"
                    tick={axisTick}
                    stroke={theme.palette.divider}
                    minTickGap={isMobile ? 40 : 20}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return Number.isNaN(date.getTime())
                        ? value
                        : date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
                    }}
                  />
                  <YAxis
                    tick={axisTick}
                    stroke={theme.palette.divider}
                    width={isMobile ? 48 : 72}
                    tickFormatter={(value) => formatCurrencyCompact(value)}
                  />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    itemStyle={{ color: theme.palette.text.primary }}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(2) : value,
                      name === 'portfolio_value' ? 'Portfolio' : 'Benchmark',
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 13 }} />
                  <Line
                    type="monotone"
                    dataKey="portfolio_value"
                    stroke={theme.palette.info.main}
                    name="Portfolio"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="benchmark_value"
                    stroke={theme.palette.warning.main}
                    name="Benchmark"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No historical performance data"
                description="Historical series was not returned for this portfolio."
              />
            )}
          </Paper>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
              <Paper sx={{ p: 2, minWidth: 0 }}>
                <Typography variant="h6" gutterBottom>
                  Risk Metrics
                </Typography>
                <ScrollableTable minWidth={320} hint={false} size="small">
                  <TableBody>
                    <TableRow>
                      <TableCell>Current Value</TableCell>
                      <TableCell align="right">
                        {pa?.current_value == null
                          ? 'N/A'
                          : (isMobile ? formatCurrencyCompact : formatCurrency)(
                              pa.current_value
                            )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Beta</TableCell>
                      <TableCell align="right">
                        {pa?.beta == null && pa?.risk_metrics?.beta == null
                          ? 'N/A'
                          : formatNumber(pa?.beta ?? pa?.risk_metrics?.beta)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Alpha</TableCell>
                      <TableCell align="right">
                        {formatRatioAsPercent(
                          pa?.alpha ?? pa?.risk_metrics?.alpha
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Sortino Ratio</TableCell>
                      <TableCell align="right">
                        {pa?.sortino_ratio == null
                          ? 'N/A'
                          : formatNumber(pa.sortino_ratio)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Calmar Ratio</TableCell>
                      <TableCell align="right">
                        {pa?.calmar_ratio == null
                          ? 'N/A'
                          : formatNumber(pa.calmar_ratio)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Max Drawdown</TableCell>
                      <TableCell align="right">
                        <Typography color="error">
                          {formatRatioAsPercent(pa?.max_drawdown)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>VaR (95%)</TableCell>
                      <TableCell align="right">
                        <Typography color="error">
                          {formatRatioAsPercent(pa?.var_95)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>CVaR (95%)</TableCell>
                      <TableCell align="right">
                        <Typography color="error">
                          {formatRatioAsPercent(pa?.cvar_95)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </ScrollableTable>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
              <Paper sx={{ p: 2, minWidth: 0 }}>
                <Typography variant="h6" gutterBottom>
                  Sector Allocation
                </Typography>
                {sectorEntries.length > 0 ? (
                  <ResponsiveContainer width="100%" height={isMobile ? 260 : 300}>
                    <PieChart>
                      <Pie
                        data={sectorEntries}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={
                          isMobile
                            ? false
                            : ({ name, percent }) =>
                                `${name} ${((percent || 0) * 100).toFixed(1)}%`
                        }
                        outerRadius={isMobile ? 90 : 80}
                        dataKey="value"
                      >
                        {sectorEntries.map((entry, index) => (
                          <Cell
                            key={`cell-${entry.name}`}
                            fill={seriesColors[index % seriesColors.length]}
                            stroke={theme.palette.background.paper}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={chartTooltipStyle}
                        itemStyle={{ color: theme.palette.text.primary }}
                      />
                      {isMobile && (
                        <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState
                    title="No sector allocation"
                    description="Sector breakdown was not returned for this portfolio."
                  />
                )}
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Benchmark Comparison
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="body2" color="text.secondary">
                  Portfolio Return
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ color: getPerformanceColor(pa?.total_return) }}
                >
                  {formatRatioAsPercent(pa?.total_return)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="body2" color="text.secondary">
                  Benchmark Return
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: getPerformanceColor(
                      pa?.benchmark_performance?.total_return
                    ),
                  }}
                >
                  {formatRatioAsPercent(
                    pa?.benchmark_performance?.total_return
                  )}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="body2" color="text.secondary">
                  Excess Return
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: getPerformanceColor(
                      safeNumber(asRatio(pa?.total_return)) -
                        safeNumber(
                          asRatio(pa?.benchmark_performance?.total_return)
                        )
                    ),
                  }}
                >
                  {formatRatioAsPercent(
                    safeNumber(asRatio(pa?.total_return)) -
                      safeNumber(
                        asRatio(pa?.benchmark_performance?.total_return)
                      )
                  )}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="body2" color="text.secondary">
                  Portfolio Volatility
                </Typography>
                <Typography variant="h6">
                  {formatRatioAsPercent(pa?.volatility)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="body2" color="text.secondary">
                  Benchmark Volatility
                </Typography>
                <Typography variant="h6">
                  {formatRatioAsPercent(
                    pa?.benchmark_performance?.volatility
                  )}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={4} md={2}>
                <Typography variant="body2" color="text.secondary">
                  Tracking Error
                </Typography>
                <Typography variant="h6">
                  {formatRatioAsPercent(pa?.tracking_error)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}
    </Box>
  );
}
