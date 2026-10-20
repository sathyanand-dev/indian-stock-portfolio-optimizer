import { Box, Paper, Table, TableContainer, Typography } from '@mui/material';
import { SwipeLeft as SwipeIcon } from '@mui/icons-material';
import { useIsMobile } from '../../shared/hooks/useIsMobile';

/**
 * Wraps a wide table so it scrolls horizontally instead of overflowing the
 * viewport, with a one-line hint on touch screens.
 *
 * Set `surface={false}` when placing this inside an existing Card or Paper,
 * otherwise the outlined container draws a second border.
 *
 * @param {{ minWidth?: number, hint?: boolean, surface?: boolean, children: React.ReactNode }} props
 */
export default function ScrollableTable({
  minWidth = 640,
  hint = true,
  surface = true,
  size,
  stickyHeader,
  children,
  sx,
  ...rest
}) {
  const isMobile = useIsMobile();

  return (
    <Box>
      <TableContainer
        {...(surface ? { component: Paper, variant: 'outlined' } : {})}
        sx={{ ...(surface ? { borderRadius: 2 } : {}), ...sx }}
        {...rest}
      >
        <Table size={size ?? (isMobile ? 'small' : 'medium')} stickyHeader={stickyHeader} sx={{ minWidth }}>
          {children}
        </Table>
      </TableContainer>

      {hint && isMobile && (
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.75, color: 'text.secondary' }}
        >
          <SwipeIcon sx={{ fontSize: 14 }} />
          <Typography variant="caption">Swipe the table sideways to see all columns</Typography>
        </Box>
      )}
    </Box>
  );
}
