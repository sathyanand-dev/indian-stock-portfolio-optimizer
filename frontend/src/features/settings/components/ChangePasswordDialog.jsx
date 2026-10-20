import { useState } from 'react';
import {
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Visibility as VisibilityIcon, VisibilityOff as VisibilityOffIcon } from '@mui/icons-material';
import ResponsiveDialog from '../../../components/common/ResponsiveDialog';
import { useToast } from '../../../app/ToastContext';
import * as authApi from '../../../api/auth.api';
import { getApiErrorMessage } from '../../../shared/utils/apiError';

const MIN_LENGTH = 8;

const EMPTY = { current: '', next: '', confirm: '' };

export default function ChangePasswordDialog({ open, onClose, hasPassword }) {
  const { showSuccess, showError } = useToast();

  const [values, setValues] = useState(EMPTY);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const setField = (field) => (event) => {
    setValues((prev) => ({ ...prev, [field]: event.target.value }));
    setError('');
  };

  const close = () => {
    setValues(EMPTY);
    setVisible(false);
    setError('');
    onClose();
  };

  const visibilityToggle = (
    <InputAdornment position="end">
      <IconButton
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? 'Hide passwords' : 'Show passwords'}
        edge="end"
      >
        {visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
      </IconButton>
    </InputAdornment>
  );

  const handleSubmit = async () => {
    if (hasPassword && !values.current) {
      setError('Enter your current password.');
      return;
    }
    if (values.next.length < MIN_LENGTH) {
      setError(`Your new password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (values.next !== values.confirm) {
      setError("The two new passwords don't match.");
      return;
    }

    setIsSaving(true);
    try {
      await authApi.changePassword({
        ...(hasPassword ? { currentPassword: values.current } : {}),
        newPassword: values.next,
      });
      showSuccess(hasPassword ? 'Password changed' : 'Password set — you can now sign in with it');
      close();
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not change your password'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onClose={close}
      maxWidth="sm"
      title={hasPassword ? 'Change password' : 'Set a password'}
      subtitle={
        hasPassword
          ? 'Use at least 8 characters. You stay signed in on this device.'
          : 'Adds a password to your Google account so you can sign in either way.'
      }
      actions={
        <>
          <Button onClick={close} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {hasPassword ? 'Change password' : 'Set password'}
          </Button>
        </>
      }
    >
      <Stack spacing={2} sx={{ pt: 1 }}>
        {hasPassword && (
          <TextField
            fullWidth
            label="Current password"
            type={visible ? 'text' : 'password'}
            value={values.current}
            onChange={setField('current')}
            autoComplete="current-password"
            InputProps={{ endAdornment: visibilityToggle }}
          />
        )}

        <TextField
          fullWidth
          label="New password"
          type={visible ? 'text' : 'password'}
          value={values.next}
          onChange={setField('next')}
          autoComplete="new-password"
          helperText={`At least ${MIN_LENGTH} characters`}
          InputProps={{ endAdornment: visibilityToggle }}
        />

        <TextField
          fullWidth
          label="Confirm new password"
          type={visible ? 'text' : 'password'}
          value={values.confirm}
          onChange={setField('confirm')}
          autoComplete="new-password"
          InputProps={{ endAdornment: visibilityToggle }}
        />

        {error && (
          <Typography variant="body2" color="error.main">
            {error}
          </Typography>
        )}
      </Stack>
    </ResponsiveDialog>
  );
}
