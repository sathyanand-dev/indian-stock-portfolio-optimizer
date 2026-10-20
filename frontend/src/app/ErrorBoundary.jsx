import { Component } from 'react';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';

/**
 * Last-resort guard so a render error shows a recoverable screen instead of a
 * blank white page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 460, width: '100%' }}>
          <CardContent sx={{ textAlign: 'center', p: { xs: 3, sm: 4 } }}>
            <ErrorIcon sx={{ fontSize: 44, color: 'error.main', mb: 1 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Something went wrong on this screen
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {error.message || 'An unexpected error occurred.'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant="contained" onClick={() => window.location.reload()}>
                Reload the app
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
              >
                Back to dashboard
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }
}
