import { useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Slider,
  Snackbar,
  Switch,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  Assessment,
  Balance,
  ExpandMore,
  HelpOutline,
  Insights,
  Lightbulb,
  Save,
  Shield,
  TrendingUp,
  WarningAmber,
} from '@mui/icons-material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import apiService from '../../../api';
import { getApiErrorMessage } from '../../../shared/utils/apiError';
import StockSearchAutocomplete from '../../../components/stocks/StockSearchAutocomplete';
import PageHeader from '../../../components/common/PageHeader';
import ResponsiveDialog from '../../../components/common/ResponsiveDialog';
import ScrollableTable from '../../../components/common/ScrollableTable';
import { useIsMobile, useIsCompact } from '../../../shared/hooks/useIsMobile';
import { formatCurrencyCompact } from '../../../shared/utils/formatters';

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

const QUICK_PICKS = [
  { label: 'Reliance', symbol: 'RELIANCE.NS' },
  { label: 'TCS', symbol: 'TCS.NS' },
  { label: 'HDFC Bank', symbol: 'HDFCBANK.NS' },
  { label: 'Infosys', symbol: 'INFY.NS' },
  { label: 'Nifty ETF', symbol: 'NIFTYBEES.NS' },
  { label: 'Gold ETF', symbol: 'GOLDBEES.NS' },
];

const METHOD_HELP = {
  mean_variance: {
    title: 'Balanced growth (Mean–Variance)',
    plain:
      'Best default for most people. It tries to earn more return without taking unnecessary risk — like packing a school bag with the lightest books that still cover every subject.',
    when: 'You want a mix of growth and stability from 1+ year of price history.',
  },
  risk_parity: {
    title: 'Share the risk evenly (Risk Parity)',
    plain:
      'Instead of giving each stock the same money, it gives each stock a similar amount of risk. Volatile stocks get a smaller slice; steady ones get more.',
    when: 'You dislike one stock dominating how much the portfolio can swing.',
  },
  minimum_variance: {
    title: 'Lowest ups and downs (Min Variance)',
    plain:
      'Ignores “how much can I earn?” and focuses only on “how little can this bounce?” Useful when markets feel scary.',
    when: 'Capital protection matters more than chasing higher returns.',
  },
  black_litterman: {
    title: 'Market view + your view (Black–Litterman)',
    plain:
      'Starts from a sensible market mix, then gently adjusts. Safer than blindly trusting raw historical returns.',
    when: 'You want a more institutional-style allocation without wild bets.',
  },
  monte_carlo: {
    title: 'Try thousands of mixes (Monte Carlo)',
    plain:
      'Builds thousands of random portfolios and keeps the one that best matches your risk style. Good for exploring alternatives.',
    when: 'You want a second opinion beyond a single formula.',
  },
};

const RISK_HELP = {
  conservative: 'Prefer calmer portfolios — smaller swings, usually lower expected return.',
  moderate: 'Middle path — room to grow with controlled risk. Recommended for most retail investors.',
  aggressive: 'OK with bigger ups and downs for a shot at higher long-term return.',
};

const CONSTRAINT_PRESETS = [
  {
    id: 'balanced',
    label: 'Balanced mix',
    hint: 'No stock below 5% or above 40%',
    apply: (symbols) => {
      const min = {};
      const max = {};
      symbols.forEach((s) => {
        min[s] = 5;
        max[s] = 40;
      });
      return { min, max };
    },
  },
  {
    id: 'no_overweight',
    label: 'No overweight',
    hint: 'Cap every stock at 25%',
    apply: (symbols) => {
      const min = {};
      const max = {};
      symbols.forEach((s) => {
        min[s] = 0;
        max[s] = 25;
      });
      return { min, max };
    },
  },
  {
    id: 'core_satellite',
    label: 'Core + satellites',
    hint: 'First stock 30–50%, others 5–25%',
    apply: (symbols) => {
      const min = {};
      const max = {};
      symbols.forEach((s, i) => {
        if (i === 0) {
          min[s] = 30;
          max[s] = 50;
        } else {
          min[s] = 5;
          max[s] = 25;
        }
      });
      return { min, max };
    },
  },
];

function formatCurrency(amount) {
  if (!Number.isFinite(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPct(ratio, digits = 1) {
  if (!Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(digits)}%`;
}

function MetricCard({ label, value, hint, color = 'primary.main' }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block">
        {label}
      </Typography>
      <Typography
        sx={{
          color,
          fontWeight: 700,
          my: 0.5,
          lineHeight: 1.3,
          fontSize: { xs: '1.15rem', sm: '1.5rem' },
          wordBreak: 'break-word',
        }}
      >
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Paper>
  );
}

function InsightCard({ icon, title, body, tone = 'default' }) {
  const toneFill = (theme) => {
    const fills = {
      good: theme.palette.success.main,
      warn: theme.palette.warning.main,
      risk: theme.palette.error.main,
    };
    const base = fills[tone];
    return base ? alpha(base, theme.palette.mode === 'dark' ? 0.16 : 0.08) : theme.palette.action.hover;
  };
  const toneBorder = { good: 'success.light', warn: 'warning.light', risk: 'error.light' };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        border: '1px solid',
        borderColor: toneBorder[tone] || 'divider',
        bgcolor: toneFill,
        borderRadius: 2,
      }}
    >
      <Box display="flex" gap={1} alignItems="flex-start" mb={1}>
        {icon}
        <Typography variant="subtitle2" fontWeight={700}>
          {title}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {body}
      </Typography>
    </Paper>
  );
}

function buildDeepAnalysis(uiResult, investmentAmount, riskTolerance, useConstraints) {
  if (!uiResult) return null;
  const entries = Object.entries(uiResult.weights).sort((a, b) => b[1] - a[1]);
  const weights = entries.map(([, w]) => w);
  const hhi = weights.reduce((sum, w) => sum + w * w, 0);
  const effectiveN = hhi > 0 ? 1 / hhi : 0;
  const maxWeight = weights[0] || 0;
  const topSymbol = entries[0]?.[0];
  const concentration =
    maxWeight >= 0.55 ? 'high' : maxWeight >= 0.4 ? 'elevated' : 'balanced';

  const expectedGain = uiResult.expected_return * investmentAmount;
  const swing1sd = uiResult.volatility * investmentAmount;
  const roughBadYear = Math.max(0, investmentAmount - 1.5 * swing1sd);

  const sharpe = uiResult.sharpe_ratio;
  const sharpeLabel =
    sharpe >= 1.2 ? 'Strong' : sharpe >= 0.7 ? 'Decent' : sharpe >= 0.3 ? 'Modest' : 'Weak';

  const equalWeight = 1 / Math.max(entries.length, 1);
  const vsEqual = entries.map(([symbol, w]) => ({
    symbol: symbol.replace(/\.(NS|BO)$/, ''),
    optimized: +(w * 100).toFixed(1),
    equal: +(equalWeight * 100).toFixed(1),
    amount: uiResult.allocation[symbol],
  }));

  const insights = [];
  if (concentration === 'high') {
    insights.push({
      tone: 'risk',
      icon: <WarningAmber color="error" fontSize="small" />,
      title: 'Concentration risk',
      body: `${topSymbol} is about ${formatPct(maxWeight)} of the portfolio. One bad week in that name can drag everything down. Turn on weight constraints (e.g. max 25–40%) if you want to force diversification.`,
    });
  } else if (concentration === 'elevated') {
    insights.push({
      tone: 'warn',
      icon: <Balance color="warning" fontSize="small" />,
      title: 'Slightly concentrated',
      body: `${topSymbol} is the largest holding (${formatPct(maxWeight)}). That can be fine if you trust it, but consider a max-weight cap for peace of mind.`,
    });
  } else {
    insights.push({
      tone: 'good',
      icon: <Shield color="success" fontSize="small" />,
      title: 'Diversification looks healthy',
      body: `No single stock dominates. Effective number of holdings ≈ ${effectiveN.toFixed(1)} (higher is more spread out).`,
    });
  }

  insights.push({
    tone: 'default',
    icon: <Insights color="primary" fontSize="small" />,
    title: 'What the numbers mean in ₹',
    body: `On ₹${investmentAmount.toLocaleString('en-IN')}, the model’s expected annual move is about ${formatCurrency(expectedGain)} (before fees/taxes). A typical yearly swing of ±1σ is roughly ${formatCurrency(swing1sd)}. That is a planning range — not a guarantee.`,
  });

  insights.push({
    tone: sharpe >= 0.7 ? 'good' : 'warn',
    icon: <TrendingUp color={sharpe >= 0.7 ? 'success' : 'warning'} fontSize="small" />,
    title: `Risk-adjusted quality: ${sharpeLabel}`,
    body: `Sharpe ${sharpe.toFixed(2)} compares extra return vs volatility (above a safe rate). Above ~1 is attractive; below ~0.5 means you are taking a lot of bumpiness for the reward. Your risk style is set to “${riskTolerance}”.`,
  });

  if (!useConstraints && maxWeight > 0.45) {
    insights.push({
      tone: 'warn',
      icon: <Lightbulb color="warning" fontSize="small" />,
      title: 'Try weight constraints',
      body: 'Without constraints, math often piles into the historically strongest stock. Retail investors usually sleep better with a max of 25–40% per name.',
    });
  }

  return {
    hhi,
    effectiveN,
    maxWeight,
    topSymbol,
    concentration,
    expectedGain,
    swing1sd,
    roughBadYear,
    sharpeLabel,
    vsEqual,
    insights,
    diversificationScore: Math.min(100, Math.round((effectiveN / Math.max(entries.length, 1)) * 100)),
  };
}

export default function OptimizationPage() {
  const theme = useTheme();
  const isMobile = useIsMobile();
  const isCompact = useIsCompact();
  const seriesColors = chartColors(theme);
  const axisTick = { fontSize: isMobile ? 10 : 12, fill: theme.palette.text.secondary };
  const chartTooltipStyle = {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    color: theme.palette.text.primary,
  };

  const [symbols, setSymbols] = useState([]);
  const [riskTolerance, setRiskTolerance] = useState('moderate');
  const [method, setMethod] = useState('mean_variance');
  const [investmentAmount, setInvestmentAmount] = useState(100000);
  const [useConstraints, setUseConstraints] = useState(false);
  const [minWeights, setMinWeights] = useState({});
  const [maxWeights, setMaxWeights] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [constraintError, setConstraintError] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [portfolioName, setPortfolioName] = useState('');
  const [portfolioDescription, setPortfolioDescription] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);

  const methodHelp = METHOD_HELP[method];

  const handleAddSymbol = (symbol) => {
    if (!symbol || symbols.includes(symbol)) return;
    setSymbols((prev) => [...prev, symbol]);
    setMinWeights((prev) => ({ ...prev, [symbol]: 0 }));
    setMaxWeights((prev) => ({ ...prev, [symbol]: 40 }));
    setResult(null);
  };

  const handleRemoveSymbol = (symbol) => {
    setSymbols((prev) => prev.filter((s) => s !== symbol));
    setMinWeights((prev) => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });
    setMaxWeights((prev) => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });
    setResult(null);
  };

  const applyPreset = (preset) => {
    const { min, max } = preset.apply(symbols);
    setMinWeights(min);
    setMaxWeights(max);
    setUseConstraints(true);
    setConstraintError('');
  };

  const validateConstraints = () => {
    if (!useConstraints) return true;
    for (const symbol of symbols) {
      const min = Number(minWeights[symbol] ?? 0);
      const max = Number(maxWeights[symbol] ?? 100);
      if (min < 0 || max > 100 || min > max) {
        setConstraintError(
          `${symbol}: Min must be ≤ Max, and both between 0 and 100. Example: Min 5, Max 30.`,
        );
        return false;
      }
    }
    const minSum = symbols.reduce((s, sym) => s + Number(minWeights[sym] || 0), 0);
    if (minSum > 100) {
      setConstraintError(
        `Your minimums add up to ${minSum}% — that is impossible. Lower some Min % values so the total is ≤ 100%.`,
      );
      return false;
    }
    setConstraintError('');
    return true;
  };

  const handleOptimize = async () => {
    if (symbols.length < 2) {
      setError('Add at least 2 stocks or ETFs. Diversification needs more than one name.');
      return;
    }
    if (investmentAmount < 1000) {
      setError('Enter an investment amount of at least ₹1,000 so allocations make sense.');
      return;
    }
    if (!validateConstraints()) return;

    try {
      setLoading(true);
      setError('');
      const request = {
        symbols,
        optimization_type: method,
        risk_tolerance: riskTolerance,
        investment_amount: investmentAmount,
        lookback_period: '1y',
      };
      const optimizationResult = useConstraints
        ? await apiService.optimizeWithConstraints({
            ...request,
            min_weights: minWeights,
            max_weights: maxWeights,
          })
        : await apiService.optimizePortfolio(request);
      setResult(optimizationResult);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          'Optimization failed. Prefer stocks with 6+ months of history (new IPOs often fail).',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSavePortfolio = async () => {
    if (!result || !portfolioName.trim()) return;
    try {
      const weightsObj = {};
      result.symbols.forEach((symbol, index) => {
        weightsObj[symbol] = result.weights[index];
      });
      const priceResults = await Promise.all(
        symbols.map(async (symbol) => {
          try {
            const quote = await apiService.getStockQuote(symbol);
            return { symbol, price: quote.current_price };
          } catch {
            return { symbol, price: null };
          }
        }),
      );
      const priceMap = Object.fromEntries(
        priceResults.filter((p) => p.price > 0).map((p) => [p.symbol, p.price]),
      );
      const missing = symbols.filter((s) => !priceMap[s]);
      if (missing.length) {
        setError(`Could not fetch live prices for: ${missing.join(', ')}. Try again shortly.`);
        return;
      }
      const holdings = symbols
        .map((symbol) => {
          const weight = weightsObj[symbol] || 0;
          if (weight < 1e-3) return null;
          const currentPrice = priceMap[symbol];
          const allocation = weight * investmentAmount;
          return {
            symbol,
            weight: Math.round(weight * 1e4) / 1e4,
            quantity: Math.floor(allocation / currentPrice),
            avg_purchase_price: Math.round(currentPrice * 100) / 100,
          };
        })
        .filter(Boolean);

      await apiService.createPortfolio({
        name: portfolioName.trim(),
        description: `${portfolioDescription}

Optimization Details:
- Method: ${method}
- Risk: ${riskTolerance}
- Amount: ₹${investmentAmount.toLocaleString('en-IN')}
- Expected return: ${(result.expected_return * 100).toFixed(2)}%
- Volatility: ${(result.expected_volatility * 100).toFixed(2)}%
- Sharpe: ${result.sharpe_ratio.toFixed(3)}
- Constraints: ${useConstraints ? 'Yes' : 'No'}`,
        holdings,
        optimization_method: method,
        risk_tolerance: riskTolerance,
        investment_amount: investmentAmount,
        expected_return: result.expected_return,
        expected_volatility: result.expected_volatility,
        sharpe_ratio: result.sharpe_ratio,
      });
      setSaveDialogOpen(false);
      setPortfolioName('');
      setPortfolioDescription('');
      setSaveSuccess(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save portfolio'));
    }
  };

  const uiResult = useMemo(() => {
    if (!result) return null;
    const weightsObj = {};
    const allocationObj = {};
    result.symbols.forEach((symbol, index) => {
      weightsObj[symbol] = result.weights[index];
      allocationObj[symbol] = result.weights[index] * investmentAmount;
    });
    return {
      weights: weightsObj,
      allocation: allocationObj,
      expected_return: result.expected_return,
      volatility: result.expected_volatility,
      sharpe_ratio: result.sharpe_ratio,
    };
  }, [result, investmentAmount]);

  const pieData = uiResult
    ? Object.entries(uiResult.weights)
        .filter(([, w]) => w > 0.005)
        .map(([symbol, weight]) => ({
          name: symbol.replace(/\.(NS|BO)$/, ''),
          full: symbol,
          value: +(weight * 100).toFixed(2),
          amount: uiResult.allocation[symbol],
        }))
    : [];

  const analysis = useMemo(
    () => buildDeepAnalysis(uiResult, investmentAmount, riskTolerance, useConstraints),
    [uiResult, investmentAmount, riskTolerance, useConstraints],
  );

  return (
    <Box>
      <PageHeader
        title="Portfolio Optimize"
        subtitle="Build a data-backed mix of NSE stocks & ETFs — explained in plain language"
        actions={
          <Button
            variant="outlined"
            startIcon={<HelpOutline />}
            onClick={() => setGuideOpen((v) => !v)}
          >
            {guideOpen ? 'Hide guide' : 'How this works'}
          </Button>
        }
      />

      <Snackbar
        open={saveSuccess}
        autoHideDuration={4000}
        onClose={() => setSaveSuccess(false)}
        message="Portfolio saved — find it under My Portfolios"
      />

      {guideOpen && (
        <Alert severity="info" icon={<Lightbulb />} sx={{ mb: 3 }} onClose={() => setGuideOpen(false)}>
          <Typography variant="subtitle2" gutterBottom>
            Quick path for first-timers
          </Typography>
          <Typography variant="body2" component="div">
            1) Add 3–6 familiar stocks/ETFs → 2) Keep risk on <strong>Moderate</strong> → 3) Use method{' '}
            <strong>Balanced growth</strong> → 4) Optionally turn on <strong>weight constraints</strong> so no
            stock eats the whole portfolio → 5) Click Optimize and read the insights before you save.
          </Typography>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} lg={5} sx={{ minWidth: 0 }}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                1. Pick your universe
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Choose stocks or ETFs you already understand. Avoid brand-new IPOs — they often lack enough
                price history for a reliable optimize.
              </Typography>

              <StockSearchAutocomplete
                selectedSymbols={symbols}
                onSelect={(symbol) => handleAddSymbol(symbol)}
                label="Search & add"
                placeholder="Reliance, HDFC Bank, TCS, Gold ETF…"
              />

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                {QUICK_PICKS.map((p) => (
                  <Button
                    key={p.symbol}
                    size="small"
                    variant="outlined"
                    disabled={symbols.includes(p.symbol)}
                    onClick={() => handleAddSymbol(p.symbol)}
                  >
                    {p.label}
                  </Button>
                ))}
              </Box>

              <Box mt={2} minHeight={40}>
                {symbols.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    No stocks yet — add at least two.
                  </Typography>
                ) : (
                  symbols.map((symbol) => (
                    <Chip
                      key={symbol}
                      label={symbol}
                      onDelete={() => handleRemoveSymbol(symbol)}
                      sx={{ mr: 1, mb: 1 }}
                      color="primary"
                      variant="outlined"
                    />
                  ))
                )}
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                2. Your preferences
              </Typography>

              <TextField
                fullWidth
                label="Investment amount (₹)"
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(Number(e.target.value))}
                helperText="Used to convert % weights into rupee amounts"
                sx={{ mb: 2.5 }}
              />

              <FormControl fullWidth sx={{ mb: 1 }}>
                <InputLabel>Risk comfort</InputLabel>
                <Select
                  value={riskTolerance}
                  label="Risk comfort"
                  onChange={(e) => setRiskTolerance(e.target.value)}
                >
                  <MenuItem value="conservative">Conservative — sleep well</MenuItem>
                  <MenuItem value="moderate">Moderate — balanced (recommended)</MenuItem>
                  <MenuItem value="aggressive">Aggressive — bigger swings OK</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2.5 }}>
                {RISK_HELP[riskTolerance]}
              </Typography>

              <FormControl fullWidth sx={{ mb: 1 }}>
                <InputLabel>Optimization style</InputLabel>
                <Select value={method} label="Optimization style" onChange={(e) => setMethod(e.target.value)}>
                  <MenuItem value="mean_variance">Balanced growth (Mean–Variance)</MenuItem>
                  <MenuItem value="risk_parity">Share risk evenly (Risk Parity)</MenuItem>
                  <MenuItem value="minimum_variance">Lowest swings (Min Variance)</MenuItem>
                  <MenuItem value="black_litterman">Market + views (Black–Litterman)</MenuItem>
                  <MenuItem value="monte_carlo">Explore many mixes (Monte Carlo)</MenuItem>
                </Select>
              </FormControl>
              <Paper variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: 'action.hover' }}>
                <Typography variant="subtitle2">{methodHelp.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {methodHelp.plain}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Best when: {methodHelp.when}
                </Typography>
              </Paper>
            </CardContent>
          </Card>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="h6">3. Weight constraints</Typography>
                <Tooltip title="Limits how small or large each stock’s share can be">
                  <HelpOutline fontSize="small" color="action" />
                </Tooltip>
              </Box>

              <Alert severity="success" variant="outlined" sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  What is this, in simple words?
                </Typography>
                <Typography variant="body2">
                  Without constraints, the computer may put <strong>most of your money in one stock</strong>{' '}
                  that looked great in the past. Weight constraints are your guardrails: “don’t put less than
                  X% or more than Y% in this name.”
                </Typography>
              </Alert>

              <Accordion disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2">How to use it (step by step)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" component="div">
                    <ol style={{ margin: 0, paddingLeft: 18 }}>
                      <li>Turn the switch ON.</li>
                      <li>
                        Pick a ready-made preset (easiest), or set Min/Max % yourself for each stock.
                      </li>
                      <li>
                        Example: Min 5% / Max 30% means every stock gets at least a small slice, and none can
                        become more than ~⅓ of the portfolio.
                      </li>
                      <li>
                        Tip: Min values across all stocks must add up to ≤ 100%. If you set Min 40% on three
                        stocks, that is already 120% — impossible.
                      </li>
                    </ol>
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <FormControlLabel
                control={
                  <Switch
                    checked={useConstraints}
                    onChange={(e) => {
                      setUseConstraints(e.target.checked);
                      setConstraintError('');
                    }}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      Use weight constraints
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Recommended for retail investors who want built-in diversification
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', mb: 2, ml: 0 }}
              />

              {useConstraints && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Ready-made presets
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {CONSTRAINT_PRESETS.map((preset) => (
                      <Tooltip key={preset.id} title={preset.hint}>
                        <span>
                          <Chip
                            label={preset.label}
                            onClick={() => symbols.length && applyPreset(preset)}
                            disabled={!symbols.length}
                            clickable
                            color="secondary"
                            variant="outlined"
                            sx={{ height: 36, '& .MuiChip-label': { px: 1.5 } }}
                          />
                        </span>
                      </Tooltip>
                    ))}
                  </Box>

                  {constraintError && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      {constraintError}
                    </Alert>
                  )}

                  {!symbols.length ? (
                    <Typography variant="body2" color="text.secondary">
                      Add stocks above to edit min/max percentages.
                    </Typography>
                  ) : (
                    symbols.map((symbol) => {
                      const min = Number(minWeights[symbol] ?? 0);
                      const max = Number(maxWeights[symbol] ?? 40);
                      return (
                        <Box
                          key={symbol}
                          sx={{
                            mb: 2.5,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: 'action.hover',
                            overflow: 'visible',
                          }}
                        >
                          <Typography variant="body2" fontWeight={600} gutterBottom noWrap>
                            {symbol}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                            Allowed share: {min}% → {max}% of your portfolio
                          </Typography>
                          {/* Inset so the thumbs at 0% and 100% stay inside the tinted box. */}
                          <Box sx={{ px: 1.5 }}>
                            <Slider
                              value={[min, max]}
                              min={0}
                              max={100}
                              valueLabelDisplay="auto"
                              aria-label={`${symbol} allowed weight range`}
                              onChange={(_e, value) => {
                                const [lo, hi] = value;
                                setMinWeights((prev) => ({ ...prev, [symbol]: lo }));
                                setMaxWeights((prev) => ({ ...prev, [symbol]: hi }));
                              }}
                              sx={{
                                mb: 1,
                                // Bigger thumbs / taller rail are far easier to hit with a thumb.
                                '@media (pointer: coarse)': {
                                  '& .MuiSlider-thumb': { width: 22, height: 22 },
                                  py: 1.5,
                                },
                              }}
                            />
                          </Box>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <TextField
                                label="Min %"
                                type="number"
                                size="small"
                                fullWidth
                                value={min}
                                onChange={(e) =>
                                  setMinWeights({ ...minWeights, [symbol]: Number(e.target.value) })
                                }
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <TextField
                                label="Max %"
                                type="number"
                                size="small"
                                fullWidth
                                value={max}
                                onChange={(e) =>
                                  setMaxWeights({ ...maxWeights, [symbol]: Number(e.target.value) })
                                }
                              />
                            </Grid>
                          </Grid>
                        </Box>
                      );
                    })
                  )}
                </Box>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleOptimize}
                disabled={loading || symbols.length < 2}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <TrendingUp />}
                sx={{ mt: 1 }}
              >
                {loading ? 'Running deep optimization…' : 'Optimize portfolio'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={7} sx={{ minWidth: 0 }}>
          {!uiResult ? (
            <Card sx={{ minHeight: 420 }}>
              <CardContent>
                <Box textAlign="center" py={6} px={2}>
                  <Assessment sx={{ fontSize: 56, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Your deep analysis will appear here
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420, mx: 'auto' }}>
                    After you optimize, you will see allocation charts, concentration risk, rupee impact,
                    Sharpe quality, and a comparison vs a simple equal-weight mix — so you can decide with
                    confidence, not jargon.
                  </Typography>
                  <Divider sx={{ my: 3 }} />
                  <Grid container spacing={2} textAlign="left">
                    {[
                      'Expected return & volatility in plain ₹ terms',
                      'Diversification / concentration score',
                      'Bar chart: optimized vs equal weights',
                      'Actionable tips (when to use constraints)',
                    ].map((item) => (
                      <Grid item xs={12} sm={6} key={item}>
                        <Typography variant="body2" color="text.secondary">
                          • {item}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Box>
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={2}
                    gap={2}
                    flexWrap="wrap"
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6">Optimization results</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {METHOD_HELP[method]?.title} · {riskTolerance} risk
                        {useConstraints ? ' · constraints on' : ''}
                      </Typography>
                    </Box>
                    <Button variant="contained" startIcon={<Save />} onClick={() => setSaveDialogOpen(true)}>
                      Save portfolio
                    </Button>
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6} md={3}>
                      <MetricCard
                        label="Expected return / yr"
                        value={formatPct(uiResult.expected_return)}
                        hint={`≈ ${formatCurrency(analysis.expectedGain)} on your amount`}
                        color="success.main"
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <MetricCard
                        label="Volatility (risk)"
                        value={formatPct(uiResult.volatility)}
                        hint={`≈ ±${formatCurrency(analysis.swing1sd)} typical swing`}
                        color="error.main"
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <MetricCard
                        label="Sharpe ratio"
                        value={uiResult.sharpe_ratio.toFixed(2)}
                        hint={`${analysis.sharpeLabel} risk-adjusted quality`}
                        color="primary.main"
                      />
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <MetricCard
                        label="Diversification"
                        value={`${analysis.diversificationScore}/100`}
                        hint={`Effective holdings ≈ ${analysis.effectiveN.toFixed(1)}`}
                        color="secondary.main"
                      />
                    </Grid>
                  </Grid>

                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Diversification score
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={analysis.diversificationScore}
                    sx={{ height: 8, borderRadius: 4, mb: 2 }}
                  />

                  {(method === 'monte_carlo' &&
                    (result?.metadata?.num_simulations || result?.num_simulations)) && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      Monte Carlo picked the best mix from{' '}
                      {(result.metadata?.num_simulations || result.num_simulations).toLocaleString()} random
                      portfolios for your {riskTolerance} risk preference.
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Grid container spacing={3} sx={{ mb: 3 }}>
                {analysis.insights.map((insight) => (
                  <Grid item xs={12} md={6} key={insight.title}>
                    <InsightCard {...insight} />
                  </Grid>
                ))}
              </Grid>

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Suggested allocation
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={5}>
                      <ResponsiveContainer width="100%" height={isMobile ? 220 : 260}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={isMobile ? 45 : 55}
                            outerRadius={isMobile ? 75 : 90}
                            paddingAngle={2}
                          >
                            {pieData.map((entry, index) => (
                              <Cell
                                key={entry.full}
                                fill={seriesColors[index % seriesColors.length]}
                                stroke={theme.palette.background.paper}
                              />
                            ))}
                          </Pie>
                          <RechartsTooltip
                            contentStyle={chartTooltipStyle}
                            itemStyle={{ color: theme.palette.text.primary }}
                            formatter={(value, _n, props) => [
                              `${value}% (${formatCurrency(props.payload.amount)})`,
                              props.payload.full,
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </Grid>
                    <Grid item xs={12} md={7} sx={{ minWidth: 0 }}>
                      <ScrollableTable minWidth={useConstraints ? 460 : 340}>
                        <TableHead>
                          <TableRow>
                            <TableCell>Symbol</TableCell>
                            <TableCell align="right">Weight</TableCell>
                            <TableCell align="right">Amount</TableCell>
                            {useConstraints && <TableCell align="right">Your limits</TableCell>}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {Object.entries(uiResult.weights)
                            .sort((a, b) => b[1] - a[1])
                            .map(([symbol, weight]) => (
                              <TableRow key={symbol}>
                                <TableCell>{symbol}</TableCell>
                                <TableCell align="right">{formatPct(weight)}</TableCell>
                                <TableCell align="right">
                                  {isCompact
                                    ? formatCurrencyCompact(uiResult.allocation[symbol])
                                    : formatCurrency(uiResult.allocation[symbol])}
                                </TableCell>
                                {useConstraints && (
                                  <TableCell align="right">
                                    {minWeights[symbol] ?? 0}%–{maxWeights[symbol] ?? 100}%
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                        </TableBody>
                      </ScrollableTable>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Optimized vs equal-weight (deep compare)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Equal-weight means splitting money evenly. The optimizer tilts toward names that historically
                    improved the risk/return trade-off — within your constraints, if any.
                  </Typography>
                  <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
                    <BarChart data={analysis.vsEqual} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={theme.palette.divider}
                      />
                      <XAxis
                        dataKey="symbol"
                        tick={axisTick}
                        stroke={theme.palette.divider}
                        interval={0}
                        angle={isCompact ? -35 : 0}
                        textAnchor={isCompact ? 'end' : 'middle'}
                        height={isCompact ? 52 : 30}
                      />
                      <YAxis
                        tick={axisTick}
                        stroke={theme.palette.divider}
                        width={isMobile ? 34 : 48}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <RechartsTooltip
                        cursor={{ fill: alpha(theme.palette.text.primary, 0.06) }}
                        contentStyle={chartTooltipStyle}
                        itemStyle={{ color: theme.palette.text.primary }}
                        formatter={(value, name) => [`${value}%`, name === 'optimized' ? 'Optimized' : 'Equal']}
                      />
                      <Bar
                        dataKey="equal"
                        name="Equal"
                        fill={theme.palette.grey[400]}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="optimized"
                        name="Optimized"
                        fill={theme.palette.info.main}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Stress lens (illustrative)
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Not a forecast. Rough planning picture using volatility as a yardstick for a tough year
                    (~1.5× typical swing). Real markets can do worse or better.
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <MetricCard
                        label="Starting capital"
                        value={formatCurrency(investmentAmount)}
                        hint="Your input amount"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <MetricCard
                        label="Expected (model)"
                        value={formatCurrency(investmentAmount + analysis.expectedGain)}
                        hint="After ~1 year if expected return plays out"
                        color="success.main"
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <MetricCard
                        label="Tough-year sketch"
                        value={formatCurrency(analysis.roughBadYear)}
                        hint="Capital after a rough 1.5σ drawdown-style year"
                        color="warning.main"
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          )}
        </Grid>
      </Grid>

      <ResponsiveDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        title="Save this portfolio"
        subtitle="It will show up under My Portfolios"
        maxWidth="sm"
        actions={
          <>
            <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSavePortfolio}
              variant="contained"
              disabled={!portfolioName.trim()}
            >
              Save
            </Button>
          </>
        }
      >
        <TextField
          fullWidth
          required
          label="Portfolio name"
          value={portfolioName}
          onChange={(e) => setPortfolioName(e.target.value)}
          sx={{ mb: 2, mt: 1 }}
        />
        <TextField
          fullWidth
          label="Notes (optional)"
          multiline
          rows={3}
          value={portfolioDescription}
          onChange={(e) => setPortfolioDescription(e.target.value)}
        />
      </ResponsiveDialog>
    </Box>
  );
}
