import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  DoneAll as DoneAllIcon,
  ClearAll as ClearAllIcon,
  Notifications as NotificationsIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import SettingsSection from './SettingsSection';
import ToggleRow from './ToggleRow';
import { usePreferences } from '../../../app/PreferencesContext';
import { useToast } from '../../../app/ToastContext';
import { useServerConfig } from '../../../app/ServerConfigContext';
import { useNotifications } from '../../../app/NotificationsContext';
import { sendTestEmail } from '../../../api/notifications.api';
import { getApiErrorMessage } from '../../../shared/utils/apiError';

const CHILD_TOGGLES = [
  {
    key: 'portfolio_alerts',
    label: 'Portfolio alerts',
    description: 'Sent when a holding moves sharply or a portfolio drifts far from its target weights.',
  },
  {
    key: 'market_news_alerts',
    label: 'Market news alerts',
    description: 'Sent for news and corporate actions on the companies you hold.',
  },
  {
    key: 'performance_reports',
    label: 'Performance reports',
    description: 'A scheduled summary of returns, risk and your biggest movers.',
  },
  {
    key: 'ipo_alerts',
    label: 'IPO alerts',
    description: 'Sent when an IPO opens, closes, or its grey-market premium shifts.',
  },
];

const DIGEST_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'never', label: 'Never' },
];

export default function NotificationsSection() {
  const { preferences, savePreferences } = usePreferences();
  const { showSuccess, showError, showWarning } = useToast();
  const serverConfig = useServerConfig();
  const { unreadCount, markAllRead, clearAll } = useNotifications();

  const [isTesting, setIsTesting] = useState(false);

  const emailEnabled = Boolean(preferences.email_notifications);
  const mailTransportReady = serverConfig.email_notifications?.enabled !== false;

  const update = (patch) => {
    savePreferences(patch).catch((err) => {
      showError(getApiErrorMessage(err, "Couldn't save that preference"));
    });
  };

  const handleTestEmail = async () => {
    setIsTesting(true);
    try {
      const result = await sendTestEmail();
      if (result?.delivered) {
        showSuccess(result.message || 'Test email sent');
      } else {
        showWarning(result?.message || 'The test email could not be delivered');
      }
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not send the test email'));
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <SettingsSection
      icon={<NotificationsIcon />}
      title="Notifications"
      subtitle="Choose what reaches your inbox — saved instantly"
    >
      {!mailTransportReady && (
        <Alert severity="info" sx={{ mb: 2 }}>
          This server has no mail transport configured, so emails are written to the server log
          instead of being delivered. Your choices below are still saved and will take effect as
          soon as email is switched on.
        </Alert>
      )}

      <ToggleRow
        label="Email notifications"
        description="The master switch for everything we send by email."
        checked={emailEnabled}
        onChange={(checked) => update({ email_notifications: checked })}
      />

      {!emailEnabled && (
        <Alert severity="info" sx={{ my: 1 }}>
          Email is off, so nothing below will be emailed. In-app alerts still appear in the bell
          menu in the top bar.
        </Alert>
      )}

      <Divider sx={{ my: 1 }} />

      {CHILD_TOGGLES.map((toggle) => (
        <ToggleRow
          key={toggle.key}
          label={toggle.label}
          description={toggle.description}
          checked={preferences[toggle.key]}
          dimmed={!emailEnabled}
          onChange={(checked) => update({ [toggle.key]: checked })}
        />
      ))}

      <Box sx={{ mt: 3, maxWidth: 320 }}>
        <FormControl fullWidth>
          <InputLabel id="digest-label">Digest frequency</InputLabel>
          <Select
            labelId="digest-label"
            label="Digest frequency"
            value={preferences.digest_frequency ?? 'weekly'}
            onChange={(event) => update({ digest_frequency: event.target.value })}
          >
            {DIGEST_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>How often we bundle everything into one summary email</FormHelperText>
        </FormControl>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          startIcon={isTesting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
          disabled={isTesting}
          onClick={handleTestEmail}
        >
          {isTesting ? 'Sending…' : 'Send test email'}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle2" gutterBottom>
        In-app notifications
      </Typography>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <Chip
          size="small"
          color={unreadCount > 0 ? 'info' : 'default'}
          label={`${unreadCount} unread`}
        />
        <Button
          size="small"
          startIcon={<DoneAllIcon />}
          disabled={unreadCount === 0}
          onClick={() => markAllRead()}
        >
          Mark all read
        </Button>
        <Button size="small" color="error" startIcon={<ClearAllIcon />} onClick={() => clearAll()}>
          Clear all
        </Button>
      </Stack>
    </SettingsSection>
  );
}
