import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Cancel,
  CheckCircle,
  HelpOutline,
  RocketLaunch,
  TrendingUp,
  WarningAmber,
} from '@mui/icons-material';
import { getIpo, getIpoAnalysis, listIpos } from '../../../api/ipo.api';
import PageHeader from '../../../components/common/PageHeader';
import LoadingState from '../../../components/common/LoadingState';
import ErrorState from '../../../components/common/ErrorState';
import EmptyState from '../../../components/common/EmptyState';
import ResponsiveDialog from '../../../components/common/ResponsiveDialog';
import { getApiErrorMessage } from '../../../shared/utils/apiError';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from '../../../shared/utils/formatters';

const STATUS_TABS = [
  { label: 'Open', value: 'open' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Recently closed', value: 'closed' },
];

function scoreColor(score) {
  if (score >= 70) return 'success.main';
  if (score >= 50) return 'warning.main';
  return 'error.main';
}

function scoreChipColor(score) {
  if (score >= 70) return 'success';
  if (score >= 50) return 'warning';
  return 'error';
}

function formatSubscription(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${formatNumber(Number(value), 2)}×`;
}

function formatPriceBand(ipo) {
  if (ipo.price_band) return ipo.price_band;
  const low = ipo.issue_price_low;
  const high = ipo.issue_price_high;
  if (low != null && high != null) {
    return `${formatCurrency(low)} – ${formatCurrency(high)}`;
  }
  if (ipo.issue_price != null) return formatCurrency(ipo.issue_price);
  return '—';
}

function statusChipColor(status) {
  if (status === 'open') return 'success';
  if (status === 'upcoming') return 'info';
  if (status === 'closed') return 'default';
  return 'default';
}

function categoryLabel(category) {
  if (category === 'mainboard') return 'Mainboard';
  if (category === 'sme') return 'SME';
  return 'IPO';
}

function SubscriptionBar({ label, value, max = 100 }) {
  const times = Number(value) || 0;
  const pct = max > 0 ? Math.min((times / max) * 100, 100) : 0;
  return (
    <Box sx={{ mb: 2, minWidth: 0 }}>
      <Box display="flex" justifyContent="space-between" alignItems="baseline" gap={1} mb={0.5}>
        <Typography variant="body2" sx={{ minWidth: 0 }}>
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={700} sx={{ flexShrink: 0 }}>
          {formatSubscription(times)}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 10,
          borderRadius: 5,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: 'secondary.main' },
        }}
      />
    </Box>
  );
}

function PillarBar({ label, score }) {
  const s = Math.round(Number(score) || 0);
  return (
    <Box sx={{ mb: 1.5, minWidth: 0 }}>
      <Box display="flex" justifyContent="space-between" alignItems="baseline" gap={1} mb={0.5}>
        <Typography variant="body2" sx={{ minWidth: 0 }}>
          {label}
        </Typography>
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ color: scoreColor(s), flexShrink: 0 }}
        >
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

function ChecklistIcon({ status }) {
  if (status === 'pass' || status === 'ok' || status === 'good') {
    return <CheckCircle color="success" fontSize="small" />;
  }
  if (status === 'fail' || status === 'bad' || status === 'risk') {
    return <Cancel color="error" fontSize="small" />;
  }
  if (status === 'warn' || status === 'caution') {
    return <WarningAmber color="warning" fontSize="small" />;
  }
  return <HelpOutline color="disabled" fontSize="small" />;
}

function IpoCard({ ipo, onSelect }) {
  const analysis = ipo.analysis;
  const score = analysis?.overall_score;
  const gmp = ipo.gmp;

  return (
    <Card elevation={0} sx={{ height: '100%' }}>
      <CardActionArea onClick={() => onSelect(ipo.symbol)} sx={{ height: '100%', alignItems: 'flex-start' }}>
        <CardContent sx={{ width: '100%' }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Box flex={1} minWidth={0}>
              <Typography variant="h6" fontWeight={700} noWrap>
                {ipo.company_name || ipo.symbol}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {ipo.symbol}
              </Typography>
            </Box>
            <Box display="flex" flexWrap="wrap" gap={0.5} justifyContent="flex-end">
              <Chip
                size="small"
                label={categoryLabel(ipo.category)}
                variant="outlined"
              />
              {score != null && (
                <Chip
                  size="small"
                  label={`${Math.round(score)}/100`}
                  color={scoreChipColor(score)}
                />
              )}
            </Box>
          </Box>

          <Box mt={1.5} display="flex" flexWrap="wrap" gap={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Price band
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                {formatPriceBand(ipo)}
              </Typography>
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="caption" color="text.secondary" display="block">
                Issue dates
              </Typography>
              <Typography variant="body2">
                {formatDate(ipo.issue_start_date)} – {formatDate(ipo.issue_end_date)}
              </Typography>
            </Box>
          </Box>

          <Box mt={1.5} display="flex" flexWrap="wrap" gap={1}>
            {ipo.subscription?.total != null && (
              <Chip
                size="small"
                icon={<TrendingUp />}
                label={`Subscribed ${formatSubscription(ipo.subscription.total)}`}
                color="info"
                variant="outlined"
              />
            )}
            {gmp?.available && gmp.price != null && (
              <Chip
                size="small"
                label={`GMP ${formatCurrency(gmp.price)} (${formatPercent(gmp.percentage ?? 0, 1)})`}
                color="warning"
                variant="outlined"
              />
            )}
            {analysis?.overall_label && (
              <Chip size="small" label={analysis.overall_label} color="primary" variant="outlined" />
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

/**
 * Two-column definition row that stacks the label above the value on phones,
 * where a 40%/60% split leaves neither column enough room.
 */
function DetailRow({ label, value }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 0.25, sm: 2 },
        py: 1.25,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 'none' },
      }}
    >
      <Typography
        component="dt"
        variant="body2"
        color="text.secondary"
        sx={{ fontWeight: 600, width: { xs: '100%', sm: '40%' }, flexShrink: 0 }}
      >
        {label}
      </Typography>
      <Typography
        component="dd"
        variant="body2"
        sx={{ m: 0, minWidth: 0, wordBreak: 'break-word' }}
      >
        {value ?? '—'}
      </Typography>
    </Box>
  );
}

function IpoDetailDialog({ symbol, open, onClose }) {
  const [ipo, setIpo] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDetail = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError('');
    try {
      const [ipoData, analysisData] = await Promise.all([
        getIpo(symbol),
        getIpoAnalysis(symbol).catch(() => null),
      ]);
      setIpo(ipoData);
      setAnalysis(analysisData?.analysis ?? analysisData ?? ipoData.analysis ?? null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load IPO details.'));
      setIpo(null);
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    if (open && symbol) {
      loadDetail();
    } else {
      setIpo(null);
      setAnalysis(null);
      setError('');
    }
  }, [open, symbol, loadDetail]);

  const subscription = ipo?.subscription;
  const gmp = ipo?.gmp;
  const subMax = Math.max(
    subscription?.qib ?? 0,
    subscription?.nii ?? 0,
    subscription?.retail ?? 0,
    subscription?.total ?? 0,
    1,
  );

  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      scroll="paper"
      title={ipo?.company_name || symbol}
      subtitle={ipo?.symbol || undefined}
      actions={
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      }
    >
      <Box>
        {loading && <LoadingState message="Loading IPO details…" minHeight={200} />}
        {!loading && error && <ErrorState message={error} onRetry={loadDetail} />}
        {!loading && !error && ipo && (
          <Box>
            <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
              <Chip
                size="small"
                label={(ipo.status || 'unknown').replace(/^./, (c) => c.toUpperCase())}
                color={statusChipColor(ipo.status)}
              />
              <Chip size="small" label={categoryLabel(ipo.category)} variant="outlined" />
              {analysis?.verdict && (
                <Chip size="small" label={analysis.verdict} color="secondary" />
              )}
              {analysis?.overall_score != null && (
                <Chip
                  size="small"
                  label={`Score ${Math.round(analysis.overall_score)}/100 — ${analysis.overall_label || ''}`}
                  color={scoreChipColor(analysis.overall_score)}
                />
              )}
            </Box>

            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              Key details
            </Typography>
            <Box
              component="dl"
              sx={{
                m: 0,
                mb: 3,
                px: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
              }}
            >
              <DetailRow label="Price band" value={formatPriceBand(ipo)} />
              <DetailRow label="Lot size" value={ipo.lot_size != null ? formatNumber(ipo.lot_size, 0) : null} />
              <DetailRow label="Min. investment" value={ipo.min_investment != null ? formatCurrency(ipo.min_investment) : null} />
              <DetailRow label="Face value" value={ipo.face_value != null ? formatCurrency(ipo.face_value) : null} />
              <DetailRow label="Issue size" value={ipo.issue_size_label || (ipo.issue_size_shares != null ? formatNumber(ipo.issue_size_shares, 0) : null)} />
              <DetailRow
                label="Issue period"
                value={`${formatDate(ipo.issue_start_date)} – ${formatDate(ipo.issue_end_date)}`}
              />
              <DetailRow label="Allotment date" value={formatDate(ipo.allotment_date)} />
              <DetailRow label="Listing date" value={formatDate(ipo.listing_date)} />
              <DetailRow label="Listing on" value={ipo.listing_on} />
              <DetailRow label="Registrar" value={ipo.registrar} />
            </Box>

            {subscription && (
              <>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Subscription (demand)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Higher subscription often means stronger demand, but it does not guarantee listing gains
                  or allotment for retail investors.
                </Typography>
                <SubscriptionBar label="QIB (institutional)" value={subscription.qib} max={subMax} />
                <SubscriptionBar label="NII (non-institutional)" value={subscription.nii} max={subMax} />
                <SubscriptionBar label="Retail" value={subscription.retail} max={subMax} />
                <SubscriptionBar label="Total" value={subscription.total} max={subMax} />
                {subscription.updated_at && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
                    Updated {formatDate(subscription.updated_at)}
                  </Typography>
                )}
              </>
            )}

            {gmp?.available && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Grey market premium (GMP)
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  GMP is an unofficial grey-market price signal, not exchange data. It can be wrong,
                  manipulated, or change quickly. Do not treat GMP as a promise of listing gains.
                </Alert>
                <Grid container spacing={{ xs: 1.5, sm: 2 }} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={4}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        height: '100%',
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                        bgcolor: (theme) => alpha(theme.palette.warning.main, 0.08),
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        GMP
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        color="warning.main"
                        sx={{ wordBreak: 'break-word' }}
                      >
                        {gmp.price != null ? formatCurrency(gmp.price) : '—'}
                      </Typography>
                      {gmp.percentage != null && (
                        <Typography variant="body2">{formatPercent(gmp.percentage, 1)}</Typography>
                      )}
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        height: '100%',
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Est. listing price
                      </Typography>
                      <Typography variant="h6" fontWeight={700} sx={{ wordBreak: 'break-word' }}>
                        {gmp.estimated_listing_price != null
                          ? formatCurrency(gmp.estimated_listing_price)
                          : '—'}
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        height: '100%',
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Est. listing gain
                      </Typography>
                      <Typography
                        variant="h6"
                        fontWeight={700}
                        color="success.main"
                        sx={{ wordBreak: 'break-word' }}
                      >
                        {gmp.estimated_listing_gain_pct != null
                          ? formatPercent(gmp.estimated_listing_gain_pct, 1)
                          : '—'}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </>
            )}

            {analysis && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Retail decision summary
                </Typography>

                {analysis.pillars && (
                  <Box sx={{ mb: 2 }}>
                    <PillarBar label="Demand" score={analysis.pillars.demand} />
                    <PillarBar label="Retail interest" score={analysis.pillars.retail_interest} />
                    <PillarBar label="Listing outlook" score={analysis.pillars.listing_outlook} />
                    <PillarBar label="Risk" score={analysis.pillars.risk} />
                  </Box>
                )}

                {analysis.listing_gains && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Expected listing gain (model estimate):{' '}
                    {analysis.listing_gains.expected_pct != null
                      ? formatPercent(analysis.listing_gains.expected_pct, 1)
                      : '—'}
                    {analysis.listing_gains.expected_rupees_per_share != null && (
                      <> ({formatCurrency(analysis.listing_gains.expected_rupees_per_share)} per share)</>
                    )}
                    {analysis.listing_gains.confidence && (
                      <> · Confidence: {analysis.listing_gains.confidence}</>
                    )}
                    {analysis.listing_gains.disclaimer && (
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        {analysis.listing_gains.disclaimer}
                      </Typography>
                    )}
                  </Alert>
                )}

                {analysis.strengths?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Strengths
                    </Typography>
                    <List dense disablePadding>
                      {analysis.strengths.map((item) => (
                        <ListItem key={item} disableGutters>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <CheckCircle color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={item} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {analysis.risks?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Risks
                    </Typography>
                    <List dense disablePadding>
                      {analysis.risks.map((item) => (
                        <ListItem key={item} disableGutters>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <WarningAmber color="warning" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={item} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {analysis.checklist?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Checklist
                    </Typography>
                    <List dense disablePadding>
                      {analysis.checklist.map((entry) => (
                        <ListItem key={entry.item} disableGutters alignItems="flex-start">
                          <ListItemIcon sx={{ minWidth: 32, mt: 0.25 }}>
                            <ChecklistIcon status={entry.status} />
                          </ListItemIcon>
                          <ListItemText
                            primary={entry.item}
                            secondary={entry.note}
                            primaryTypographyProps={{ fontWeight: 500 }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {analysis.recommendation_for_retail && (
                  <Alert severity="info" icon={<RocketLaunch />}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Recommendation for retail
                    </Typography>
                    {analysis.recommendation_for_retail}
                  </Alert>
                )}
              </>
            )}

            {!analysis && !loading && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Analysis is not available yet for this IPO. Check back closer to the issue dates.
              </Alert>
            )}
          </Box>
        )}
      </Box>
    </ResponsiveDialog>
  );
}

export default function IpoAnalysisPage() {
  const [tab, setTab] = useState(0);
  const [ipos, setIpos] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const status = STATUS_TABS[tab].value;

  const loadIpos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listIpos(status);
      setIpos(data.ipos || []);
      setMeta({ as_of: data.as_of, source: data.source, count: data.count });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load IPO list.'));
      setIpos([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadIpos();
  }, [loadIpos]);

  const handleSelect = (symbol) => {
    setSelectedSymbol(symbol);
    setDetailOpen(true);
  };

  const emptyMessages = {
    open: 'No IPOs are open for subscription right now.',
    upcoming: 'No upcoming IPOs scheduled at the moment.',
    closed: 'No recently closed IPOs to show.',
  };

  return (
    <Box>
      <PageHeader
        title="IPO Analysis"
        subtitle="Compare open and upcoming IPOs, subscription demand, and a plain-language view to help you decide whether to apply for allotment."
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        IPO investing carries risk. Subscription demand and grey-market premium (GMP) are signals only —
        they are not guarantees of profit or allotment.
      </Alert>

      <Paper
        elevation={0}
        variant="outlined"
        sx={{ mb: 3, borderRadius: 2 }}
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          {STATUS_TABS.map((t) => (
            <Tab key={t.value} label={t.label} />
          ))}
        </Tabs>
      </Paper>

      {meta?.as_of && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          Data as of {formatDate(meta.as_of)}
          {meta.source ? ` · Source: ${meta.source}` : ''}
          {meta.count != null ? ` · ${meta.count} IPO${meta.count === 1 ? '' : 's'}` : ''}
        </Typography>
      )}

      {loading && <LoadingState message="Fetching IPOs…" />}
      {!loading && error && <ErrorState message={error} onRetry={loadIpos} />}
      {!loading && !error && ipos.length === 0 && (
        <EmptyState
          title="No IPOs found"
          description={emptyMessages[status]}
          actionLabel="Refresh"
          onAction={loadIpos}
        />
      )}
      {!loading && !error && ipos.length > 0 && (
        <Grid container spacing={2}>
          {ipos.map((ipo) => (
            <Grid item xs={12} sm={6} lg={4} key={ipo.symbol}>
              <IpoCard ipo={ipo} onSelect={handleSelect} />
            </Grid>
          ))}
        </Grid>
      )}

      {!loading && !error && ipos.length > 0 && (
        <Box textAlign="center" mt={3}>
          <Button variant="outlined" onClick={loadIpos}>
            Refresh list
          </Button>
        </Box>
      )}

      <IpoDetailDialog
        symbol={selectedSymbol}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </Box>
  );
}
