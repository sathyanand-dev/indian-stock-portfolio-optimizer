import { useEffect, useState } from 'react';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

/**
 * Module-level promise so the Google Identity Services script is fetched at
 * most once per page load, even when several buttons mount at the same time.
 */
let loadPromise = null;

function getGoogleId() {
  return typeof window !== 'undefined' ? window.google?.accounts?.id : undefined;
}

function loadGoogleIdentity() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('Google Identity Services needs a browser environment'));
      return;
    }

    if (getGoogleId()) {
      resolve(getGoogleId());
      return;
    }

    const settle = (script) => {
      const onLoad = () => {
        const id = getGoogleId();
        if (id) resolve(id);
        else reject(new Error('Google Identity Services loaded without an id client'));
      };
      const onError = () => reject(new Error('Google Identity Services could not be loaded'));

      script.addEventListener('load', onLoad, { once: true });
      script.addEventListener('error', onError, { once: true });
    };

    // Another mount (or a previous page) may already have injected the tag.
    const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
    if (existing) {
      settle(existing);
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    settle(script);
    document.head.appendChild(script);
  }).catch((err) => {
    // Allow a later mount to retry after a network blip / blocked request.
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

/**
 * Lazily loads Google Identity Services.
 *
 * @param {boolean} enabled Only fetch the script when the server says Google
 *   sign-in is configured — nothing is requested while this is false.
 * @returns {{ status: 'idle' | 'loading' | 'ready' | 'error' }}
 */
export function useGoogleIdentity(enabled) {
  const [status, setStatus] = useState(() => {
    if (!enabled) return 'idle';
    return getGoogleId() ? 'ready' : 'loading';
  });

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return undefined;
    }

    if (getGoogleId()) {
      setStatus('ready');
      return undefined;
    }

    let cancelled = false;
    setStatus('loading');

    loadGoogleIdentity()
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch(() => {
        // Offline, ad-blocked or CSP-blocked: callers render nothing.
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { status };
}

export default useGoogleIdentity;
