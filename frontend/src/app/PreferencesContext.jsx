import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth.api';
import { useAuth } from '../features/auth/context/AuthContext';
import { setFormatterOptions } from '../shared/utils/formatters';

export const DEFAULT_PREFERENCES = {
  theme: 'light',
  language: 'en',
  date_format: 'dd/MM/yyyy',
  number_format: 'indian',
  currency: 'INR',
  density: 'comfortable',
  email_notifications: true,
  portfolio_alerts: true,
  market_news_alerts: false,
  performance_reports: true,
  ipo_alerts: true,
  digest_frequency: 'weekly',
  data_retention: '2y',
  analytics_opt_in: false,
  beta_features: false,
};

const STORAGE_KEY = 'preferences';

const PreferencesContext = createContext(undefined);

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};

/** Cached copy so the correct theme paints on first frame, before /me resolves. */
function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writeCache(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Private browsing / storage full — preferences still live on the server.
  }
}

/**
 * Single source of truth for user settings. Reads from the API when signed in,
 * writes through to the API, and mirrors to localStorage so appearance settings
 * survive a reload without waiting on the network.
 */
export function PreferencesProvider({ children }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState(readCache);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Applied during render rather than in an effect: child effects run before
  // parent effects, so an effect here would let descendants format one commit
  // behind with the previous currency / number / date settings.
  setFormatterOptions({
    currency: preferences.currency,
    numberFormat: preferences.number_format,
    dateFormat: preferences.date_format,
  });

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    authApi
      .getPreferences()
      .then((data) => {
        if (cancelled) return;
        const merged = { ...DEFAULT_PREFERENCES, ...data };
        setPreferences(merged);
        writeCache(merged);
      })
      .catch(() => {
        // Fall back to the cached copy.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading]);

  /** Optimistically applies changes, then persists them. Reverts on failure. */
  const savePreferences = useCallback(
    async (patch) => {
      const previous = preferences;
      const next = { ...preferences, ...patch };

      setPreferences(next);
      writeCache(next);

      if (!isAuthenticated) return next;

      setIsSaving(true);
      try {
        const saved = await authApi.updatePreferences(patch);
        const merged = { ...DEFAULT_PREFERENCES, ...saved };
        setPreferences(merged);
        writeCache(merged);
        return merged;
      } catch (err) {
        setPreferences(previous);
        writeCache(previous);
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [preferences, isAuthenticated],
  );

  const resetPreferences = useCallback(async () => {
    if (!isAuthenticated) {
      setPreferences(DEFAULT_PREFERENCES);
      writeCache(DEFAULT_PREFERENCES);
      return DEFAULT_PREFERENCES;
    }

    setIsSaving(true);
    try {
      const saved = await authApi.resetPreferences();
      const merged = { ...DEFAULT_PREFERENCES, ...saved };
      setPreferences(merged);
      writeCache(merged);
      return merged;
    } finally {
      setIsSaving(false);
    }
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({ preferences, isLoading, isSaving, savePreferences, resetPreferences }),
    [preferences, isLoading, isSaving, savePreferences, resetPreferences],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export default PreferencesContext;
