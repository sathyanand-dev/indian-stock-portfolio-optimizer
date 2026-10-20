import { Alert, Box, Button } from '@mui/material';

export default function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}) {
  return (
    <Box py={2}>
      <Alert
        severity="error"
        action={
          onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              Retry
            </Button>
          ) : null
        }
      >
        {message}
      </Alert>
    </Box>
  );
}
