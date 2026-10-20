import { Card, CardContent, Box, Typography, Tooltip } from '@mui/material';
import { InfoOutlined as InfoIcon } from '@mui/icons-material';

/**
 * Compact metric tile used across dashboards. Scales its type down on phones
 * so four of them still read cleanly in a 2x2 grid.
 */
export default function StatCard({
  label,
  value,
  caption,
  icon,
  color = 'text.primary',
  help,
  onClick,
}) {
  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%',
        ...(onClick ? { cursor: 'pointer' } : {}),
      }}
    >
      <CardContent sx={{ p: { xs: 1.75, sm: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          {icon && <Box sx={{ display: 'flex', color, mr: 0.25 }}>{icon}</Box>}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}
          >
            {label}
          </Typography>
          {help && (
            <Tooltip title={help}>
              <InfoIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            </Tooltip>
          )}
        </Box>

        <Typography
          sx={{
            fontWeight: 700,
            color,
            lineHeight: 1.25,
            fontSize: { xs: '1.25rem', sm: '1.5rem' },
            wordBreak: 'break-word',
          }}
        >
          {value}
        </Typography>

        {caption && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {caption}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
