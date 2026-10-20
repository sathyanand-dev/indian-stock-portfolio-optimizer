import { createTheme, alpha } from '@mui/material/styles';

/**
 * Design tokens per colour mode. Component overrides below read from these
 * instead of hardcoding hex values, so light and dark stay in sync.
 */
const tokens = {
  light: {
    primary: { main: '#2C3E50', light: '#34495E', dark: '#1A252F' },
    secondary: { main: '#3498DB', light: '#5DADE2', dark: '#2980B9' },
    background: { default: '#FAFBFC', paper: '#FFFFFF' },
    surfaceSubtle: '#F4F6F8',
    text: { primary: '#2C3E50', secondary: '#5D6D7E' },
    divider: '#E5E8EC',
    shadowColor: 'rgba(44, 62, 80, 0.08)',
    shadowColorStrong: 'rgba(44, 62, 80, 0.14)',
    appBar: '#FFFFFF',
    grey: {
      50: '#FAFBFC',
      100: '#F4F6F8',
      200: '#E5E8EC',
      300: '#D1D9E0',
      400: '#B0BEC5',
      500: '#78909C',
      600: '#5D6D7E',
      700: '#455A64',
      800: '#34495E',
      900: '#2C3E50',
    },
  },
  dark: {
    primary: { main: '#5DADE2', light: '#85C6EC', dark: '#2980B9' },
    secondary: { main: '#4FC3A1', light: '#7FD6BC', dark: '#329C7D' },
    background: { default: '#0E141B', paper: '#161F29' },
    surfaceSubtle: '#1D2836',
    text: { primary: '#E6EDF3', secondary: '#9BAAB9' },
    divider: '#26323F',
    shadowColor: 'rgba(0, 0, 0, 0.4)',
    shadowColorStrong: 'rgba(0, 0, 0, 0.55)',
    appBar: '#161F29',
    grey: {
      50: '#0E141B',
      100: '#161F29',
      200: '#1D2836',
      300: '#26323F',
      400: '#3C4A5A',
      500: '#5C6D7E',
      600: '#8595A6',
      700: '#A9B7C4',
      800: '#CBD5DF',
      900: '#E6EDF3',
    },
  },
};

const semantic = {
  success: { main: '#27AE60', light: '#58D68D', dark: '#229954', contrastText: '#FFFFFF' },
  error: { main: '#E74C3C', light: '#EC7063', dark: '#C0392B', contrastText: '#FFFFFF' },
  warning: { main: '#F39C12', light: '#F8C471', dark: '#D68910', contrastText: '#FFFFFF' },
  info: { main: '#3498DB', light: '#5DADE2', dark: '#2980B9', contrastText: '#FFFFFF' },
};

/**
 * Builds the application theme for a resolved colour mode.
 * @param {'light' | 'dark'} mode
 */
export function createAppTheme(mode = 'light') {
  const t = tokens[mode] ?? tokens.light;
  const isDark = mode === 'dark';

  const softFill = (color) => alpha(color, isDark ? 0.18 : 0.14);

  return createTheme({
    palette: {
      mode,
      primary: { ...t.primary, contrastText: isDark ? '#0E141B' : '#FFFFFF' },
      secondary: { ...t.secondary, contrastText: isDark ? '#0E141B' : '#FFFFFF' },
      background: t.background,
      text: t.text,
      divider: t.divider,
      grey: t.grey,
      ...semantic,
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Segoe UI", "Helvetica Neue", sans-serif',
      // Headings intentionally omit `color` so they inherit palette.text.primary
      // and therefore follow the active colour mode.
      h1: { fontWeight: 700, fontSize: '2.5rem', lineHeight: 1.2, letterSpacing: '-0.02em' },
      h2: { fontWeight: 700, fontSize: '2rem', lineHeight: 1.3, letterSpacing: '-0.01em' },
      h3: { fontWeight: 600, fontSize: '1.75rem', lineHeight: 1.4 },
      h4: { fontWeight: 600, fontSize: '1.5rem', lineHeight: 1.4 },
      h5: { fontWeight: 600, fontSize: '1.25rem', lineHeight: 1.5 },
      h6: { fontWeight: 600, fontSize: '1rem', lineHeight: 1.6 },
      body1: { fontSize: '1rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.6 },
      subtitle1: { fontSize: '1rem', fontWeight: 500 },
      subtitle2: { fontSize: '0.875rem', fontWeight: 500 },
    },
    shape: { borderRadius: 8 },
    spacing: 8,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: t.background.default, color: t.text.primary },
          // Keep long tables and code blocks scrollable rather than clipped on phones.
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-thumb': {
            backgroundColor: t.grey[300],
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow: `0 1px 4px ${t.shadowColor}`,
            border: `1px solid ${t.divider}`,
            borderRadius: 12,
            transition: 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out',
            '@media (hover: hover)': {
              '&:hover': {
                boxShadow: `0 4px 12px ${t.shadowColorStrong}`,
                transform: 'translateY(-1px)',
              },
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 8,
            padding: '10px 20px',
            fontSize: '0.9rem',
            // Comfortable tap target on touch devices.
            minHeight: 44,
          },
          sizeSmall: { padding: '6px 14px', minHeight: 36 },
          contained: {
            boxShadow: `0 2px 4px ${t.shadowColor}`,
            '@media (hover: hover)': {
              '&:hover': { boxShadow: `0 4px 8px ${t.shadowColorStrong}` },
            },
          },
          outlined: {
            borderColor: t.divider,
            color: t.text.primary,
            '&:hover': {
              borderColor: t.secondary.main,
              backgroundColor: alpha(t.secondary.main, 0.08),
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none', borderRadius: 8 },
          outlined: { borderColor: t.divider },
          elevation1: { boxShadow: `0 1px 4px ${t.shadowColor}` },
          elevation2: { boxShadow: `0 2px 8px ${t.shadowColorStrong}` },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: t.appBar,
            backgroundImage: 'none',
            color: t.text.primary,
            boxShadow: `0 1px 4px ${t.shadowColor}`,
            borderBottom: `1px solid ${t.divider}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundImage: 'none', borderColor: t.divider },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: t.surfaceSubtle,
            '& .MuiTableCell-head': {
              color: t.text.primary,
              fontWeight: 600,
              borderBottom: `1px solid ${t.divider}`,
              whiteSpace: 'nowrap',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderBottom: `1px solid ${t.divider}` },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 6, fontWeight: 500 },
          colorSuccess: { backgroundColor: softFill(semantic.success.main), color: semantic.success.main },
          colorError: { backgroundColor: softFill(semantic.error.main), color: semantic.error.main },
          colorWarning: { backgroundColor: softFill(semantic.warning.main), color: semantic.warning.main },
          colorInfo: { backgroundColor: softFill(semantic.info.main), color: semantic.info.main },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 500 },
          standardSuccess: {
            backgroundColor: softFill(semantic.success.main),
            color: isDark ? semantic.success.light : semantic.success.main,
            border: `1px solid ${alpha(semantic.success.main, 0.5)}`,
          },
          standardError: {
            backgroundColor: softFill(semantic.error.main),
            color: isDark ? semantic.error.light : semantic.error.main,
            border: `1px solid ${alpha(semantic.error.main, 0.5)}`,
          },
          standardWarning: {
            backgroundColor: softFill(semantic.warning.main),
            color: isDark ? semantic.warning.light : semantic.warning.main,
            border: `1px solid ${alpha(semantic.warning.main, 0.5)}`,
          },
          standardInfo: {
            backgroundColor: softFill(semantic.info.main),
            color: isDark ? semantic.info.light : semantic.info.main,
            border: `1px solid ${alpha(semantic.info.main, 0.5)}`,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              '& fieldset': { borderColor: t.divider },
              '&:hover fieldset': { borderColor: t.secondary.main },
              '&.Mui-focused fieldset': { borderColor: t.secondary.main, borderWidth: 2 },
            },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: t.divider },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.secondary.main },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: t.secondary.main,
              borderWidth: 2,
            },
          },
        },
      },
      MuiTabs: {
        defaultProps: {
          // Wide tab strips must never clip on a phone.
          variant: 'scrollable',
          scrollButtons: 'auto',
          allowScrollButtonsMobile: true,
        },
        styleOverrides: {
          root: { minHeight: 48 },
          indicator: {
            backgroundColor: t.secondary.main,
            height: 3,
            borderRadius: '2px 2px 0 0',
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.9rem',
            minHeight: 48,
            color: t.text.secondary,
            '&.Mui-selected': { color: t.secondary.main, fontWeight: 600 },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
            // Never let a dialog run off the edge of a small screen.
            margin: 16,
            width: 'calc(100% - 32px)',
            maxHeight: 'calc(100% - 32px)',
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: { overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
        },
      },
      MuiTooltip: {
        defaultProps: { enterTouchDelay: 0, leaveTouchDelay: 3000 },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { '@media (pointer: coarse)': { padding: 10 } },
        },
      },
    },
  });
}

export const lightTheme = createAppTheme('light');
export const darkTheme = createAppTheme('dark');

export default lightTheme;
