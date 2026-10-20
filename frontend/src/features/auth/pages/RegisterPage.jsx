import { useState } from "react";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Link,
  InputAdornment,
  IconButton,
  Divider
} from "@mui/material";
import { Visibility, VisibilityOff, TrendingUp } from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useServerConfig } from '../../../app/ServerConfigContext';
import { getApiErrorMessage } from '../../../shared/utils/apiError';
import LiveIndexTicker from '../../../components/market/LiveIndexTicker';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const serverConfig = useServerConfig();
  const googleEnabled = Boolean(serverConfig?.google_auth?.enabled);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Goes false if Google Identity Services cannot load, so the divider below
  // never dangles over an empty space.
  const [googleAvailable, setGoogleAvailable] = useState(true);

  const handleChange = (e) => {
    if (error) setError("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setError("");
    if (!formData.username.trim() || !formData.email.trim() || !formData.password) {
      setError("Please fill in all required fields");
      return;
    }
    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }
    setLoading(true);
    try {
      await register(formData.username.trim(), formData.password, formData.email.trim());
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.default"
      }}
    >
      <LiveIndexTicker />
      <Container
        component="main"
        maxWidth="sm"
        sx={{ flex: 1, px: { xs: 2, sm: 3 } }}
      >
        <Box
          sx={{
            mt: { xs: 3, sm: 8 },
            mb: { xs: 3, sm: 6 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          <Paper
            elevation={3}
            sx={{
              p: { xs: 2.5, sm: 4 },
              width: "100%",
              borderRadius: 2,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider"
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                mb: 3
              }}
            >
              <Box
                sx={{
                  bgcolor: "primary.main",
                  borderRadius: "50%",
                  p: 2,
                  mb: 2
                }}
              >
                <TrendingUp sx={{ fontSize: 40, color: "primary.contrastText" }} />
              </Box>
              <Typography component="h1" variant="h4" gutterBottom sx={{ color: "text.primary" }}>
                Create Account
              </Typography>
              <Typography variant="body1" sx={{ color: "text.secondary" }} textAlign="center">
                Start optimizing your investment portfolio today
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {googleEnabled && (
              <Box>
                <GoogleSignInButton
                  text="signup_with"
                  onError={setError}
                  onAvailabilityChange={setGoogleAvailable}
                />
                {googleAvailable && (
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      or continue with email
                    </Typography>
                  </Divider>
                )}
              </Box>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                value={formData.username}
                onChange={handleChange}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                autoComplete="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                id="password"
                autoComplete="new-password"
                helperText="At least 6 characters"
                value={formData.password}
                onChange={handleChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={handleClickShowConfirmPassword}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2, py: 1.5 }}
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
              <Box textAlign="center">
                <Link component={RouterLink} to="/login" variant="body2">
                  Already have an account? Sign In
                </Link>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default RegisterPage;
