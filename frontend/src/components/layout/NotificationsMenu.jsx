import { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  NotificationsNone as NotificationIcon,
  MarkEmailRead as MarkReadIcon,
  DeleteSweep as ClearIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../app/NotificationsContext';
import { formatRelativeTime } from '../../shared/utils/formatters';

const SEVERITY_COLOR = {
  success: 'success.main',
  warning: 'warning.main',
  error: 'error.main',
  info: 'info.main',
};

export default function NotificationsMenu() {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const { items, unreadCount, markRead, markAllRead, clearAll, refresh } = useNotifications();

  const open = Boolean(anchorEl);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    refresh();
  };

  const handleSelect = (notification) => {
    if (!notification.is_read) markRead(notification.id);
    setAnchorEl(null);
    if (notification.link) navigate(notification.link);
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton onClick={handleOpen} aria-label="Notifications" color="inherit">
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <NotificationIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              width: { xs: 'calc(100vw - 32px)', sm: 380 },
              maxWidth: 380,
              maxHeight: '70vh',
              mt: 1,
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Notifications
            {unreadCount > 0 && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                {unreadCount} unread
              </Typography>
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {unreadCount > 0 && (
              <Tooltip title="Mark all as read">
                <IconButton size="small" onClick={markAllRead}>
                  <MarkReadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {items.length > 0 && (
              <Tooltip title="Clear all">
                <IconButton size="small" onClick={clearAll}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        <Divider />

        {items.length === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              You&apos;re all caught up. Alerts about saved portfolios, IPOs and performance appear
              here.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {items.map((item) => (
              <ListItemButton
                key={item.id}
                onClick={() => handleSelect(item)}
                alignItems="flex-start"
                sx={{
                  borderLeft: '3px solid',
                  borderColor: item.is_read
                    ? 'transparent'
                    : SEVERITY_COLOR[item.severity] ?? 'info.main',
                  bgcolor: item.is_read ? 'transparent' : 'action.hover',
                  py: 1.25,
                }}
              >
                <ListItemText
                  primary={item.title}
                  secondary={
                    <>
                      {item.body && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {item.body}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.disabled">
                        {formatRelativeTime(item.created_at)}
                        {item.email_sent ? ' · emailed' : ''}
                      </Typography>
                    </>
                  }
                  primaryTypographyProps={{
                    fontSize: '0.875rem',
                    fontWeight: item.is_read ? 500 : 700,
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        )}

        <Divider />
        <Box sx={{ p: 1 }}>
          <Button
            fullWidth
            size="small"
            onClick={() => {
              setAnchorEl(null);
              navigate('/settings');
            }}
          >
            Notification settings
          </Button>
        </Box>
      </Popover>
    </>
  );
}
