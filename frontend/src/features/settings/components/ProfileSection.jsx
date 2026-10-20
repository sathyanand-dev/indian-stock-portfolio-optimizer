import { useEffect, useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Stack,
  TextField,
} from '@mui/material';
import {
  AccountCircle as ProfileIcon,
  Save as SaveIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import SettingsSection from './SettingsSection';
import { useAuth } from '../../auth/context/AuthContext';
import { useToast } from '../../../app/ToastContext';
import * as authApi from '../../../api/auth.api';
import { getApiErrorMessage } from '../../../shared/utils/apiError';

const PROVIDER_LABEL = {
  local: 'Password',
  google: 'Google',
  'local+google': 'Password + Google',
};

function initialFor(user) {
  const source = user?.full_name || user?.username || user?.email || '';
  return source.trim().charAt(0).toUpperCase() || '?';
}

export default function ProfileSection() {
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync whenever the account is reloaded so the form never shows stale values.
  useEffect(() => {
    setFullName(user?.full_name ?? '');
    setPhone(user?.phone ?? '');
  }, [user?.full_name, user?.phone]);

  const isDirty = useMemo(
    () => fullName.trim() !== (user?.full_name ?? '').trim() || phone.trim() !== (user?.phone ?? '').trim(),
    [fullName, phone, user?.full_name, user?.phone],
  );

  const providerLabel = PROVIDER_LABEL[user?.auth_provider] ?? 'Password';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await authApi.updateCurrentUser({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      });
      await refreshUser();
      showSuccess('Profile updated');
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not update your profile'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSection
      icon={<ProfileIcon />}
      title="Profile"
      subtitle="Your name, contact number and how you sign in"
      defaultExpanded
    >
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ mb: 3, flexWrap: 'wrap', rowGap: 1 }}
      >
        <Avatar
          src={user?.avatar_url || undefined}
          alt={user?.full_name || user?.username || 'Your avatar'}
          sx={{ width: 56, height: 56, bgcolor: 'primary.main', color: 'primary.contrastText' }}
        >
          {initialFor(user)}
        </Avatar>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip size="small" label={`Sign-in: ${providerLabel}`} />
          {user?.email_verified && (
            <Chip
              size="small"
              color="success"
              icon={<VerifiedIcon fontSize="small" />}
              label="Email verified"
            />
          )}
        </Box>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Full name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="e.g. Priya Sharma"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            inputProps={{ maxLength: 20 }}
            helperText="Used for alerts once SMS delivery is switched on"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            disabled
            label="Email"
            value={user?.email ?? ''}
            helperText="Email is your sign-in identity and can't be changed here"
          />
        </Grid>

        <Grid item xs={12}>
          <Button
            variant="contained"
            startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            disabled={isSaving || !isDirty}
            onClick={handleSave}
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </Grid>
      </Grid>
    </SettingsSection>
  );
}
