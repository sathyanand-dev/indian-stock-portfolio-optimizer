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
  Paper,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Search,
  Refresh,
  TrendingUp,
  TrendingDown,
  Add,
  Remove,
  ShowChart,
} from '@mui/icons-material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import apiService from '../../../api';
import { getApiErrorMessage } from '../../../shared/utils/apiError';
import StockSearchAutocomplete from '../../../components/stocks/StockSearchAutocomplete';
import ScrollableTable from '../../../components/common/ScrollableTable';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`market-tabpanel-${index}`}
      aria-labelledby={`market-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
}

const POPULAR_STOCKS = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank" },
  { symbol: "INFY.NS", name: "Infosys" },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank" },
  { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank" },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel" },
  { symbol: "ITC.NS", name: "ITC Limited" },
  { symbol: "SBIN.NS", name: "State Bank of India" }
];

const INDICES = [
  { symbol: "^NSEI", name: "Nifty 50" },
  { symbol: "^BSESN", name: "BSE Sensex" },
  { symbol: "^NSEBANK", name: "Bank Nifty" },
  { symbol: "^CNXIT", name: "Nifty IT" },
  { symbol: "^CNXAUTO", name: "Nifty Auto" }
];

const MarketDataPage = () => {
  const theme = useTheme();
  const isMobile = useIsMobile();
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [watchlist, setWatchlist] = useState(['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS']);
  const [selectedSymbol, setSelectedSymbol] = useState('RELIANCE.NS');
  const [period, setPeriod] = useState('1y');
  const [stockData, setStockData] = useState([]);
  const [multipleStockData, setMultipleStockData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    if (selectedSymbol) {
      fetchStockData(selectedSymbol, period);
    }
  }, [selectedSymbol, period]);

  useEffect(() => {
    if (watchlist.length > 0) {
      fetchMultipleStockData();
    }
  }, [watchlist]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = searchQuery.trim();
      if (!q) {
        setSearchResults([]);
        return;
      }
      try {
        setSearchLoading(true);
        const results = await apiService.searchSymbols(q, 25);
        setSearchResults(results);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to search symbols'));
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchStockData = async (symbol, timePeriod) => {
    try {
      setLoading(true);
      setError('');
      const data = await apiService.getStockData(symbol, timePeriod);
      setStockData(data);
    } catch (err) {
      setError(getApiErrorMessage(err, `Failed to fetch data for ${symbol}`));
      setStockData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMultipleStockData = async () => {
    try {
      const data = await apiService.getMultipleStockData(watchlist, '5d');
      setMultipleStockData(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to fetch watchlist data'));
    }
  };

  const addToWatchlist = (symbol) => {
    if (!watchlist.includes(symbol)) {
      setWatchlist([...watchlist, symbol]);
    }
  };

  const removeFromWatchlist = (symbol) => {
    setWatchlist(watchlist.filter((s) => s !== symbol));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatVolume = (volume) => {
    if (volume >= 1e7) {
      return `${(volume / 1e7).toFixed(1)}Cr`;
    } else if (volume >= 1e5) {
      return `${(volume / 1e5).toFixed(1)}L`;
    } else if (volume >= 1e3) {
      return `${(volume / 1e3).toFixed(1)}K`;
    }
    return volume.toString();
  };

  const calculateChange = (data) => {
    if (data.length < 2) return { change: 0, changePercent: 0 };
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];
    const change = latest.close - previous.close;
    const changePercent = change / previous.close * 100;
    return { change, changePercent };
  };

  const chartData = Array.isArray(stockData) ? stockData.map((item) => ({
    date: new Date(item.date).toLocaleDateString(),
    dateObj: new Date(item.date),
    close: item.close,
    open: item.open,
    high: item.high,
    low: item.low,
    volume: item.volume
  })).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime()) : [];

  const chartHeight = isMobile ? 240 : 400;

  const chartTooltipStyle = {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    color: theme.palette.text.primary,
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Market Data
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Real-time stock data and market analysis
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Stock Analysis" />
            <Tab label="Watchlist" />
            <Tab label="Market Overview" />
            <Tab label="Search" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* Stock Analysis */}
          <Grid container spacing={{ xs: 2, md: 3 }}>
            <Grid item xs={12} md={4}>
              <Box mb={3}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Select Stock</InputLabel>
                  <Select
                    value={selectedSymbol}
                    label="Select Stock"
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                  >
                    {POPULAR_STOCKS.map((stock) => (
                      <MenuItem key={stock.symbol} value={stock.symbol} sx={{ whiteSpace: 'normal' }}>
                        {stock.name} ({stock.symbol})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Time Period</InputLabel>
                  <Select
                    value={period}
                    label="Time Period"
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    <MenuItem value="1d">1 Day</MenuItem>
                    <MenuItem value="5d">5 Days</MenuItem>
                    <MenuItem value="1mo">1 Month</MenuItem>
                    <MenuItem value="3mo">3 Months</MenuItem>
                    <MenuItem value="6mo">6 Months</MenuItem>
                    <MenuItem value="1y">1 Year</MenuItem>
                    <MenuItem value="2y">2 Years</MenuItem>
                    <MenuItem value="5y">5 Years</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => addToWatchlist(selectedSymbol)}
                  startIcon={<Add />}
                  disabled={watchlist.includes(selectedSymbol)}
                >
                  {watchlist.includes(selectedSymbol) ? 'In Watchlist' : 'Add to Watchlist'}
                </Button>
              </Box>

              {/* Stock Summary */}
              {Array.isArray(stockData) && stockData.length > 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ wordBreak: 'break-word' }}>
                    {selectedSymbol}
                  </Typography>
                  <Typography variant="h4" gutterBottom>
                    {formatCurrency(stockData[stockData.length - 1]?.close || 0)}
                  </Typography>
                  {(() => {
                    const { change, changePercent } = Array.isArray(stockData) ? calculateChange(stockData) : { change: 0, changePercent: 0 };
                    return (
                      <Box display="flex" alignItems="center" flexWrap="wrap" mb={2}>
                        {change >= 0
                          ? <TrendingUp sx={{ color: 'success.main', mr: 1 }} />
                          : <TrendingDown sx={{ color: 'error.main', mr: 1 }} />}
                        <Typography
                          variant="body1"
                          sx={{ color: change >= 0 ? 'success.main' : 'error.main' }}
                        >
                          {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
                        </Typography>
                      </Box>
                    );
                  })()}

                  <Typography variant="body2" color="text.secondary">
                    Volume: {formatVolume(stockData[stockData.length - 1]?.volume || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    High: {formatCurrency(stockData[stockData.length - 1]?.high || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Low: {formatCurrency(stockData[stockData.length - 1]?.low || 0)}
                  </Typography>
                </Paper>
              )}
            </Grid>

            <Grid item xs={12} md={8}>
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" height={chartHeight}>
                  <CircularProgress />
                </Box>
              ) : (
                <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
                  <Typography variant="h6" gutterBottom sx={{ wordBreak: 'break-word' }}>
                    Price Chart - {selectedSymbol}
                  </Typography>
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                        stroke={theme.palette.divider}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={['dataMin - 10', 'dataMax + 10']}
                        tickFormatter={(value) => `\u20B9${value.toFixed(0)}`}
                        tick={{ fontSize: 12, fill: theme.palette.text.secondary }}
                        stroke={theme.palette.divider}
                        width={isMobile ? 56 : 70}
                      />
                      <Tooltip
                        formatter={(value) => [formatCurrency(value), 'Price']}
                        labelFormatter={(label) => `Date: ${label}`}
                        contentStyle={chartTooltipStyle}
                      />
                      <Area
                        type="monotone"
                        dataKey="close"
                        stroke={theme.palette.secondary.main}
                        fill={theme.palette.secondary.main}
                        fillOpacity={0.1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Paper>
              )}
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Watchlist */}
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Your Watchlist
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={fetchMultipleStockData}
              sx={{ mb: 2 }}
            >
              Refresh Data
            </Button>
          </Box>

          <ScrollableTable minWidth={720}>
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Change</TableCell>
                <TableCell align="right">Change %</TableCell>
                <TableCell align="right">Volume</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {watchlist.map((symbol) => {
                const data = multipleStockData[symbol] || [];
                const latest = data[data.length - 1];
                const { change, changePercent } = calculateChange(data);
                return (
                  <TableRow key={symbol}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold" noWrap>
                        {symbol}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {latest ? formatCurrency(latest.close) : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{ color: change >= 0 ? 'success.main' : 'error.main' }}
                      >
                        {change >= 0 ? '+' : ''}{change.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`}
                        color={changePercent >= 0 ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {latest ? formatVolume(latest.volume) : 'N/A'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => removeFromWatchlist(symbol)}
                        color="error"
                        aria-label={`Remove ${symbol} from watchlist`}
                      >
                        <Remove />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </ScrollableTable>

          {watchlist.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">
                Your watchlist is empty. Add stocks from the Stock Analysis tab.
              </Typography>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {/* Market Overview */}
          <Typography variant="h6" gutterBottom>
            Indian Market Indices
          </Typography>

          <Grid container spacing={{ xs: 2, md: 3 }}>
            {INDICES.map((index) => (
              <Grid item xs={12} sm={6} md={4} key={index.symbol}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {index.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {index.symbol}
                    </Typography>
                    <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="center" gap={1}>
                      <Button
                        size="small"
                        startIcon={<ShowChart />}
                        onClick={() => {
                          setSelectedSymbol(index.symbol);
                          setTabValue(0);
                        }}
                      >
                        View Chart
                      </Button>
                      <Button
                        size="small"
                        startIcon={<Add />}
                        onClick={() => addToWatchlist(index.symbol)}
                        disabled={watchlist.includes(index.symbol)}
                      >
                        Watch
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box mt={4}>
            <Typography variant="h6" gutterBottom>
              Popular Stocks
            </Typography>
            <Grid container spacing={2}>
              {POPULAR_STOCKS.map((stock) => (
                <Grid item xs={12} sm={6} md={4} key={stock.symbol}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        {stock.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {stock.symbol}
                      </Typography>
                      <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="center" gap={1}>
                        <Button
                          size="small"
                          startIcon={<ShowChart />}
                          onClick={() => {
                            setSelectedSymbol(stock.symbol);
                            setTabValue(0);
                          }}
                        >
                          Analyze
                        </Button>
                        <Button
                          size="small"
                          startIcon={<Add />}
                          onClick={() => addToWatchlist(stock.symbol)}
                          disabled={watchlist.includes(stock.symbol)}
                        >
                          Watch
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {/* Search */}
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Search Stocks
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Type a company name or symbol. Results update as you type.
            </Typography>
            <Box mb={3}>
              <StockSearchAutocomplete
                selectedSymbols={[]}
                onSelect={(symbol) => {
                  setSelectedSymbol(symbol);
                  setTabValue(0);
                }}
                label="Search NSE/BSE stocks"
                placeholder="e.g. Reliance, HDFC Bank, TCS, Gold ETF"
              />
            </Box>
            <TextField
              fullWidth
              label="Or browse matching results"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., Reliance, TCS, HDFC"
              InputProps={{
                endAdornment: searchLoading ? <CircularProgress size={18} /> : <Search color="action" />
              }}
            />
          </Box>

          {searchResults.length > 0 && (
            <Paper variant="outlined">
              <List disablePadding>
                {searchResults.map((item) => (
                  <ListItem
                    key={item.symbol}
                    divider
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'stretch', sm: 'center' },
                      gap: { xs: 1, sm: 2 },
                      py: 1.5,
                    }}
                  >
                    <ListItemText
                      sx={{ m: 0, minWidth: 0 }}
                      primary={`${item.symbol} \u2014 ${item.name}`}
                      secondary={`${item.exchange}${item.type ? ` \xB7 ${item.type}` : ''}`}
                      primaryTypographyProps={{ sx: { wordBreak: 'break-word' } }}
                    />
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexShrink={0}
                      justifyContent={{ xs: 'flex-start', sm: 'flex-end' }}
                    >
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedSymbol(item.symbol);
                          setTabValue(0);
                        }}
                        startIcon={<ShowChart />}
                      >
                        Analyze
                      </Button>
                      <IconButton
                        onClick={() => addToWatchlist(item.symbol)}
                        disabled={watchlist.includes(item.symbol)}
                        aria-label={`Add ${item.symbol} to watchlist`}
                      >
                        <Add />
                      </IconButton>
                    </Stack>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {searchResults.length === 0 && searchQuery.trim() && !searchLoading && (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">
                No valid NSE/BSE matches for "{searchQuery}". Try another company name or symbol.
              </Typography>
            </Box>
          )}
        </TabPanel>
      </Card>
    </Box>
  );
};

export default MarketDataPage;
