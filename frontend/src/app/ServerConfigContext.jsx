import { createContext, useContext, useEffect, useState } from 'react';
import { getServerConfig } from '../api/config.api';

const FALLBACK = {
  google_auth: { enabled: false, client_id: null },
  email_notifications: { enabled: false },
  features: { company_research_news: false, ipo_gmp: false },
};

const ServerConfigContext = createContext(FALLBACK);

export const useServerConfig = () => useContext(ServerConfigContext);

/**
 * Loads public server capabilities once so the UI can hide features that the
 * backend has not been configured for (Google sign-in, outgoing email, ...).
 */
export function ServerConfigProvider({ children }) {
  const [config, setConfig] = useState(FALLBACK);

  useEffect(() => {
    let cancelled = false;

    getServerConfig()
      .then((data) => {
        if (!cancelled) setConfig({ ...FALLBACK, ...data });
      })
      .catch(() => {
        // A missing /config endpoint should never block the app.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <ServerConfigContext.Provider value={config}>{children}</ServerConfigContext.Provider>;
}

export default ServerConfigContext;
