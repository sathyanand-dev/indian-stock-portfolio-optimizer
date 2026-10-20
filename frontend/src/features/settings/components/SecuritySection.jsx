import { useState } from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import { Lock as LockIcon, Security as SecurityIcon } from '@mui/icons-material';
import SettingsSection from './SettingsSection';
import ChangePasswordDialog from './ChangePasswordDialog';
import { useAuth } from '../../auth/context/AuthContext';
import { formatDate } from '../../../shared/utils/formatters';

export default function SecuritySection() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const hasPassword = user?.has_password !== false;

  return (
    <SettingsSection
      icon={<SecurityIcon />}
      title="Security"
      subtitle={hasPassword ? 'Your password and session' : 'Add a password to your Google account'}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {hasPassword
          ? 'Change the password you use to sign in. It takes effect immediately on your next sign-in.'
          : 'You currently sign in with Google only. Setting a password lets you also sign in with your email and password.'}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<LockIcon />} onClick={() => setIsDialogOpen(true)}>
          {hasPassword ? 'Change password' : 'Set a password'}
        </Button>
      </Box>

      <Alert severity="info" sx={{ mt: 3 }}>
        Sessions here are a single bearer token that expires on its own, so there is no device list
        to manage — signing out discards it. Two-factor authentication isn't available yet.
      </Alert>

      {user?.created_at && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Account created {formatDate(user.created_at)}
        </Typography>
      )}

      <ChangePasswordDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        hasPassword={hasPassword}
      />
    </SettingsSection>
  );
}
