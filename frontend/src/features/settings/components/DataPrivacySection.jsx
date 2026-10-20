import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import {
  Download as DownloadIcon,
  PrivacyTip as PrivacyIcon,
  RestartAlt as ResetIcon,
} from '@mui/icons-material';
import SettingsSection from './SettingsSection';
import ToggleRow from './ToggleRow';
import ResponsiveDialog from '../../../components/common/ResponsiveDialog';
import { usePreferences } from '../../../app/PreferencesContext';
import { useToast } from '../../../app/ToastContext';
import * as authApi from '../../../api/auth.api';
import { getApiErrorMessage } from '../../../shared/utils/apiError';

const RETENTION_OPTIONS = [
  { value: '1y', label: '1 year' },
  { value: '2y', label: '2 years' },
  { value: '5y', label: '5 years' },
  { value: 'forever', label: 'Keep forever' },
];

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Safari needs the object URL to outlive the click before it is revoked.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function DataPrivacySection() {
  const { preferences, savePreferences, resetPreferences } = usePreferences();
  const { showSuccess, showError } = useToast();

  const [isExporting, setIsExporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const update = (patch) => {
    savePreferences(patch).catch((err) => {
      showError(getApiErrorMessage(err, "Couldn't save that preference"));
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await authApi.exportAccount();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(data, `portfolio-optimizer-export-${stamp}.json`);
      showSuccess('Your data is downloading');
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not export your data'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetPreferences();
      showSuccess('Settings restored to defaults');
      setIsResetDialogOpen(false);
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not reset your settings'));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <SettingsSection
      icon={<PrivacyIcon />}
      title="Data & privacy"
      subtitle="What we keep, what we measure, and getting your data out"
    >
      <Box sx={{ maxWidth: 320, mb: 1 }}>
        <FormControl fullWidth>
          <InputLabel id="retention-label">Data retention</InputLabel>
          <Select
            labelId="retention-label"
            label="Data retention"
            value={preferences.data_retention ?? '2y'}
            onChange={(event) => update({ data_retention: event.target.value })}
          >
            {RETENTION_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>How long historical snapshots and notifications are kept</FormHelperText>
        </FormControl>
      </Box>

      <ToggleRow
        label="Usage analytics"
        description="Share anonymous usage data so we can see which features are worth improving."
        checked={preferences.analytics_opt_in}
        onChange={(checked) => update({ analytics_opt_in: checked })}
      />

      <ToggleRow
        label="Beta features"
        description="Turn on features that are still being tested. They may change or break."
        checked={preferences.beta_features}
        onChange={(checked) => update({ beta_features: checked })}
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your export is a single JSON file containing your profile, preferences, portfolios and
        notifications.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          startIcon={isExporting ? <CircularProgress size={18} color="inherit" /> : <DownloadIcon />}
          disabled={isExporting}
          onClick={handleExport}
        >
          {isExporting ? 'Preparing…' : 'Download my data'}
        </Button>

        <Button
          variant="outlined"
          startIcon={<ResetIcon />}
          onClick={() => setIsResetDialogOpen(true)}
        >
          Reset all settings to defaults
        </Button>
      </Box>

      <ResponsiveDialog
        open={isResetDialogOpen}
        onClose={() => setIsResetDialogOpen(false)}
        maxWidth="sm"
        title="Reset all settings?"
        subtitle="Appearance, formats, notifications and privacy choices go back to their defaults."
        actions={
          <>
            <Button onClick={() => setIsResetDialogOpen(false)} disabled={isResetting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleReset}
              disabled={isResetting}
              startIcon={isResetting ? <CircularProgress size={18} color="inherit" /> : null}
            >
              Reset settings
            </Button>
          </>
        }
      >
        <Typography variant="body2" color="text.secondary">
          Your profile, investment defaults, portfolios and notification history are not touched —
          only the settings on this page.
        </Typography>
      </ResponsiveDialog>
    </SettingsSection>
  );
}
