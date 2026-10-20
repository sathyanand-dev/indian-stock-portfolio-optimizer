import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Save as SaveIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import SettingsSection from './SettingsSection';
import { useAuth } from '../../auth/context/AuthContext';
import { useToast } from '../../../app/ToastContext';
import { useIsCompact } from '../../../shared/hooks/useIsMobile';
import * as authApi from '../../../api/auth.api';
import { getApiErrorMessage } from '../../../shared/utils/apiError';

const RISK_OPTIONS = [
  {
    value: 'conservative',
    label: 'Conservative',
    description: 'Protect what you have first — steadier returns and smaller ups and downs.',
  },
  {
    value: 'moderate',
    label: 'Moderate',
    description: 'A balance of growth and stability — the usual choice for a long-term investor.',
  },
  {
    value: 'aggressive',
    label: 'Aggressive',
    description: 'Aim for the highest growth and accept much sharper falls along the way.',
  },
];

const HORIZON_OPTIONS = [
  { value: 12, label: '12 months (1 year)' },
  { value: 36, label: '36 months (3 years)' },
  { value: 60, label: '60 months (5 years)' },
  { value: 120, label: '120 months (10 years)' },
  { value: 180, label: '180 months (15+ years)' },
];

export default function InvestmentDefaultsSection() {
  const { user, refreshUser } = useAuth();
  const { showSuccess, showError } = useToast();
  const isCompact = useIsCompact();

  const [risk, setRisk] = useState(user?.risk_tolerance ?? 'moderate');
  const [horizon, setHorizon] = useState(user?.investment_horizon ?? 60);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRisk(user?.risk_tolerance ?? 'moderate');
    setHorizon(user?.investment_horizon ?? 60);
  }, [user?.risk_tolerance, user?.investment_horizon]);

  const isDirty =
    risk !== (user?.risk_tolerance ?? 'moderate') || horizon !== (user?.investment_horizon ?? 60);

  const selectedRisk = RISK_OPTIONS.find((option) => option.value === risk) ?? RISK_OPTIONS[1];

  // An account may hold a horizon that predates these presets; keep it selectable.
  const horizonOptions = useMemo(() => {
    if (HORIZON_OPTIONS.some((option) => option.value === horizon)) return HORIZON_OPTIONS;
    return [...HORIZON_OPTIONS, { value: horizon, label: `${horizon} months` }].sort(
      (a, b) => a.value - b.value,
    );
  }, [horizon]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await authApi.updateCurrentUser({ risk_tolerance: risk, investment_horizon: horizon });
      await refreshUser();
      showSuccess('Investment defaults saved');
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not save your investment defaults'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SettingsSection
      icon={<TrendingUpIcon />}
      title="Investment defaults"
      subtitle="Pre-fills every new optimisation and risk report"
    >
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="subtitle2" gutterBottom>
            Default risk tolerance
          </Typography>

          <ToggleButtonGroup
            exclusive
            fullWidth
            color="primary"
            orientation={isCompact ? 'vertical' : 'horizontal'}
            value={risk}
            onChange={(event, value) => {
              if (value) setRisk(value);
            }}
            aria-label="Default risk tolerance"
          >
            {RISK_OPTIONS.map((option) => (
              <ToggleButton key={option.value} value={option.value}>
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {selectedRisk.description}
          </Typography>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth>
            <InputLabel id="horizon-label">Investment horizon</InputLabel>
            <Select
              labelId="horizon-label"
              label="Investment horizon"
              value={horizon}
              onChange={(event) => setHorizon(Number(event.target.value))}
            >
              {horizonOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>How long you expect to stay invested before withdrawing</FormHelperText>
          </FormControl>
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
