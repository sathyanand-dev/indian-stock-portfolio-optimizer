import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Divider,
  Chip,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { PlayArrow, Compare, Timeline } from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import apiService from '../../../api';
import { getApiErrorMessage } from '../../../shared/utils/apiError';
import { formatCurrencyCompact } from '../../../shared/utils/formatters';
import ScrollableTable from '../../../components/common/ScrollableTable';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';

const BacktestingPage = () => {
  const theme = useTheme();
  const isMobile = useIsMobile();
  const [portfolios, setPortfolios] = useState([]);
  const [selectedPortfolios, setSelectedPortfolios] = useState([]);
  const [startDate, setStartDate] = useState('2022-01-01');
  const [endDate, setEndDate] = useState('2023-12-31');
  const [rebalanceFrequency, setRebalanceFrequency] = useState('monthly');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPortfolios();
    const now = /* @__PURE__ */ new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    setEndDate(now.toISOString().split('T')[0]);
    setStartDate(oneYearAgo.toISOString().split('T')[0]);
  }, []);

  const fetchPortfolios = async () => {
    try {
      const data = await apiService.getPortfolios();
      setPortfolios(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch portfolios'));
    }
  };

  const runBacktest = async () => {
    if (selectedPortfolios.length === 0) {
      setError('Please select at least one portfolio for backtesting');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const backtestResults = {};
      for (const portfolioId of selectedPortfolios) {
        const portfolio = portfolios.find((p) => p.id === portfolioId);
        if (!portfolio) continue;
        const symbols = portfolio.holdings?.map((h) => h.symbol) || [];
        const weights = {};
        portfolio.holdings?.forEach((holding) => {
          weights[holding.symbol] = holding.weight;
        });
        const totalValue = portfolio.holdings?.reduce(
          (sum, holding) => sum + (holding.quantity || 0) * (holding.avg_purchase_price || 0),
          0
        ) || 1e5;
        const request = {
          symbols,
          weights,
          start_date: startDate,
          end_date: endDate,
          initial_amount: totalValue,
          rebalance_frequency: rebalanceFrequency,
        };
        const result = await apiService.runBacktest(request);
        backtestResults[portfolio.name] = result;
      }
      setResults(backtestResults);
    } catch (err) {
      console.error('Backtest error:', err);
      setError(getApiErrorMessage(err, 'Failed to run backtest'));
    } finally {
      setLoading(false);
    }
  };

  const comparePortfolios = async () => {
    if (selectedPortfolios.length < 2) {
      setError('Please select at least two portfolios for comparison');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const portfoliosData = selectedPortfolios.map((id) => {
        const portfolio = portfolios.find((p) => p.id === id);
        const symbols = portfolio?.holdings?.map((h) => h.symbol) || [];
        const weights = {};
        portfolio?.holdings?.forEach((holding) => {
          weights[holding.symbol] = holding.weight;
        });
        return {
          name: portfolio?.name || '',
          symbols,
          weights,
        };
      }).filter((p) => p.name);
      const comparisonResults = await apiService.comparePortfolios(
        portfoliosData,
        startDate,
        endDate
      );
      setResults(comparisonResults);
    } catch (err) {
      console.error('Comparison error:', err);
      setError(getApiErrorMessage(err, 'Failed to compare portfolios'));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getPerformanceColor = (value) => {
    return value >= 0 ? 'success.main' : 'error.main';
  };

  const chartData = Object.keys(results).length > 0 ? results[Object.keys(results)[0]].daily_returns.map((item, index) => {
    const dataPoint = {
      date: new Date(item.date).toLocaleDateString(),
      dateObj: new Date(item.date),
    };
    Object.entries(results).forEach(([name, result]) => {
      if (result.daily_returns[index]) {
        dataPoint[name] = result.daily_returns[index].portfolio_value;
      }
    });
    return dataPoint;
  }).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()) : [];

  // Series colours come from the palette so the comparison chart stays legible
  // in both colour modes.
  const seriesColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.info.main,
  ];

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Portfolio Backtesting
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Test your portfolio strategies against historical data
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Configuration Panel */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Backtest Configuration
          </Typography>

          <Grid container spacing={{ xs: 2, md: 3 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: { xs: 2, md: 3 } }}>
                <InputLabel>Select Portfolios</InputLabel>
                <Select
                  multiple
                  value={selectedPortfolios}
                  label="Select Portfolios"
                  onChange={(e) => setSelectedPortfolios(e.target.value)}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: '100%' }}>
                      {selected.map((value) => {
                        const portfolio = portfolios.find((p) => p.id === value);
                        return (
                          <Chip
                            key={value}
                            label={portfolio?.name}
                            size="small"
                            sx={{ maxWidth: '100%' }}
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  {portfolios.map((portfolio) => (
                    <MenuItem key={portfolio.id} value={portfolio.id} sx={{ whiteSpace: 'normal' }}>
                      {portfolio.name} - {formatCurrency(
                        portfolio.holdings?.reduce(
                          (sum, holding) => sum + (holding.quantity || 0) * (holding.avg_purchase_price || 0),
                          0
                        ) || 0
                      )}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Grid container spacing={2} sx={{ mb: { xs: 2, md: 3 } }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </Grid>

              <FormControl fullWidth sx={{ mb: { xs: 0, md: 3 } }}>
                <InputLabel>Rebalance Frequency</InputLabel>
                <Select
                  value={rebalanceFrequency}
                  label="Rebalance Frequency"
                  onChange={(e) => setRebalanceFrequency(e.target.value)}
                >
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box display="flex" flexDirection="column" gap={2}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={runBacktest}
                  disabled={loading || selectedPortfolios.length === 0}
                  startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
                  fullWidth
                >
                  {loading ? 'Running Backtest...' : 'Run Backtest'}
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  onClick={comparePortfolios}
                  disabled={loading || selectedPortfolios.length < 2}
                  startIcon={<Compare />}
                  fullWidth
                >
                  Compare Portfolios
                </Button>

                <Typography variant="body2" color="text.secondary">
                  Select portfolios above and configure the time period for backtesting.
                  The system will simulate your portfolio performance using historical data.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Results */}
      {Object.keys(results).length > 0 && (
        <Box>
          {/* Performance Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Summary
              </Typography>
              <ScrollableTable minWidth={760}>
                <TableHead>
                  <TableRow>
                    <TableCell>Portfolio</TableCell>
                    <TableCell align="right">Total Return</TableCell>
                    <TableCell align="right">Annual Return</TableCell>
                    <TableCell align="right">Volatility</TableCell>
                    <TableCell align="right">Sharpe Ratio</TableCell>
                    <TableCell align="right">Max Drawdown</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(results).map(([name, result]) => (
                    <TableRow key={name}>
                      <TableCell>{name}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color={getPerformanceColor(result.total_return)}>
                          {formatPercentage(result.total_return)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color={getPerformanceColor(result.annual_return)}>
                          {formatPercentage(result.annual_return)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {formatPercentage(result.volatility)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={result.sharpe_ratio > 1 ? 'success.main' : 'text.primary'}
                        >
                          {result.sharpe_ratio.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="error.main">
                          {formatPercentage(result.max_drawdown)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </ScrollableTable>
            </CardContent>
          </Card>

          {/* Performance Chart */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Portfolio Value Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={isMobile ? 260 : 400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                    stroke={theme.palette.divider}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(value) => formatCurrencyCompact(value)}
                    tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                    stroke={theme.palette.divider}
                    width={isMobile ? 56 : 80}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(value), 'Portfolio Value']}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 8,
                      color: theme.palette.text.primary,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {Object.keys(results).map((name, index) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={seriesColors[index % seriesColors.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Analysis */}
          <Grid container spacing={{ xs: 2, md: 3 }}>
            {Object.entries(results).map(([name, result]) => (
              <Grid item xs={12} sm={6} lg={4} key={name}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {name}
                    </Typography>

                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Total Return
                      </Typography>
                      <Typography variant="h5" color={getPerformanceColor(result.total_return)}>
                        {formatPercentage(result.total_return)}
                      </Typography>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Annual Return
                        </Typography>
                        <Typography variant="body1" color={getPerformanceColor(result.annual_return)}>
                          {formatPercentage(result.annual_return)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Volatility
                        </Typography>
                        <Typography variant="body1">
                          {formatPercentage(result.volatility)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Sharpe Ratio
                        </Typography>
                        <Typography variant="body1">
                          {result.sharpe_ratio.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Max Drawdown
                        </Typography>
                        <Typography variant="body1" color="error.main">
                          {formatPercentage(result.max_drawdown)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {Object.keys(results).length === 0 && (
        <Card>
          <CardContent>
            <Box textAlign="center" py={{ xs: 5, md: 8 }} px={2}>
              <Timeline sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Run Your First Backtest
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Select portfolios and configure the parameters above to see historical performance analysis
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default BacktestingPage;
