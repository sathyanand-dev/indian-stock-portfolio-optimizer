import { IconButton, Tooltip } from '@mui/material';
import {
  LightMode as LightIcon,
  DarkMode as DarkIcon,
  BrightnessAuto as AutoIcon,
} from '@mui/icons-material';
import { usePreferences } from '../../app/PreferencesContext';

const NEXT_MODE = { light: 'dark', dark: 'auto', auto: 'light' };
const ICON = { light: <LightIcon />, dark: <DarkIcon />, auto: <AutoIcon /> };
const LABEL = {
  light: 'Light theme — switch to dark',
  dark: 'Dark theme — follow system next',
  auto: 'Following system theme — switch to light',
};

/** One-tap cycle through light → dark → auto, persisted to the account. */
export default function ThemeToggleButton() {
  const { preferences, savePreferences } = usePreferences();
  const mode = preferences.theme ?? 'light';

  return (
    <Tooltip title={LABEL[mode]}>
      <IconButton
        color="inherit"
        aria-label={LABEL[mode]}
        onClick={() => savePreferences({ theme: NEXT_MODE[mode] }).catch(() => {})}
      >
        {ICON[mode]}
      </IconButton>
    </Tooltip>
  );
}
