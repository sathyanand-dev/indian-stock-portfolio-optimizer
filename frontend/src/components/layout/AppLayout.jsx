import { useEffect, useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  TrendingUp as OptimizeIcon,
  Analytics as AnalyticsIcon,
  Assessment as BacktestIcon,
  AccountBalance as PortfolioIcon,
  DataObject as DataIcon,
  Security as RiskIcon,
  TravelExplore as ResearchIcon,
  RocketLaunch as IpoIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../features/auth/context/AuthContext';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import LiveIndexTicker from '../market/LiveIndexTicker';
import NotificationsMenu from './NotificationsMenu';
import ThemeToggleButton from './ThemeToggleButton';
import MobileBottomNav, { BOTTOM_NAV_HEIGHT } from './MobileBottomNav';
import { ROUTES } from '../../shared/constants/routes';

const drawerWidth = 240;
const tickerHeight = 36;
const appBarHeightDesktop = 70;
const appBarHeightMobile = 56;

const MENU_ITEMS = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: ROUTES.DASHBOARD },
  { text: 'Optimize', icon: <OptimizeIcon />, path: ROUTES.OPTIMIZE },
  { text: 'My Portfolios', icon: <PortfolioIcon />, path: ROUTES.PORTFOLIOS },
  { text: 'Analytics', icon: <AnalyticsIcon />, path: ROUTES.ANALYTICS },
  { text: 'Risk Analysis', icon: <RiskIcon />, path: ROUTES.RISK_ANALYSIS },
  { text: 'Backtesting', icon: <BacktestIcon />, path: ROUTES.BACKTEST },
  { text: 'Market Data', icon: <DataIcon />, path: ROUTES.MARKET_DATA },
  { text: 'Company Research', icon: <ResearchIcon />, path: ROUTES.RESEARCH },
  { text: 'IPO Analysis', icon: <IpoIcon />, path: ROUTES.IPO },
  { text: 'Settings', icon: <SettingsIcon />, path: ROUTES.SETTINGS },
];

export default function AppLayout() {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const appBarHeight = isMobile ? appBarHeightMobile : appBarHeightDesktop;
  const currentPage =
    MENU_ITEMS.find((item) => location.pathname === item.path)?.text || 'Dashboard';

  useEffect(() => {
    document.title = `${currentPage} · Portfolio Optimizer`;
  }, [currentPage]);

  const handleLogout = () => {
    setAccountAnchor(null);
    logout();
    navigate(ROUTES.LOGIN);
  };

  const go = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        sx={{
          background: 'linear-gradient(135deg, #2C3E50 0%, #34495E 100%)',
          color: 'common.white',
          minHeight: '80px !important',
          px: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #3498DB 0%, #2980B9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <OptimizeIcon sx={{ color: 'common.white' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, fontSize: '1rem' }}>
              Portfolio
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Optimizer
            </Typography>
          </Box>
        </Box>
      </Toolbar>

      <Divider />

      <List sx={{ flex: 1, px: 1, py: 2, overflowY: 'auto' }}>
        {MENU_ITEMS.map((item) => {
          const selected =
            location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={selected}
                onClick={() => go(item.path)}
                sx={{
                  borderRadius: 2,
                  '&.Mui-selected': {
                    bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.14),
                    color: 'secondary.main',
                    '& .MuiListItemIcon-root': { color: 'secondary.main' },
                    '&:hover': {
                      bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.2),
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{ minWidth: 40, color: selected ? 'secondary.main' : 'text.secondary' }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontWeight: selected ? 600 : 500,
                    fontSize: '0.9rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider />

      <Box sx={{ p: 1, pb: 'calc(8px + env(safe-area-inset-bottom))' }}>
        <ListItem disablePadding>
          <ListItemButton onClick={() => go(ROUTES.SETTINGS)} sx={{ borderRadius: 2 }}>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Avatar
                src={user?.avatar_url || undefined}
                sx={{ width: 28, height: 28, bgcolor: 'secondary.main', fontSize: '0.75rem' }}
              >
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </Avatar>
            </ListItemIcon>
            <ListItemText
              primary={user?.full_name || user?.username || 'Profile'}
              secondary={user?.email}
              primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600, noWrap: true }}
              secondaryTypographyProps={{ fontSize: '0.7rem', noWrap: true }}
            />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, color: 'error.main' }}>
            <ListItemIcon sx={{ minWidth: 40, color: 'error.main' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" primaryTypographyProps={{ fontWeight: 500 }} />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  const drawerPaperSx = {
    boxSizing: 'border-box',
    width: drawerWidth,
    top: tickerHeight,
    height: `calc(100% - ${tickerHeight}px)`,
    border: 'none',
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: (theme) => theme.zIndex.drawer + 2,
        }}
      >
        <LiveIndexTicker />
      </Box>

      <AppBar
        position="fixed"
        sx={{
          top: tickerHeight,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar
          sx={{
            minHeight: { xs: `${appBarHeightMobile}px !important`, md: `${appBarHeightDesktop}px !important` },
            px: { xs: 1, sm: 2 },
            gap: 0.5,
          }}
        >
          <IconButton
            color="inherit"
            aria-label="Open navigation"
            edge="start"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 0.5, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1rem', md: '1.25rem' },
                // Navy reads well on white but vanishes on a dark bar, so the
                // gradient flips to light tones in dark mode.
                background: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #E6EDF3 0%, #5DADE2 100%)'
                    : 'linear-gradient(135deg, #2C3E50 0%, #3498DB 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
                {currentPage}
              </Box>
              <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                Indian Stock Portfolio Optimizer
              </Box>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, sm: 0.5 } }}>
            <ThemeToggleButton />
            <NotificationsMenu />
            <Tooltip title="Account">
              <IconButton
                onClick={(event) => setAccountAnchor(event.currentTarget)}
                aria-label="Account menu"
                sx={{ ml: { xs: 0, sm: 0.5 } }}
              >
                <Avatar
                  src={user?.avatar_url || undefined}
                  sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: '0.8rem' }}
                >
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={accountAnchor}
        open={Boolean(accountAnchor)}
        onClose={() => setAccountAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { minWidth: 220, mt: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
            {user?.full_name || user?.username}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {user?.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setAccountAnchor(null);
            navigate(ROUTES.SETTINGS);
          }}
        >
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': drawerPaperSx,
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              ...drawerPaperSx,
              borderRight: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          px: { xs: 1.5, sm: 2.5, md: 3 },
          pb: { xs: `calc(${BOTTOM_NAV_HEIGHT}px + 24px + env(safe-area-inset-bottom))`, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          pt: { xs: `${appBarHeightMobile + tickerHeight + 16}px`, md: `${appBarHeightDesktop + tickerHeight + 24}px` },
        }}
      >
        <Outlet />
      </Box>

      <MobileBottomNav onMore={() => setMobileOpen(true)} />
    </Box>
  );
}
