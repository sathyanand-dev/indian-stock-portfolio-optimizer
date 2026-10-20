import {
  Box,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import {
  BrightnessAuto as AutoIcon,
  DarkMode as DarkIcon,
  LightMode as LightIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import SettingsSection from './SettingsSection';
import { usePreferences } from '../../../app/PreferencesContext';
import { useToast } from '../../../app/ToastContext';
import { getApiErrorMessage } from '../../../shared/utils/apiError';
import { formatCurrency, formatDate, formatNumber } from '../../../shared/utils/formatters';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: <LightIcon fontSize="small" /> },
  { value: 'dark', label: 'Dark', icon: <DarkIcon fontSize="small" /> },
  { value: 'auto', label: 'System', icon: <AutoIcon fontSize="small" /> },
];

const SELECTS = [
  {
    key: 'currency',
    label: 'Currency',
    helper: 'Applies to every amount shown across the app',
    options: [
      { value: 'INR', label: 'Indian Rupee (₹)' },
      { value: 'USD', label: 'US Dollar ($)' },
    ],
  },
  {
    key: 'number_format',
    label: 'Number format',
    helper: 'Digit grouping used for large numbers',
    options: [
      { value: 'indian', label: 'Indian — 1,23,456' },
      { value: 'international', label: 'International — 123,456' },
    ],
  },
  {
    key: 'date_format',
    label: 'Date format',
    helper: 'Applies to every date shown across the app',
    options: [
      { value: 'dd/MM/yyyy', label: 'dd/MM/yyyy' },
      { value: 'MM/dd/yyyy', label: 'MM/dd/yyyy' },
      { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd' },
    ],
  },
  {
    key: 'language',
    label: 'Language',
    helper: 'Interface language support is being rolled out; number and date formats apply immediately',
    options: [
      { value: 'en', label: 'English' },
      { value: 'hi', label: 'हिन्दी' },
      { value: 'ta', label: 'தமிழ்' },
    ],
  },
  {
    key: 'density',
    label: 'Density',
    helper: 'Saved to your account; tighter spacing is being rolled out screen by screen',
    options: [
      { value: 'comfortable', label: 'Comfortable' },
      { value: 'compact', label: 'Compact' },
    ],
  },
];

const PREVIEW_AMOUNT = 1234567;
const PREVIEW_NUMBER = 1234567.891;

export default function AppearanceSection() {
  const { preferences, savePreferences } = usePreferences();
  const { showError } = useToast();

  const update = (patch) => {
    savePreferences(patch).catch((err) => {
      showError(getApiErrorMessage(err, "Couldn't save that preference"));
    });
  };

  return (
    <SettingsSection
      icon={<PaletteIcon />}
      title="Appearance & formats"
      subtitle="Saved the moment you change them"
    >
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" gutterBottom>
            Theme
          </Typography>

          <ToggleButtonGroup
            exclusive
            color="primary"
            value={preferences.theme ?? 'light'}
            onChange={(event, value) => {
              if (value) update({ theme: value });
            }}
            aria-label="Theme"
            sx={{ flexWrap: 'wrap' }}
          >
            {THEME_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value} sx={{ gap: 1, px: 2 }}>
                {option.icon}
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <FormHelperText>System follows your device's light or dark setting.</FormHelperText>
        </Grid>

        {SELECTS.map((setting) => (
          <Grid item xs={12} sm={6} key={setting.key}>
            <FormControl fullWidth>
              <InputLabel id={`${setting.key}-label`}>{setting.label}</InputLabel>
              <Select
                labelId={`${setting.key}-label`}
                label={setting.label}
                value={preferences[setting.key] ?? setting.options[0].value}
                onChange={(event) => update({ [setting.key]: event.target.value })}
              >
                {setting.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>{setting.helper}</FormHelperText>
            </FormControl>
          </Grid>
        ))}

        <Grid item xs={12}>
          <Paper
            variant="outlined"
            sx={{ p: 2, bgcolor: 'background.default', borderColor: 'divider' }}
          >
            <Typography variant="overline" color="text.secondary">
              Live preview
            </Typography>

            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {[
                { label: 'Currency', value: formatCurrency(PREVIEW_AMOUNT) },
                { label: 'Number', value: formatNumber(PREVIEW_NUMBER) },
                { label: "Today's date", value: formatDate(new Date()) },
              ].map((item) => (
                <Grid item xs={12} sm={4} key={item.label}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {item.label}
                  </Typography>
                  <Box sx={{ typography: 'h6', wordBreak: 'break-word' }}>{item.value}</Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </SettingsSection>
  );
}
