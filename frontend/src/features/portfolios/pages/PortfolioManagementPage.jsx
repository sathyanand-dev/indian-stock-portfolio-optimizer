import { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Alert,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Chip,
  Fab,
  Menu,
  MenuItem as MenuItemComponent
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  Add,
  Edit,
  Delete,
  Visibility,
  MoreVert,
  TrendingUp,
  TrendingDown,
  Assessment
} from "@mui/icons-material";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import apiService from '../../../api';
import { getApiErrorMessage } from '../../../shared/utils/apiError';
import {
  enrichPortfolioAnalytics,
  portfolioDisplayValue,
  asRatio,
} from '../../../shared/utils/analyticsDisplay';
import LoadingState from '../../../components/common/LoadingState';
import PageHeader from '../../../components/common/PageHeader';
import ResponsiveDialog from '../../../components/common/ResponsiveDialog';
import ScrollableTable from '../../../components/common/ScrollableTable';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import { ROUTES } from '../../../shared/constants/routes';

/** Pie slice colours, resolved from the active (light or dark) palette. */
const chartColors = (theme) => [
  theme.palette.primary.main,
  theme.palette.info.main,
  theme.palette.success.main,
  theme.palette.error.main,
  theme.palette.warning.main,
  theme.palette.secondary.main
];
const PortfolioManagementPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useIsMobile();
  const sliceColors = chartColors(theme);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editInvestmentAmount, setEditInvestmentAmount] = useState(0);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [menuPortfolioId, setMenuPortfolioId] = useState(null);
  useEffect(() => {
    fetchPortfolios();
  }, []);
  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      setError("");
      const portfolioData = await apiService.getPortfolios();
      const portfolios2 = Array.isArray(portfolioData) ? portfolioData : [];
      const portfoliosWithAnalytics = await Promise.all(
        portfolios2.map(async (portfolio) => {
          try {
            const analytics = enrichPortfolioAnalytics(
              await apiService.getPortfolioAnalytics(portfolio.id),
            );
            return { ...portfolio, analytics };
          } catch {
            // Keep portfolio without invented analytics metrics
            return { ...portfolio, analytics: null };
          }
        })
      );
      setPortfolios(portfoliosWithAnalytics);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to fetch portfolios"));
      setPortfolios([]);
    } finally {
      setLoading(false);
    }
  };
  const handleEditClick = (portfolio) => {
    setSelectedPortfolio(portfolio);
    setEditName(portfolio.name);
    setEditDescription(portfolio.description || "");
    const totalValue = portfolio.holdings?.reduce(
      (sum, holding) => sum + (holding.quantity || 0) * (holding.avg_purchase_price || 0),
      0
    ) || 0;
    setEditInvestmentAmount(totalValue);
    setEditDialogOpen(true);
    setMenuAnchorEl(null);
  };
  const handleDeleteClick = (portfolio) => {
    setSelectedPortfolio(portfolio);
    setDeleteDialogOpen(true);
    setMenuAnchorEl(null);
  };
  const handleViewClick = (portfolio) => {
    setSelectedPortfolio(portfolio);
    setViewDialogOpen(true);
    setMenuAnchorEl(null);
  };
  const handleUpdatePortfolio = async () => {
    if (!selectedPortfolio) return;
    try {
      const updateData = {
        name: editName,
        description: editDescription,
        investment_amount: editInvestmentAmount > 0 ? editInvestmentAmount : undefined,
      };
      await apiService.updatePortfolio(selectedPortfolio.id, updateData);
      setEditDialogOpen(false);
      fetchPortfolios();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update portfolio"));
    }
  };
  const handleDeletePortfolio = async () => {
    if (!selectedPortfolio) return;
    try {
      await apiService.deletePortfolio(selectedPortfolio.id);
      setDeleteDialogOpen(false);
      fetchPortfolios();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to delete portfolio"));
    }
  };
  const handleMenuClick = (event, portfolioId) => {
    setMenuAnchorEl(event.currentTarget);
    setMenuPortfolioId(portfolioId);
  };
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuPortfolioId(null);
  };
  const formatCurrency = (amount) => {
    if (isNaN(amount) || amount === null || amount === void 0) {
      return "\u20B90";
    }
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  const formatPercentage = (value) => {
    if (isNaN(value) || value === null || value === void 0) {
      return "0%";
    }
    return `${(value * 100).toFixed(2)}%`;
  };
  const getPerformanceColor = (value) => {
    return value >= 0 ? "success.main" : "error.main";
  };
  const getPieChartData = (portfolio) => {
    if (!portfolio.holdings || portfolio.holdings.length === 0) {
      return [];
    }
    return portfolio.holdings.map((holding, index) => ({
      name: holding.symbol,
      value: holding.weight * 100,
      color: sliceColors[index % sliceColors.length]
    }));
  };
  if (loading) {
    return <LoadingState message="Loading portfolios…" />;
  }
  return <Box>
      <PageHeader
        title="My Portfolios"
        subtitle="Manage and monitor your investment portfolios"
        actions={
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate(ROUTES.OPTIMIZE)}
            size="large"
          >
            Optimize new portfolio
          </Button>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>}

      {!portfolios || portfolios.length === 0 ? <Card>
          <CardContent>
            <Box textAlign="center" py={8}>
              <Assessment sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Portfolios Found
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Create your first portfolio to get started with portfolio optimization
              </Typography>
              <Button
    variant="contained"
    startIcon={<Add />}
    onClick={() => navigate(ROUTES.OPTIMIZE)}
  >
                Create Your First Portfolio
              </Button>
            </Box>
          </CardContent>
        </Card> : <Grid container spacing={3}>
          {portfolios && portfolios.map((portfolio) => <Grid item xs={12} sm={6} lg={4} key={portfolio.id}>
              <Card sx={{ height: "100%", display: "flex", flexDirection: "column", minWidth: 0 }}>
                <CardContent sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={2}>
                    <Typography variant="h6" component="h2" noWrap sx={{ minWidth: 0 }}>
                      {portfolio.name}
                    </Typography>
                    <IconButton
    aria-label={`Actions for ${portfolio.name}`}
    onClick={(e) => handleMenuClick(e, portfolio.id)}
    sx={{ flexShrink: 0, mt: -0.5, mr: -1 }}
  >
                      <MoreVert />
                    </IconButton>
                  </Box>

                  {portfolio.description && <Typography variant="body2" color="text.secondary" gutterBottom>
                      {portfolio.description}
                    </Typography>}

                  {
    /* Optimization Metadata */
  }
                  {(portfolio.optimization_method || portfolio.expected_return || portfolio.sharpe_ratio) && <Box mb={2} p={1} sx={{ bgcolor: "action.hover", borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                        Optimization Data
                      </Typography>
                      {portfolio.optimization_method && <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                          Method: {portfolio.optimization_method.replace("_", " ").toUpperCase()}
                        </Typography>}
                      {portfolio.expected_return && <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                          Expected Return: {formatPercentage(portfolio.expected_return)}
                        </Typography>}
                      {portfolio.expected_volatility && <Typography variant="body2" sx={{ fontSize: "0.75rem" }}>
                          Expected Risk: {formatPercentage(portfolio.expected_volatility)}
                        </Typography>}
                    </Box>}

                  {
    /* Portfolio Metrics */
  }
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Portfolio value
                    </Typography>
                    <Typography variant="h6">
                      {formatCurrency(portfolioDisplayValue(portfolio))}
                    </Typography>
                      {portfolio.analytics?.performance_analysis && <Box display="flex" alignItems="center" mt={1}>
                        {(asRatio(portfolio.analytics.performance_analysis.total_return_percentage ?? portfolio.analytics.performance_analysis.total_return) || 0) >= 0 ? <TrendingUp sx={{ color: "success.main", mr: 1 }} /> : <TrendingDown sx={{ color: "error.main", mr: 1 }} />}
                        <Typography
    variant="body2"
    sx={{ color: getPerformanceColor(asRatio(portfolio.analytics.performance_analysis.total_return_percentage ?? portfolio.analytics.performance_analysis.total_return) || 0) }}
  >
                          {formatPercentage(asRatio(portfolio.analytics.performance_analysis.total_return_percentage ?? portfolio.analytics.performance_analysis.total_return) || 0)} total return
                        </Typography>
                      </Box>}
                  </Box>

                  {
    /* Asset Count */
  }
                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Assets
                    </Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {portfolio.holdings && portfolio.holdings.slice(0, 3).map((holding) => <Chip key={holding.symbol} label={holding.symbol} size="small" />)}
                      {portfolio.holdings && portfolio.holdings.length > 3 && <Chip
    label={`+${portfolio.holdings.length - 3} more`}
    size="small"
    variant="outlined"
  />}
                    </Box>
                  </Box>

                  {
    /* Risk Metrics */
  }
                  {portfolio.analytics?.performance_analysis && <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Sharpe Ratio
                        </Typography>
                        <Typography variant="body1">
                          {portfolio.analytics.performance_analysis.sharpe_ratio && !isNaN(portfolio.analytics.performance_analysis.sharpe_ratio) ? portfolio.analytics.performance_analysis.sharpe_ratio.toFixed(2) : "N/A"}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Volatility
                        </Typography>
                        <Typography variant="body1">
                          {portfolio.analytics.performance_analysis.volatility && !isNaN(portfolio.analytics.performance_analysis.volatility) ? formatPercentage(portfolio.analytics.performance_analysis.volatility) : "N/A"}
                        </Typography>
                      </Grid>
                    </Grid>}

                  {
    /* Creation Date */
  }
                  <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                    Created: {new Date(portfolio.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>)}
        </Grid>}

      {
    /* Action Menu */
  }
      <Menu
    anchorEl={menuAnchorEl}
    open={Boolean(menuAnchorEl)}
    onClose={handleMenuClose}
    slotProps={{ paper: { sx: { minWidth: 200 } } }}
  >
        <MenuItemComponent
    onClick={() => {
      const portfolio = portfolios.find((p) => p.id === menuPortfolioId);
      if (portfolio) handleViewClick(portfolio);
    }}
    sx={{ minHeight: 48, gap: 1 }}
  >
          <Visibility fontSize="small" />
          View Details
        </MenuItemComponent>
        <MenuItemComponent
    onClick={() => {
      const portfolio = portfolios.find((p) => p.id === menuPortfolioId);
      if (portfolio) handleEditClick(portfolio);
    }}
    sx={{ minHeight: 48, gap: 1 }}
  >
          <Edit fontSize="small" />
          Edit Portfolio
        </MenuItemComponent>
        <MenuItemComponent
    onClick={() => {
      const portfolio = portfolios.find((p) => p.id === menuPortfolioId);
      if (portfolio) handleDeleteClick(portfolio);
    }}
    sx={{ color: "error.main", minHeight: 48, gap: 1 }}
  >
          <Delete fontSize="small" />
          Delete Portfolio
        </MenuItemComponent>
      </Menu>

      {
    /* View Portfolio Dialog */
  }
      <ResponsiveDialog
    open={viewDialogOpen}
    onClose={() => setViewDialogOpen(false)}
    title="Portfolio Details"
    subtitle={selectedPortfolio?.name}
    maxWidth="md"
    actions={<Button onClick={() => setViewDialogOpen(false)}>Close</Button>}
  >
          {selectedPortfolio && <Grid container spacing={3}>
              <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
                <Typography variant="h6" gutterBottom>
                  Asset Allocation
                </Typography>
                <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
                  <PieChart>
                    <Pie
    data={getPieChartData(selectedPortfolio)}
    cx="50%"
    cy="50%"
    labelLine={false}
    label={isMobile ? false : ({ name, value }) => `${name}: ${(value || 0).toFixed(1)}%`}
    outerRadius={isMobile ? 90 : 80}
    dataKey="value"
  >
                      {getPieChartData(selectedPortfolio).map((entry, index) => <Cell key={`cell-${index}`} fill={sliceColors[index % sliceColors.length]} stroke={theme.palette.background.paper} />)}
                    </Pie>
                    <Tooltip
    formatter={(value, name) => [`${(value || 0).toFixed(1)}%`, name]}
    contentStyle={{
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: 8,
      color: theme.palette.text.primary
    }}
    itemStyle={{ color: theme.palette.text.primary }}
  />
                  </PieChart>
                </ResponsiveContainer>
              </Grid>

              <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
                <Typography variant="h6" gutterBottom>
                  Holdings
                </Typography>
                <ScrollableTable minWidth={420}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Symbol</TableCell>
                      <TableCell align="right">Weight</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Avg Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedPortfolio.holdings?.map((holding) => <TableRow key={holding.symbol}>
                        <TableCell>{holding.symbol}</TableCell>
                        <TableCell align="right">{formatPercentage(holding.weight)}</TableCell>
                        <TableCell align="right">{holding.quantity || "N/A"}</TableCell>
                        <TableCell align="right">
                          {holding.avg_purchase_price ? formatCurrency(holding.avg_purchase_price) : "N/A"}
                        </TableCell>
                      </TableRow>) || <TableRow>
                        <TableCell colSpan={4} align="center">No holdings data</TableCell>
                      </TableRow>}
                  </TableBody>
                </ScrollableTable>
              </Grid>
            </Grid>}
      </ResponsiveDialog>

      {
    /* Edit Portfolio Dialog */
  }
      <ResponsiveDialog
    open={editDialogOpen}
    onClose={() => setEditDialogOpen(false)}
    title="Edit Portfolio"
    subtitle={selectedPortfolio?.name}
    maxWidth="sm"
    actions={<>
      <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
      <Button onClick={handleUpdatePortfolio} variant="contained">
        Update Portfolio
      </Button>
    </>}
  >
          <TextField
    fullWidth
    label="Portfolio Name"
    value={editName}
    onChange={(e) => setEditName(e.target.value)}
    sx={{ mb: 2, mt: 1 }}
  />
          <TextField
    fullWidth
    label="Description"
    multiline
    rows={3}
    value={editDescription}
    onChange={(e) => setEditDescription(e.target.value)}
    sx={{ mb: 2 }}
  />
          <TextField
    fullWidth
    label="Investment Amount (₹)"
    type="number"
    value={editInvestmentAmount}
    onChange={(e) => setEditInvestmentAmount(Number(e.target.value))}
  />
      </ResponsiveDialog>

      {
    /* Delete Confirmation Dialog */
  }
      <ResponsiveDialog
    open={deleteDialogOpen}
    onClose={() => setDeleteDialogOpen(false)}
    title="Delete Portfolio"
    maxWidth="xs"
    actions={<>
      <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
      <Button onClick={handleDeletePortfolio} color="error" variant="contained">
        Delete
      </Button>
    </>}
  >
          <Typography>
            Are you sure you want to delete &quot;{selectedPortfolio?.name}&quot;? This action cannot be undone.
          </Typography>
      </ResponsiveDialog>

      {
    /* Floating Action Button for Quick Create */
  }
      <Fab
    color="primary"
    aria-label="Optimize new portfolio"
    sx={{
      position: "fixed",
      // Clear the fixed mobile bottom navigation bar.
      bottom: { xs: 76, md: 24 },
      right: { xs: 16, md: 24 }
    }}
    onClick={() => navigate(ROUTES.OPTIMIZE)}
  >
        <Add />
      </Fab>
    </Box>;
};
var PortfolioManagementPage_default = PortfolioManagementPage;
export {
  PortfolioManagementPage_default as default
};
