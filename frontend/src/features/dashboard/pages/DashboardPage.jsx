import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Assessment,
  Security,
  Timeline,
  Add,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '../../auth/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import useDashboardData from '../hooks/useDashboardData';
import LoadingState from '../../../components/common/LoadingState';
import EmptyState from '../../../components/common/EmptyState';
import StatCard from '../../../components/common/StatCard';
import { useIsCompact } from '../../../shared/hooks/useIsMobile';
import {
  formatCurrency,
  formatCurrencyCompact,
  formatNumber,
  safeNumber,
} from '../../../shared/utils/formatters';
import { ROUTES } from '../../../shared/constants/routes';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCompact = useIsCompact();
  const {
    portfolios,
    stats,
    marketData,
    marketOpen,
    marketDataTimestamp,
    loading,
    error,
    refresh,
  } = useDashboardData();

  if (loading) {
    return <LoadingState message="Loading dashboard…" />;
  }

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        mb={3}
        flexWrap="wrap"
        gap={2}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome back, {user?.username}!
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Here&apos;s your portfolio overview and market snapshot
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button variant="outlined" startIcon={<Refresh />} onClick={refresh}>
            Refresh
          </Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => navigate(ROUTES.OPTIMIZE)}>
            Create Portfolio
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mb: 4 }}>
        <Grid item xs={6} md={3}>
          <StatCard
            label="Total Portfolios"
            value={stats?.totalPortfolios || 0}
            icon={<AccountBalance fontSize="small" />}
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <StatCard
            label="Total Value"
            value={
              isCompact
                ? formatCurrencyCompact(stats?.totalValue)
                : formatCurrency(stats?.totalValue)
            }
            icon={<Assessment fontSize="small" />}
            help="Combined value of every holding across your portfolios"
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <StatCard
            label="Total Return"
            value={
              isCompact
                ? formatCurrencyCompact(stats?.totalReturn)
                : formatCurrency(stats?.totalReturn)
            }
            caption={`${formatNumber(stats?.totalReturnPercent)}%`}
            icon={<Timeline fontSize="small" />}
            color={safeNumber(stats?.totalReturn) >= 0 ? 'success.main' : 'error.main'}
          />
        </Grid>

        <Grid item xs={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: { xs: 1.75, sm: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <Security fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                >
                  Performance
                </Typography>
              </Box>
              <Typography variant="body2" color="success.main" noWrap>
                Best: {stats?.bestPerformer || '—'}
              </Typography>
              <Typography variant="body2" color="error.main" noWrap>
                Worst: {stats?.worstPerformer || '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} sx={{ minWidth: 0 }}>
          <Card sx={{ minWidth: 0 }}>
            <CardContent sx={{ minWidth: 0 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
                flexWrap="wrap"
                gap={1}
              >
                <Typography variant="h6">Market Overview</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Chip
                    label={marketOpen ? 'Market Open' : 'Market Close'}
                    size="small"
                    color={marketOpen ? 'success' : 'default'}
                    variant="outlined"
                  />
                  {marketDataTimestamp && (
                    <Typography variant="caption" color="text.secondary">
                      {marketDataTimestamp.toLocaleTimeString('en-IN')}
                    </Typography>
                  )}
                </Box>
              </Box>
              {marketData.length === 0 ? (
                <Typography color="text.secondary">No index data available.</Typography>
              ) : (
                <Box
                  sx={(theme) => ({
                    display: 'flex',
                    gap: 2,
                    minWidth: 0,
                    overflowX: 'auto',
                    pb: 1,
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch',
                    '&::-webkit-scrollbar': { height: 6 },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: alpha(theme.palette.text.primary, 0.2),
                      borderRadius: 3,
                    },
                  })}
                >
                  {marketData.map((metric) => {
                    const up = metric.change > 0;
                    const flat = metric.change === 0;
                    return (
                      <Box
                        key={metric.symbol}
                        sx={{
                          minWidth: { xs: 160, sm: 180 },
                          maxWidth: 220,
                          flex: '0 0 auto',
                          scrollSnapAlign: 'start',
                          p: 2,
                          borderRadius: 2,
                          bgcolor: 'action.hover',
                          border: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight={700} noWrap>
                          {metric.name}
                        </Typography>
                        <Typography variant="h6" sx={{ mt: 0.5 }}>
                          {formatNumber(metric.price)}
                        </Typography>
                        <Chip
                          size="small"
                          icon={flat ? undefined : up ? <TrendingUp /> : <TrendingDown />}
                          label={
                            flat
                              ? '0.00%'
                              : `${up ? '+' : ''}${formatNumber(metric.change)} (${up ? '+' : ''}${formatNumber(metric.change_percent)}%)`
                          }
                          color={flat ? 'default' : up ? 'success' : 'error'}
                          sx={{ mt: 1 }}
                        />
                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                          as of {metric.as_of_date}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Your Portfolios
              </Typography>
              {!portfolios || portfolios.length === 0 ? (
                <EmptyState
                  title="No portfolios found"
                  description="Create your first portfolio to get started!"
                  actionLabel="Create Portfolio"
                  onAction={() => navigate(ROUTES.OPTIMIZE)}
                />
              ) : (
                <List>
                  {portfolios.slice(0, 5).map((portfolio) => (
                    <ListItem
                      key={portfolio.id}
                      sx={{ cursor: 'pointer', gap: 1, px: { xs: 0, sm: 2 } }}
                      onClick={() => navigate(ROUTES.PORTFOLIOS)}
                    >
                      <ListItemText
                        sx={{ minWidth: 0, my: 0 }}
                        primaryTypographyProps={{ noWrap: true }}
                        secondaryTypographyProps={{ noWrap: true }}
                        primary={portfolio.name}
                        secondary={`${portfolio.holdings?.length || 0} assets • ${(isCompact
                          ? formatCurrencyCompact
                          : formatCurrency)(
                          portfolio.holdings?.reduce(
                            (sum, holding) =>
                              sum +
                              (holding.quantity || 0) * (holding.avg_purchase_price || 0),
                            0
                          ) || 0
                        )}`}
                      />
                      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {new Date(portfolio.created_at).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                  {portfolios.length > 5 && (
                    <ListItem>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => navigate(ROUTES.PORTFOLIOS)}
                      >
                        View All Portfolios
                      </Button>
                    </ListItem>
                  )}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
