import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Typography,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useIsMobile } from '../../shared/hooks/useIsMobile';

/**
 * Dialog that goes full-screen on phones (with a close button in the header)
 * and stays a centred modal on larger screens.
 */
export default function ResponsiveDialog({
  open,
  onClose,
  title,
  subtitle,
  actions,
  maxWidth = 'md',
  children,
  ...rest
}) {
  const isMobile = useIsMobile();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth={maxWidth}
      {...rest}
    >
      {title && (
        <DialogTitle
          component="div"
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1,
            pr: 1,
            position: isMobile ? 'sticky' : 'static',
            top: 0,
            zIndex: 1,
            bgcolor: 'background.paper',
            borderBottom: isMobile ? '1px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {onClose && (
            <IconButton onClick={onClose} aria-label="Close" edge="end">
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
      )}

      <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>{children}</DialogContent>

      {actions && (
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            gap: 1,
            flexWrap: 'wrap',
            position: isMobile ? 'sticky' : 'static',
            bottom: 0,
            bgcolor: 'background.paper',
            borderTop: isMobile ? '1px solid' : 'none',
            borderColor: 'divider',
            // Clear the iOS home indicator.
            pb: isMobile ? 'calc(16px + env(safe-area-inset-bottom))' : 2,
          }}
        >
          {actions}
        </DialogActions>
      )}
    </Dialog>
  );
}
