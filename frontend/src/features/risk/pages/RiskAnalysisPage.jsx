import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  Security,
  TrendingDown,
  Assessment,
  Timeline,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import apiService from '../../../api';
import { getApiErrorMessage } from '../../../shared/utils/apiError';
import { ROUTES } from '../../../shared/constants/routes';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  safeNumber,
} from '../../../shared/utils/formatters';
import LoadingState from '../../../components/common/LoadingState';
import ErrorState from '../../../components/common/ErrorState';
import EmptyState from '../../../components/common/EmptyState';
import ScrollableTable from '../../../components/common/ScrollableTable';
import StatCard from '../../../components/common/StatCard';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import { enrichPortfolioAnalytics } from '../../../shared/utils/analyticsDisplay';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`risk-tabpanel-${index}`}
      aria-labelledby={`risk-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
}

function asRatio(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return null;
  }
  const n = Number(value);
  return Math.abs(n) > 5 ? n / 100 : n;
}

function formatRatioAsPercent(value) {
  const ratio = asRatio(value);
  if (ratio === null) return 'N/A';
  return formatPercent(ratio * 100);
}

function extractRiskMetrics(analyticsData) {
  const pa = analyticsData?.performance_analysis || {};
  const rm = pa.risk_metrics || {};

  const var95 = asRatio(pa.var_95 ?? rm.var_95);
  const cvar95 = asRatio(pa.cvar_95 ?? rm.cvar_95);
  const maxDrawdown = asRatio(pa.max_drawdown ?? rm.max_drawdown);
  const volatility = asRatio(pa.volatility ?? rm.volatility);
  const beta = pa.beta ?? rm.beta;
  const sharpe = pa.sharpe_ratio;
  const sortino = pa.sortino_ratio;
  const calmar = pa.calmar_ratio;
  const var99 = asRatio(pa.var_99 ?? rm.var_99);
  const cvar99 = asRatio(pa.cvar_99 ?? rm.cvar_99);

  return {
    var_95: var95,
    var_99: var99,
    cvar_95: cvar95,
    cvar_99: cvar99,
    max_drawdown: maxDrawdown,
    volatility,
    beta: beta == null || Number.isNaN(Number(beta)) ? null : Number(beta),
    sharpe_ratio:
      sharpe == null || Number.isNaN(Number(sharpe)) ? null : Number(sharpe),
    sortino_ratio:
      sortino == null || Number.isNaN(Number(sortino)) ? null : Number(sortino),
    calmar_ratio:
      calmar == null || Number.isNaN(Number(calmar)) ? null : Number(calmar),
    current_value:
      pa.current_value == null || Number.isNaN(Number(pa.current_value))
        ? null
        : Number(pa.current_value),
  };
}

function getRiskLevel(var95) {
  const absVar = Math.abs(safeNumber(var95));
  if (absVar < 0.05) return { level: 'Low', color: 'success' };
  if (absVar < 0.1) return { level: 'Medium', color: 'warning' };
  return { level: 'High', color: 'error' };
}

/**
 * The Risk Metrics tab renders the same rows either as a three-column table
 * (desktop) or a stack of tiles with the description in a tooltip (mobile).
 */
function buildRiskMetricRows(riskMetrics) {
  return [
    {
      label: 'Value at Risk (95%)',
      value: formatRatioAsPercent(riskMetrics.var_95),
      description: 'Maximum expected loss at 95% confidence level',
    },
    {
      label: 'Value at Risk (99%)',
      value: formatRatioAsPercent(riskMetrics.var_99),
      description: 'Maximum expected loss at 99% confidence level',
    },
    {
      label: 'Conditional VaR (95%)',
      value: formatRatioAsPercent(riskMetrics.cvar_95),
      description: 'Expected shortfall beyond VaR threshold',
    },
    {
      label: 'Conditional VaR (99%)',
      value: formatRatioAsPercent(riskMetrics.cvar_99),
      description: 'Expected shortfall at 99% confidence',
    },
    {
      label: 'Maximum Drawdown',
      value: formatRatioAsPercent(riskMetrics.max_drawdown),
      description: 'Largest peak-to-trough decline',
    },
    {
      label: 'Volatility (Annualized)',
      value: formatRatioAsPercent(riskMetrics.volatility),
      description: 'Standard deviation of returns',
    },
    {
      label: 'Beta vs Market',
      value:
        riskMetrics.beta == null ? 'N/A' : formatNumber(riskMetrics.beta),
      description: 'Sensitivity to market movements',
    },
  ];
}

export default function RiskAnalysisPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [riskMetrics, setRiskMetrics] = useState(null);
  const [loadingPortfolios, setLoadingPortfolios] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [portfolioError, setPortfolioError] = useState('');
  const [tabValue, setTabValue] = useState(0);

  const fetchPortfolios = useCallback(async () => {
    setLoadingPortfolios(true);
    setPortfolioError('');
    try {
      const data = await apiService.getPortfolios();
      const list = Array.isArray(data) ? data : [];
      setPortfolios(list);
      if (list.length > 0) {
        setSelectedPortfolio((prev) => prev || list[0].id);
      }
    } catch (err) {
      setPortfolios([]);
      setPortfolioError(getApiErrorMessage(err, 'Failed to fetch portfolios'));
    } finally {
      setLoadingPortfolios(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedPortfolio) {
      fetchRiskAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPortfolio]);

  const fetchRiskAnalysis = async () => {
    if (!selectedPortfolio) return;
    try {
      setLoading(true);
      setError('');
      setAnalytics(null);
      setRiskMetrics(null);

      const analyticsData = await apiService.getPortfolioAnalytics(
        selectedPortfolio
      );
      if (!analyticsData?.performance_analysis) {
        setError('No risk metrics were returned for this portfolio.');
        return;
      }

      setAnalytics(enrichPortfolioAnalytics(analyticsData));
      setRiskMetrics(extractRiskMetrics(enrichPortfolioAnalytics(analyticsData)));
    } catch (err) {
      setAnalytics(null);
      setRiskMetrics(null);
      setError(getApiErrorMessage(err, 'Failed to fetch risk analysis data'));
    } finally {
      setLoading(false);
    }
  };

  const portfolioValue = (portfolio) =>
    portfolio.holdings?.reduce(
      (sum, holding) =>
        sum +
        (Number(holding.quantity) || 0) *
          (Number(holding.avg_purchase_price) || 0),
      0
    ) || 0;

  if (loadingPortfolios) {
    return <LoadingState message="Loading portfolios…" />;
  }

  if (portfolioError) {
    return <ErrorState message={portfolioError} onRetry={fetchPortfolios} />;
  }

  if (portfolios.length === 0) {
    return (
      <EmptyState
        title="No Portfolios Found"
        description="Create a portfolio first to run risk analysis."
        actionLabel="Create Portfolio"
        onAction={() => navigate(ROUTES.OPTIMIZE)}
      />
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Risk Analysis
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Risk assessment from your portfolio performance data
      </Typography>

      {error && (
        <ErrorState message={error} onRetry={fetchRiskAnalysis} />
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Select Portfolio</InputLabel>
                <Select
                  value={selectedPortfolio}
                  label="Select Portfolio"
                  onChange={(e) => {
                    setSelectedPortfolio(e.target.value);
                    setAnalytics(null);
                    setRiskMetrics(null);
                    setError('');
                  }}
                >
                  {portfolios.map((portfolio) => (
                    <MenuItem key={portfolio.id} value={portfolio.id}>
                      {portfolio.name} — {formatCurrency(portfolioValue(portfolio))}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button
                variant="contained"
                size="large"
                onClick={fetchRiskAnalysis}
                disabled={!selectedPortfolio || loading}
                startIcon={
                  loading ? <CircularProgress size={20} /> : <Security />
                }
                fullWidth
              >
                {loading ? 'Analyzing…' : 'Analyze Risk'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading && <LoadingState message="Analyzing portfolio risk…" />}

      {analytics && riskMetrics && !loading && (
        <Box>
          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={6} md={3}>
              <StatCard
                label="VaR (95%)"
                value={formatRatioAsPercent(riskMetrics.var_95)}
                icon={<Security fontSize="small" />}
                color="primary.main"
                caption={
                  riskMetrics.var_95 != null
                    ? `${getRiskLevel(riskMetrics.var_95).level} risk`
                    : undefined
                }
                help="Maximum expected loss at 95% confidence level over a one-day horizon."
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <StatCard
                label="Max Drawdown"
                value={formatRatioAsPercent(riskMetrics.max_drawdown)}
                icon={<TrendingDown fontSize="small" />}
                color="error.main"
                help="Largest peak-to-trough decline observed in the performance history."
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <StatCard
                label="Volatility"
                value={formatRatioAsPercent(riskMetrics.volatility)}
                icon={<Timeline fontSize="small" />}
                color="primary.main"
                help="Annualized standard deviation of portfolio returns."
              />
            </Grid>
            <Grid item xs={6} sm={6} md={3}>
              <StatCard
                label="Beta"
                value={
                  riskMetrics.beta == null
                    ? 'N/A'
                    : formatNumber(riskMetrics.beta)
                }
                icon={<Assessment fontSize="small" />}
                color="primary.main"
                help="Sensitivity of the portfolio to broad market movements."
              />
            </Grid>
          </Grid>

          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={tabValue}
                onChange={(_e, newValue) => setTabValue(newValue)}
              >
                <Tab label="Risk Metrics" />
                <Tab label="Value at Risk" />
                <Tab label="Performance Ratios" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Typography variant="h6" gutterBottom>
                Risk Metrics
              </Typography>
              {isMobile ? (
                <Grid container spacing={2}>
                  {buildRiskMetricRows(riskMetrics).map((row) => (
                    <Grid item xs={6} key={row.label}>
                      <StatCard
                        label={row.label}
                        value={row.value}
                        help={row.description}
                      />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <ScrollableTable minWidth={560}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell>Description</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {buildRiskMetricRows(riskMetrics).map((row) => (
                      <TableRow key={row.label}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell align="right">{row.value}</TableCell>
                        <TableCell>{row.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </ScrollableTable>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom>
                Value at Risk Analysis
              </Typography>
              {riskMetrics.var_95 == null && riskMetrics.current_value == null ? (
                <EmptyState
                  title="VaR data unavailable"
                  description="VaR metrics were not returned by the portfolio performance API."
                />
              ) : (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
                      <Typography variant="subtitle1" gutterBottom>
                        VaR Confidence Levels
                      </Typography>
                      <Box mb={2}>
                        <Typography variant="body2" color="text.secondary">
                          95% Confidence Level
                        </Typography>
                        <Typography variant="h5" color="error.main">
                          {riskMetrics.current_value != null &&
                          riskMetrics.var_95 != null
                            ? formatCurrency(
                                riskMetrics.current_value *
                                  Math.abs(riskMetrics.var_95)
                              )
                            : 'N/A'}
                        </Typography>
                      </Box>
                      <Box mb={2}>
                        <Typography variant="body2" color="text.secondary">
                          99% Confidence Level
                        </Typography>
                        <Typography variant="h5" color="error.main">
                          {riskMetrics.current_value != null &&
                          riskMetrics.var_99 != null
                            ? formatCurrency(
                                riskMetrics.current_value *
                                  Math.abs(riskMetrics.var_99)
                              )
                            : 'N/A'}
                        </Typography>
                      </Box>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Risk Interpretation
                      </Typography>
                      {riskMetrics.var_95 != null ? (
                        <>
                          <Typography variant="body2" paragraph>
                            Based on historical data, there is a 95% probability
                            that losses will not exceed{' '}
                            {formatRatioAsPercent(Math.abs(riskMetrics.var_95))}.
                          </Typography>
                          {riskMetrics.current_value != null && (
                            <Typography variant="body2">
                              In monetary terms, this translates to a maximum
                              expected loss of{' '}
                              <strong>
                                {formatCurrency(
                                  riskMetrics.current_value *
                                    Math.abs(riskMetrics.var_95)
                                )}
                              </strong>{' '}
                              under normal market conditions.
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Insufficient VaR data to interpret risk.
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>
                Risk-Adjusted Performance Ratios
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {riskMetrics.sharpe_ratio == null
                          ? 'N/A'
                          : formatNumber(riskMetrics.sharpe_ratio)}
                      </Typography>
                      <Typography variant="subtitle1" gutterBottom>
                        Sharpe Ratio
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Risk-adjusted return relative to risk-free rate
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {riskMetrics.sortino_ratio == null
                          ? 'N/A'
                          : formatNumber(riskMetrics.sortino_ratio)}
                      </Typography>
                      <Typography variant="subtitle1" gutterBottom>
                        Sortino Ratio
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Return per unit of downside risk
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {riskMetrics.calmar_ratio == null
                          ? 'N/A'
                          : formatNumber(riskMetrics.calmar_ratio)}
                      </Typography>
                      <Typography variant="subtitle1" gutterBottom>
                        Calmar Ratio
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Annual return divided by maximum drawdown
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
          </Card>
        </Box>
      )}

      {!analytics && !loading && !error && (
        <EmptyState
          title="Select a Portfolio for Risk Analysis"
          description="Choose a portfolio and click Analyze Risk to view metrics from live performance data."
        />
      )}
    </Box>
  );
}
