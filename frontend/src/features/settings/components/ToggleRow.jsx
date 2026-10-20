import { Box, Switch, Typography } from '@mui/material';

/**
 * Label + explanation on the left, switch on the right. `dimmed` fades the row
 * without disabling it, so a user can still change a preference that currently
 * has no effect.
 */
export default function ToggleRow({ label, description, checked, onChange, dimmed = false }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        py: 1.25,
        opacity: dimmed ? 0.6 : 1,
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>

      <Switch
        checked={Boolean(checked)}
        onChange={(event) => onChange(event.target.checked)}
        inputProps={{ 'aria-label': label }}
        sx={{ flexShrink: 0, mt: -0.25 }}
      />
    </Box>
  );
}
