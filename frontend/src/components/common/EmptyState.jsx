import { Box, Button, Typography } from '@mui/material';

export default function EmptyState({
  title = 'Nothing here yet',
  description,
  actionLabel,
  onAction,
}) {
  return (
    <Box textAlign="center" py={6} px={2}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography color="text.secondary" gutterBottom sx={{ mb: 2 }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button variant="contained" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
