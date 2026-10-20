import { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Link,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Insights,
  Public,
  Timeline as TimelineIcon,
  TrendingUp,
} from '@mui/icons-material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getCompanyResearch } from '../../../api/research.api';
import StockSearchAutocomplete from '../../../components/stocks/StockSearchAutocomplete';
import PageHeader from '../../../components/common/PageHeader';
import LoadingState from '../../../components/common/LoadingState';
import ErrorState from '../../../components/common/ErrorState';
import EmptyState from '../../../components/common/EmptyState';
import { getApiErrorMessage } from '../../../shared/utils/apiError';
import { formatCurrency, formatNumber, formatPercent } from '../../../shared/utils/formatters';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';

const QUICK = [
  { label: 'Reliance', symbol: 'RELIANCE.NS' },
  { label: 'TCS', symbol: 'TCS.NS' },
  { label: 'HDFC Bank', symbol: 'HDFCBANK.NS' },
  { label: 'Infosys', symbol: 'INFY.NS' },
  { label: 'Tata Motors', symbol: 'TATAMOTORS.NS' },
];

function pctRatio(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return formatPercent(Number(value) * 100, digits);
}

function scoreColor(score) {
  if (score >= 70) return 'success.main';
  if (score >= 50) return 'warning.main';
  return 'error.main';
}

function PillarBar({ label, score }) {
  const s = Math.round(Number(score) || 0);
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" fontWeight={700} sx={{ color: scoreColor(s) }}>
          {s}/100
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={s}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: scoreColor(s) },
        }}
      />
    </Box>
  );
}

function MetricTile({ label, value, hint }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ my: 0.5, wordBreak: 'break-word' }}
      >
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {hint}
        </Typography>
      )}
    </Paper>
  );
}

function formatCompactInr(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  const abs = Math.abs(n);
  if (abs >= 1e12) return `₹${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return formatCurrency(n);
}

export default function CompanyResearchPage() {
  const theme = useTheme();
  const isMobile = useIsMobile();
  const [symbol, setSymbol] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runResearch = useCallback(async (sym) => {
    if (!sym) return;
    setSymbol(sym);
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const data = await getCompanyResearch(sym);
      setReport(data);
    } catch (err) {
      setError(
        getApiErrorMessage(
          err,
          'Could not build the research pack. Prefer liquid NSE names with 1+ year of history.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const snap = report?.snapshot;
  const score = report?.scorecard;
  const growth = report?.growth;
  const quality = report?.quality;
  const year = report?.year_in_review;
  const priceSeries = (year?.price_series || []).map((p) => ({
    date: p.date,
    close: p.close,
  }));
  const fundBars = (growth?.series?.revenue || []).map((row, i) => ({
    year: row.date?.slice(0, 4) || `Y${i}`,
    revenue: row.value,
    profit: growth?.series?.net_income?.[i]?.value ?? null,
  }));

  // Recharts renders raw SVG, so it needs explicit palette values to stay
  // readable when the app switches to dark mode.
  const axisTick = { fontSize: 11, fill: theme.palette.text.secondary };
  const chartTooltipStyle = {
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 8,
    color: theme.palette.text.primary,
  };

  return (
    <Box>
      <PageHeader
        title="Company Research"
        subtitle="Institutional-style pack for one company — growth, year in review, events, and global context"
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pick one company
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Search any NSE/BSE name. We pull live prices, multi-year fundamentals, scorecards, and
            volume-event timelines. Optional Finnhub key unlocks curated news + earnings dates.
          </Typography>
          <StockSearchAutocomplete
            selectedSymbols={symbol ? [symbol] : []}
            onSelect={(sym) => runResearch(sym)}
            label="Search company"
            placeholder="Reliance, TCS, HDFC Bank…"
          />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            {QUICK.map((q) => (
              <Button
                key={q.symbol}
                size="small"
                variant={symbol === q.symbol ? 'contained' : 'outlined'}
                onClick={() => runResearch(q.symbol)}
                disabled={loading}
              >
                {q.label}
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>

      {loading && <LoadingState message="Building end-to-end research pack…" />}
      {error && !loading && <ErrorState message={error} onRetry={() => symbol && runResearch(symbol)} />}
      {!loading && !error && !report && (
        <EmptyState
          title="No company selected yet"
          description="Choose a stock above to generate a full research report — scorecard, growth drivers, 1-year actions, and global context."
        />
      )}

      {report && !loading && (
        <Box>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" flexWrap="wrap" justifyContent="space-between" gap={2}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h5" fontWeight={700} sx={{ wordBreak: 'break-word' }}>
                    {report.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {report.symbol} · {snap?.exchange} · {snap?.sector_guess}
                  </Typography>
                  <Box display="flex" alignItems="baseline" flexWrap="wrap" gap={1} mt={1}>
                    <Typography variant="h4" fontWeight={700}>
                      {formatCurrency(snap?.price)}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ color: (snap?.change_percent || 0) >= 0 ? 'success.main' : 'error.main' }}
                    >
                      {snap?.change_percent != null
                        ? `${snap.change_percent >= 0 ? '+' : ''}${formatNumber(snap.change_percent, 2)}%`
                        : ''}
                    </Typography>
                  </Box>
                </Box>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    // A hard minWidth pushes this tile off-screen on a 360px
                    // phone, so only reserve width once there is room.
                    minWidth: { xs: 0, sm: 160 },
                    flex: { xs: '1 1 100%', sm: '0 0 auto' },
                    textAlign: 'center',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Overall score
                  </Typography>
                  <Typography variant="h3" fontWeight={800} sx={{ color: scoreColor(score?.overall) }}>
                    {Math.round(score?.overall || 0)}
                  </Typography>
                  <Chip size="small" label={score?.overall_label || '—'} color="primary" variant="outlined" />
                </Paper>
              </Box>
              <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                As of {new Date(report.as_of).toLocaleString('en-IN')} · Educational research, not advice
              </Typography>
            </CardContent>
          </Card>

          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 3 }}>
            <Grid item xs={12} md={5}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Scorecard pillars
                  </Typography>
                  <PillarBar label="Growth" score={score?.pillars?.growth} />
                  <PillarBar label="Quality" score={score?.pillars?.quality} />
                  <PillarBar label="Momentum" score={score?.pillars?.momentum} />
                  <PillarBar label="Risk resilience" score={score?.pillars?.risk_resilience} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={7}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Price — last 1 year
                  </Typography>
                  <ResponsiveContainer width="100%" height={isMobile ? 200 : 240}>
                    <LineChart data={priceSeries}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke={theme.palette.divider}
                      />
                      <XAxis dataKey="date" hide />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={axisTick}
                        stroke={theme.palette.divider}
                        width={isMobile ? 52 : 60}
                      />
                      <RechartsTooltip
                        formatter={(v) => [formatCurrency(v), 'Close']}
                        labelFormatter={(l) => l}
                        contentStyle={chartTooltipStyle}
                      />
                      <Line
                        type="monotone"
                        dataKey="close"
                        stroke={theme.palette.secondary.main}
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <TrendingUp color="primary" />
                    <Typography variant="h6">Growth outlook</Typography>
                    <Chip size="small" label={growth?.label} />
                  </Box>
                  <Typography variant="body2" sx={{ mb: 2, maxWidth: '68ch' }}>
                    {growth?.verdict}
                  </Typography>
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <MetricTile label="Revenue CAGR" value={pctRatio(growth?.metrics?.revenue_cagr)} />
                    </Grid>
                    <Grid item xs={6}>
                      <MetricTile label="Profit YoY" value={pctRatio(growth?.metrics?.net_income_yoy)} />
                    </Grid>
                    <Grid item xs={6}>
                      <MetricTile label="EPS CAGR" value={pctRatio(growth?.metrics?.eps_cagr)} />
                    </Grid>
                    <Grid item xs={6}>
                      <MetricTile label="FCF YoY" value={pctRatio(growth?.metrics?.fcf_yoy)} />
                    </Grid>
                  </Grid>
                  <Typography variant="subtitle2" gutterBottom>
                    Drivers
                  </Typography>
                  <List dense>
                    {(growth?.drivers || []).map((d) => (
                      <ListItem key={d} sx={{ py: 0.25 }}>
                        <ListItemText primary={d} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Financial health
                  </Typography>
                  <Chip size="small" label={quality?.label} sx={{ mb: 2 }} />
                  <Grid container spacing={1} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <MetricTile
                        label="Trailing P/E"
                        value={
                          quality?.ratios?.trailing_pe != null
                            ? formatNumber(quality.ratios.trailing_pe, 1)
                            : '—'
                        }
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <MetricTile
                        label="P/B"
                        value={
                          quality?.ratios?.trailing_pb != null
                            ? formatNumber(quality.ratios.trailing_pb, 2)
                            : '—'
                        }
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <MetricTile
                        label="Debt / Equity"
                        value={
                          quality?.ratios?.debt_to_equity != null
                            ? formatNumber(quality.ratios.debt_to_equity, 2)
                            : '—'
                        }
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <MetricTile label="ROE" value={pctRatio(quality?.ratios?.roe)} />
                    </Grid>
                    <Grid item xs={6}>
                      <MetricTile
                        label="Market cap"
                        value={formatCompactInr(quality?.ratios?.market_cap)}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <MetricTile
                        label="Free cash flow"
                        value={formatCompactInr(quality?.ratios?.free_cash_flow)}
                      />
                    </Grid>
                  </Grid>
                  {(quality?.notes || []).map((n) => (
                    <Typography
                      key={n}
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.75, maxWidth: '68ch' }}
                    >
                      • {n}
                    </Typography>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {fundBars.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Annual revenue vs profit
                </Typography>
                <ResponsiveContainer width="100%" height={isMobile ? 220 : 260}>
                  <BarChart data={fundBars}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={theme.palette.divider}
                    />
                    <XAxis
                      dataKey="year"
                      tick={axisTick}
                      stroke={theme.palette.divider}
                    />
                    <YAxis
                      tickFormatter={(v) => `${(v / 1e9).toFixed(0)}B`}
                      tick={axisTick}
                      stroke={theme.palette.divider}
                      width={isMobile ? 44 : 50}
                    />
                    <RechartsTooltip
                      formatter={(v, name) => [formatCompactInr(v), name === 'revenue' ? 'Revenue' : 'Profit']}
                      contentStyle={chartTooltipStyle}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill={theme.palette.secondary.main}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="profit"
                      name="Profit"
                      fill={theme.palette.success.main}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <TimelineIcon color="primary" />
                <Typography variant="h6">Last 1 year — what the market did</Typography>
              </Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} md={3}>
                  <MetricTile label="Total return" value={pctRatio(year?.total_return)} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <MetricTile label="Volatility" value={pctRatio(year?.volatility)} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <MetricTile label="Max drawdown" value={pctRatio(year?.max_drawdown)} />
                </Grid>
                <Grid item xs={6} md={3}>
                  <MetricTile
                    label="Vs Nifty (excess)"
                    value={pctRatio(year?.vs_nifty?.excess_return)}
                    hint={
                      year?.vs_nifty
                        ? `Stock ${pctRatio(year.vs_nifty.stock_return)} · Nifty ${pctRatio(year.vs_nifty.nifty_return)}`
                        : undefined
                    }
                  />
                </Grid>
              </Grid>
              <Typography variant="subtitle2" gutterBottom>
                Notable actions / volume events
              </Typography>
              <List dense>
                {(year?.year_actions || []).map((a, idx) => (
                  <ListItem key={`${a.date}-${idx}`} alignItems="flex-start" divider>
                    <ListItemText
                      primary={`${a.date || '—'} · ${a.title}`}
                      secondary={a.detail}
                    />
                  </ListItem>
                ))}
                {!year?.year_actions?.length && (
                  <Typography variant="body2" color="text.secondary">
                    No unusual volume spikes detected in the sample window.
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>

          <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Upcoming / watchpoints
                  </Typography>
                  {(report.upcoming_events || []).map((e, i) => (
                    <Box key={`${e.title}-${i}`} sx={{ mb: 1.5 }}>
                      <Typography variant="subtitle2">
                        {e.date ? `${e.date} · ` : ''}
                        {e.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {e.detail}
                      </Typography>
                      <Divider sx={{ mt: 1 }} />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Public color="primary" />
                    <Typography variant="h6">Global / market context</Typography>
                  </Box>
                  <Chip size="small" label={report.global_impact?.sector} sx={{ mb: 1 }} />
                  {(report.global_impact?.narrative || []).map((n) => (
                    <Typography
                      key={n}
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1.25, maxWidth: '68ch' }}
                    >
                      • {n}
                    </Typography>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {report.news?.length > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent news
                </Typography>
                <List>
                  {report.news.map((n, i) => (
                    <ListItem key={`${n.headline}-${i}`} divider>
                      <ListItemText
                        primary={
                          n.url ? (
                            <Link
                              href={n.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ wordBreak: 'break-word' }}
                            >
                              {n.headline}
                            </Link>
                          ) : (
                            n.headline
                          )
                        }
                        secondary={`${n.date || ''} · ${n.source || ''}`}
                        primaryTypographyProps={{ sx: { wordBreak: 'break-word' } }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          )}

          <Alert severity="info" icon={<Insights />} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Data coverage
            </Typography>
            <Typography variant="body2" component="div">
              <strong>Included:</strong> {(report.data_coverage?.available || []).join(' · ')}
            </Typography>
            <Typography variant="body2" component="div" sx={{ mt: 1 }}>
              <strong>Limited:</strong> {(report.data_coverage?.limited || []).join(' · ')}
            </Typography>
            {(report.data_coverage?.needs_from_you || []).length > 0 && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>From you (optional):</strong>{' '}
                {report.data_coverage.needs_from_you.join(' ')}
              </Typography>
            )}
          </Alert>
          <Alert severity="warning">{report.disclaimer}</Alert>
        </Box>
      )}
    </Box>
  );
}
