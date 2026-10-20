import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/context/AuthContext';
import { ServerConfigProvider } from './ServerConfigContext';
import { PreferencesProvider } from './PreferencesContext';
import { NotificationsProvider } from './NotificationsContext';
import { ToastProvider } from './ToastContext';
import AppThemeProvider from './AppThemeProvider';

/**
 * Provider order matters: preferences need auth state, and the theme needs the
 * resolved preferences, so the MUI ThemeProvider sits inside both.
 */
export default function AppProviders({ children }) {
  return (
    <ServerConfigProvider>
      <AuthProvider>
        <PreferencesProvider>
          <AppThemeProvider>
            <ToastProvider>
              <NotificationsProvider>
                <BrowserRouter>{children}</BrowserRouter>
              </NotificationsProvider>
            </ToastProvider>
          </AppThemeProvider>
        </PreferencesProvider>
      </AuthProvider>
    </ServerConfigProvider>
  );
}
