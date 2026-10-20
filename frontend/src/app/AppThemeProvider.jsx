import { useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { createAppTheme } from '../theme';
import { usePreferences } from './PreferencesContext';

const prefersDark = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

/**
 * Resolves the saved theme preference ('light' | 'dark' | 'auto') into a
 * concrete MUI theme, following the OS setting while 'auto' is selected.
 */
export default function AppThemeProvider({ children }) {
  const { preferences } = usePreferences();
  const setting = preferences.theme ?? 'light';

  const [systemDark, setSystemDark] = useState(prefersDark);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => setSystemDark(event.matches);

    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const mode = setting === 'auto' ? (systemDark ? 'dark' : 'light') : setting;
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  // Keeps the browser chrome (address bar, form controls) in step with the app.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
    document.documentElement.style.colorScheme = mode;

    const meta =
      document.querySelector('meta[name="theme-color"]') ??
      (() => {
        const created = document.createElement('meta');
        created.setAttribute('name', 'theme-color');
        document.head.appendChild(created);
        return created;
      })();
    meta.setAttribute('content', theme.palette.background.default);
  }, [mode, theme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
