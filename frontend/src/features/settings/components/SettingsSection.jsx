import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';

/** Collapsible settings group with an icon, title and one-line explanation. */
export default function SettingsSection({
  icon,
  title,
  subtitle,
  defaultExpanded = false,
  children,
}) {
  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      elevation={0}
      sx={{
        mb: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        overflow: 'hidden',
        '&::before': { display: 'none' },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ px: { xs: 2, sm: 3 }, py: 1, '& .MuiAccordionSummary-content': { minWidth: 0 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <Box sx={{ display: 'flex', color: 'primary.main' }}>{icon}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6">{title}</Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ px: { xs: 2, sm: 3 }, pt: 0, pb: 3 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
