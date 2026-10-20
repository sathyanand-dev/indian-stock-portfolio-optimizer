import { Box, Typography } from '@mui/material';

export default function PageHeader({ title, subtitle, actions }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: { xs: 1.5, sm: 2 },
        mb: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ minWidth: 0, flex: '1 1 260px' }}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom={Boolean(subtitle)}
          sx={{ fontSize: { xs: '1.5rem', sm: '2rem' } }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography
            variant="subtitle1"
            color="text.secondary"
            sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1,
            alignItems: 'center',
            width: { xs: '100%', sm: 'auto' },
          }}
        >
          {actions}
        </Box>
      )}
    </Box>
  );
}
