import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  DeleteForever as DeleteIcon,
  WarningAmber as WarningIcon,
} from '@mui/icons-material';
import ResponsiveDialog from '../../../components/common/ResponsiveDialog';
import { useAuth } from '../../auth/context/AuthContext';
import { useToast } from '../../../app/ToastContext';
import * as authApi from '../../../api/auth.api';
import { getApiErrorMessage } from '../../../shared/utils/apiError';

const CONFIRM_WORD = 'DELETE';

export default function DangerZoneCard({ onDeleted }) {
  const { user, logout } = useAuth();
  const { showError } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const close = () => {
    setIsOpen(false);
    setConfirmText('');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await authApi.deleteCurrentUser();
      logout();
      onDeleted();
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not delete your account'));
      setIsDeleting(false);
    }
  };

  return (
    <Card sx={{ borderColor: 'error.main', mb: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', color: 'error.main' }}>
            <WarningIcon />
          </Box>
          <Typography variant="h6" color="error.main">
            Danger zone
          </Typography>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Deleting your account signs you out and deactivates it, so you lose access to your
          portfolios and history. Download your data first if you want to keep a copy.
        </Typography>

        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setIsOpen(true)}
        >
          Delete account
        </Button>
      </CardContent>

      <ResponsiveDialog
        open={isOpen}
        onClose={close}
        maxWidth="sm"
        title="Delete your account?"
        subtitle={`This deactivates ${user?.email ?? 'your account'} and signs you out immediately.`}
        actions={
          <>
            <Button onClick={close} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleDelete}
              disabled={isDeleting || confirmText.trim() !== CONFIRM_WORD}
              startIcon={isDeleting ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {isDeleting ? 'Deleting…' : 'Delete my account'}
            </Button>
          </>
        }
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Type <strong>{CONFIRM_WORD}</strong> below to confirm. This cannot be undone from the app.
        </Typography>

        <TextField
          fullWidth
          label={`Type ${CONFIRM_WORD}`}
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          autoComplete="off"
          inputProps={{ 'aria-label': `Type ${CONFIRM_WORD} to confirm` }}
        />
      </ResponsiveDialog>
    </Card>
  );
}
