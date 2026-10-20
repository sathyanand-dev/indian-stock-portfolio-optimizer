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
  Grid,
  Card,
  CardContent,
  Divider,
  useTheme
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import {
  Visibility,
  VisibilityOff,
  TrendingUp,
  ShowChart,
  Analytics,
  Security,
  Speed,
  AccountBalance,
  AlternateEmail,
  Lock
} from "@mui/icons-material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useServerConfig } from '../../../app/ServerConfigContext';
import { getApiErrorMessage } from '../../../shared/utils/apiError';
import { useIsMobile } from '../../../shared/hooks/useIsMobile';
import LiveIndexTicker from '../../../components/market/LiveIndexTicker';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const theme = useTheme();
  const isMobile = useIsMobile();
  const serverConfig = useServerConfig();
  const googleEnabled = Boolean(serverConfig?.google_auth?.enabled);

  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Goes false if Google Identity Services cannot load, so the divider below
  // never dangles over an empty space.
  const [googleAvailable, setGoogleAvailable] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!formData.username.trim() || !formData.password) {
      setError("Please enter your username or email and your password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(formData.username.trim(), formData.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Login failed. Please check your credentials."));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    if (error) setError("");
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const isDark = theme.palette.mode === "dark";
  // Hero surface is always a deep tint, so white-based text reads correctly in
  // both colour modes. Derived from the palette rather than fixed hex values.
  const onHero = theme.palette.common.white;
  const onHeroMuted = alpha(theme.palette.common.white, 0.72);
  const heroGradient = isDark
    ? `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${alpha(
        theme.palette.primary.dark,
        0.55
      )} 55%, ${alpha(theme.palette.secondary.dark, 0.45)} 100%)`
    : `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark} 100%)`;

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2
    }
  };

  const features = [
    {
      icon: <Analytics sx={{ fontSize: 32, color: "primary.main" }} />,
      title: "Advanced Analytics",
      description: "AI-powered portfolio insights and risk analysis"
    },
    {
      icon: <TrendingUp sx={{ fontSize: 32, color: "success.main" }} />,
      title: "Smart Optimization",
      description: "Multiple optimization strategies for maximum returns"
    },
    {
      icon: <Security sx={{ fontSize: 32, color: "secondary.main" }} />,
      title: "Enterprise Security",
      description: "Bank-grade security for your financial data"
    },
    {
      icon: <Speed sx={{ fontSize: 32, color: "warning.main" }} />,
      title: "Real-time Data",
      description: "Live market data and instant portfolio updates"
    }
  ];

  const stats = [
    { value: "50+", label: "Optimization Models", color: theme.palette.primary.light },
    { value: "5000+", label: "NSE Stocks", color: theme.palette.success.light },
    { value: "99.9%", label: "Uptime", color: theme.palette.secondary.light }
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: heroGradient,
        display: "flex",
        flexDirection: "column"
      }}
    >
      <LiveIndexTicker />

      <Container
        maxWidth="xl"
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          py: { xs: 3, md: 4 },
          px: { xs: 2, sm: 3 }
        }}
      >
        <Grid container spacing={{ xs: 3, md: 4 }} alignItems="center" justifyContent="center">
          {/* Login form — first in the DOM order on phones so the inputs are
              reachable without scrolling past the marketing copy. */}
          <Grid item xs={12} md={6} lg={4} sx={{ order: { xs: 1, md: 2 } }}>
            <Paper
              elevation={isDark ? 2 : 24}
              sx={{
                p: { xs: 2.5, sm: 4 },
                bgcolor: "background.paper",
                borderRadius: 3,
                border: 1,
                borderColor: "divider"
              }}
            >
              <Box sx={{ textAlign: "center", mb: 3 }}>
                <ShowChart sx={{ fontSize: 40, color: "primary.main", mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: "text.primary" }}>
                  Welcome Back
                </Typography>
                <Typography variant="body1" sx={{ color: "text.secondary", mt: 1 }}>
                  Sign in to access your portfolio
                </Typography>
              </Box>

              {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              {googleEnabled && (
                <Box>
                  <GoogleSignInButton
                    text="signin_with"
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

              <Box component="form" onSubmit={handleSubmit} noValidate>
                <TextField
                  fullWidth
                  name="username"
                  label="Username or email"
                  helperText="Sign in with either your username or the email you registered with"
                  type="text"
                  autoComplete="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AlternateEmail sx={{ color: "primary.main" }} />
                      </InputAdornment>
                    )
                  }}
                  sx={fieldSx}
                />

                <TextField
                  fullWidth
                  name="password"
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: "primary.main" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label={showPassword ? "Hide password" : "Show password"}
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: "primary.main" }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={fieldSx}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={loading}
                  sx={{
                    mt: 3,
                    mb: 2,
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    "&:hover": {
                      background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`
                    },
                    "&.Mui-disabled": {
                      background: theme.palette.action.disabledBackground,
                      color: theme.palette.action.disabled
                    }
                  }}
                >
                  {loading ? "Signing In..." : "Sign In"}
                </Button>

                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Don't have an account?{" "}
                    <Link
                      component={RouterLink}
                      to="/register"
                      sx={{
                        color: "primary.main",
                        fontWeight: 600,
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" }
                      }}
                    >
                      Sign up here
                    </Link>
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* Branding and features — below the form on phones. */}
          <Grid item xs={12} md={6} lg={5} sx={{ order: { xs: 2, md: 1 } }}>
            <Box sx={{ textAlign: { xs: "center", md: "left" } }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: { xs: 2, md: 3 },
                  justifyContent: { xs: "center", md: "flex-start" }
                }}
              >
                <AccountBalance
                  sx={{ fontSize: { xs: 36, md: 48 }, color: "primary.light", mr: 2 }}
                />
                <Box>
                  <Typography
                    variant={isMobile ? "h4" : "h3"}
                    sx={{
                      fontWeight: 800,
                      color: onHero,
                      background: `linear-gradient(45deg, ${theme.palette.primary.light}, ${theme.palette.secondary.light})`,
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent"
                    }}
                  >
                    Portfolio Pro
                  </Typography>
                  <Typography variant="subtitle1" sx={{ color: onHeroMuted, fontWeight: 500 }}>
                    Indian Stock Market Optimizer
                  </Typography>
                </Box>
              </Box>

              <Typography
                variant={isMobile ? "h5" : "h4"}
                sx={{ color: onHero, fontWeight: 600, mb: 2, lineHeight: 1.2 }}
              >
                Optimize Your Portfolio with
                <Box component="span" sx={{ color: "primary.light", display: "block" }}>
                  AI-Powered Insights
                </Box>
              </Typography>

              <Typography
                variant={isMobile ? "body1" : "h6"}
                sx={{ color: onHeroMuted, mb: { xs: 3, md: 4 }, lineHeight: 1.5 }}
              >
                Advanced portfolio optimization for the Indian stock market. Make smarter
                investment decisions with real-time analytics.
              </Typography>

              {/* Feature cards are pure marketing — hidden on narrow phones. */}
              <Grid container spacing={2} sx={{ display: { xs: "none", sm: "flex" } }}>
                {features.map((feature) => (
                  <Grid item xs={12} sm={6} key={feature.title}>
                    <Card
                      sx={{
                        height: "100%",
                        bgcolor: alpha(theme.palette.common.white, isDark ? 0.06 : 0.08),
                        backdropFilter: "blur(10px)",
                        borderColor: alpha(theme.palette.common.white, 0.16),
                        "@media (hover: hover)": {
                          "&:hover": {
                            bgcolor: alpha(theme.palette.common.white, isDark ? 0.1 : 0.14)
                          }
                        }
                      }}
                    >
                      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                          {feature.icon}
                          <Typography
                            variant="subtitle2"
                            sx={{ color: onHero, fontWeight: 600, ml: 1 }}
                          >
                            {feature.title}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ color: onHeroMuted, fontSize: "0.85rem", lineHeight: 1.4 }}
                        >
                          {feature.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Box
                sx={{
                  mt: { xs: 3, md: 4 },
                  display: "flex",
                  justifyContent: "space-around",
                  flexWrap: "wrap",
                  gap: 2
                }}
              >
                {stats.map((stat) => (
                  <Box key={stat.label} sx={{ textAlign: "center" }}>
                    <Typography variant="h5" sx={{ color: stat.color, fontWeight: 700 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: onHeroMuted }}>
                      {stat.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default LoginPage;
