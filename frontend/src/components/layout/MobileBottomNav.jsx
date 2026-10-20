import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as OptimizeIcon,
  AccountBalance as PortfolioIcon,
  DataObject as DataIcon,
  MoreHoriz as MoreIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../shared/constants/routes';

const ITEMS = [
  { label: 'Home', icon: <DashboardIcon />, path: ROUTES.DASHBOARD },
  { label: 'Optimize', icon: <OptimizeIcon />, path: ROUTES.OPTIMIZE },
  { label: 'Portfolios', icon: <PortfolioIcon />, path: ROUTES.PORTFOLIOS },
  { label: 'Markets', icon: <DataIcon />, path: ROUTES.MARKET_DATA },
];

export const BOTTOM_NAV_HEIGHT = 60;

/**
 * Thumb-reachable navigation for the four most-used pages, with "More"
 * opening the full drawer. Rendered only below the `md` breakpoint.
 */
export default function MobileBottomNav({ onMore }) {
  const navigate = useNavigate();
  const location = useLocation();

  const activeIndex = ITEMS.findIndex((item) => location.pathname === item.path);

  return (
    <Paper
      elevation={3}
      square
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        borderTop: '1px solid',
        borderColor: 'divider',
        pb: 'env(safe-area-inset-bottom)',
        display: { xs: 'block', md: 'none' },
      }}
    >
      <BottomNavigation
        showLabels
        value={activeIndex === -1 ? false : activeIndex}
        sx={{ height: BOTTOM_NAV_HEIGHT, bgcolor: 'transparent' }}
      >
        {ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={item.icon}
            onClick={() => navigate(item.path)}
            sx={{ minWidth: 0, '& .MuiBottomNavigationAction-label': { fontSize: '0.68rem' } }}
          />
        ))}
        <BottomNavigationAction
          label="More"
          icon={<MoreIcon />}
          onClick={onMore}
          sx={{ minWidth: 0, '& .MuiBottomNavigationAction-label': { fontSize: '0.68rem' } }}
        />
      </BottomNavigation>
    </Paper>
  );
}
