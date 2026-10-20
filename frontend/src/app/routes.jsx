import { lazy, Suspense } from 'react';
import { Box, CircularProgress, LinearProgress } from '@mui/material';
import { Navigate, Outlet, useRoutes } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext';
import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import { ROUTES } from '../shared/constants/routes';

// Feature pages are code-split so a phone on a mobile connection only downloads
// the screen it is opening. Auth pages stay eager — they are the entry point.
const DashboardPage = lazy(() => import('../features/dashboard/pages/DashboardPage'));
const OptimizationPage = lazy(() => import('../features/optimization/pages/OptimizationPage'));
const PortfolioManagementPage = lazy(
  () => import('../features/portfolios/pages/PortfolioManagementPage'),
);
const AnalyticsPage = lazy(() => import('../features/analytics/pages/AnalyticsPage'));
const RiskAnalysisPage = lazy(() => import('../features/risk/pages/RiskAnalysisPage'));
const BacktestingPage = lazy(() => import('../features/backtesting/pages/BacktestingPage'));
const MarketDataPage = lazy(() => import('../features/market-data/pages/MarketDataPage'));
const CompanyResearchPage = lazy(() => import('../features/research/pages/CompanyResearchPage'));
const IpoAnalysisPage = lazy(() => import('../features/ipo/pages/IpoAnalysisPage'));
const SettingsPage = lazy(() => import('../features/settings/pages/SettingsPage'));

function AuthLoading() {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <CircularProgress />
    </Box>
  );
}

/** Thin top-of-page bar while a lazy route chunk loads. */
function RouteFallback() {
  return (
    <Box sx={{ py: 6 }}>
      <LinearProgress />
    </Box>
  );
}

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AuthLoading />;
  return isAuthenticated ? <Outlet /> : <Navigate to={ROUTES.LOGIN} replace />;
}

function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AuthLoading />;
  return !isAuthenticated ? <Outlet /> : <Navigate to={ROUTES.DASHBOARD} replace />;
}

const lazyRoute = (path, Component) => ({
  path,
  element: (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  ),
});

export default function AppRoutes() {
  const element = useRoutes([
    {
      element: <PublicRoute />,
      children: [
        { path: ROUTES.LOGIN, element: <LoginPage /> },
        { path: ROUTES.REGISTER, element: <RegisterPage /> },
      ],
    },
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <AppLayout />,
          children: [
            lazyRoute(ROUTES.DASHBOARD, DashboardPage),
            lazyRoute(ROUTES.OPTIMIZE, OptimizationPage),
            lazyRoute(ROUTES.PORTFOLIOS, PortfolioManagementPage),
            lazyRoute(ROUTES.ANALYTICS, AnalyticsPage),
            lazyRoute(ROUTES.RISK_ANALYSIS, RiskAnalysisPage),
            lazyRoute(ROUTES.BACKTEST, BacktestingPage),
            lazyRoute(ROUTES.MARKET_DATA, MarketDataPage),
            lazyRoute(ROUTES.RESEARCH, CompanyResearchPage),
            lazyRoute(ROUTES.IPO, IpoAnalysisPage),
            lazyRoute(ROUTES.SETTINGS, SettingsPage),
          ],
        },
      ],
    },
    { path: '/', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
    { path: '*', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
  ]);

  return element;
}
