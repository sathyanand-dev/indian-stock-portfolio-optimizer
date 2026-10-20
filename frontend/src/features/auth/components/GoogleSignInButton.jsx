import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';
import { useGoogleIdentity } from '../hooks/useGoogleIdentity';
import { useServerConfig } from '../../../app/ServerConfigContext';
import { useToast } from '../../../app/ToastContext';
import { getApiErrorMessage } from '../../../shared/utils/apiError';

// Google only honours widths inside this range for the rendered button.
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

const clampWidth = (width) =>
  Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(width)));

/**
 * Renders the official Google Identity Services button and exchanges the
 * returned ID token for an app session.
 *
 * Renders nothing when the backend has no Google client configured, or when
 * the GIS script cannot be loaded (offline / blocked), so a failure never
 * leaves a broken box on the page.
 *
 * @param {object} props
 * @param {'signin_with' | 'signup_with'} [props.text] Google button caption.
 * @param {(message: string) => void} [props.onError] Receives a user-facing
 *   message; falls back to a toast when omitted.
 * @param {(available: boolean) => void} [props.onAvailabilityChange] Lets the
 *   page hide surrounding chrome (the "or continue with email" divider) when
 *   the button cannot be shown.
 */
export default function GoogleSignInButton({
  text = 'signin_with',
  onError,
  onAvailabilityChange,
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const { showError, showSuccess } = useToast();
  const serverConfig = useServerConfig();

  const clientId = serverConfig?.google_auth?.client_id ?? null;
  const enabled = Boolean(serverConfig?.google_auth?.enabled && clientId);

  const { status } = useGoogleIdentity(enabled);
  const mode = theme.palette.mode;

  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(null);
  const [busy, setBusy] = useState(false);
  const [renderFailed, setRenderFailed] = useState(false);

  const reportError = useCallback(
    (message) => {
      if (onError) onError(message);
      else showError(message);
    },
    [onError, showError],
  );

  // Kept in a ref so re-theming the button never re-initialises the client.
  const handleCredentialRef = useRef(null);
  handleCredentialRef.current = async (response) => {
    const credential = response?.credential;
    if (!credential) {
      reportError('Google did not return a sign-in token. Please try again.');
      return;
    }

    setBusy(true);
    try {
      const result = await loginWithGoogle(credential);
      showSuccess(result?.created ? 'Account created with Google' : 'Signed in with Google');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      reportError(getApiErrorMessage(err, 'Google sign-in failed. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  // Track the available width so the Google button matches the form fields.
  useEffect(() => {
    const node = wrapperRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;

    const measure = () => {
      const width = node.getBoundingClientRect().width;
      if (width > 0) setButtonWidth(clampWidth(width));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [status]);

  // Re-render on colour-mode change so the button never sits light-on-dark.
  useEffect(() => {
    if (status !== 'ready' || !clientId) return;

    const target = buttonRef.current;
    const googleId = window.google?.accounts?.id;
    if (!target || !googleId) return;

    try {
      googleId.initialize({
        client_id: clientId,
        callback: (response) => handleCredentialRef.current?.(response),
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
      });

      target.replaceChildren();
      googleId.renderButton(target, {
        type: 'standard',
        theme: mode === 'dark' ? 'filled_black' : 'outline',
        size: 'large',
        shape: 'rectangular',
        logo_alignment: 'left',
        text,
        ...(buttonWidth ? { width: buttonWidth } : {}),
      });
      setRenderFailed(false);
    } catch {
      setRenderFailed(true);
    }
  }, [status, clientId, mode, text, buttonWidth]);

  const available = enabled && status !== 'error' && status !== 'idle' && !renderFailed;

  useEffect(() => {
    onAvailabilityChange?.(available);
  }, [available, onAvailabilityChange]);

  if (!available) {
    return null;
  }

  return (
    <Box
      ref={wrapperRef}
      sx={{
        position: 'relative',
        width: '100%',
        minHeight: 44,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      {/* Stays mounted while busy so the GIS-owned node is never torn down. */}
      <Box
        ref={buttonRef}
        sx={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          colorScheme: mode,
          opacity: busy ? 0 : 1,
          pointerEvents: busy ? 'none' : 'auto',
          '& > div': { width: '100% !important' },
          '& iframe': { margin: '0 !important' },
        }}
      />

      {busy && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            borderRadius: 1,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            color: 'text.secondary',
          }}
        >
          <CircularProgress size={18} color="inherit" />
        </Box>
      )}
    </Box>
  );
}
