import { Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader';
import LoadingState from '../../../components/common/LoadingState';
import ProfileSection from '../components/ProfileSection';
import InvestmentDefaultsSection from '../components/InvestmentDefaultsSection';
import AppearanceSection from '../components/AppearanceSection';
import NotificationsSection from '../components/NotificationsSection';
import SecuritySection from '../components/SecuritySection';
import DataPrivacySection from '../components/DataPrivacySection';
import DangerZoneCard from '../components/DangerZoneCard';
import { usePreferences } from '../../../app/PreferencesContext';
import { useAuth } from '../../auth/context/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';

/**
 * Every control here writes straight through to the account: profile fields go
 * to `PUT /auth/me`, and the toggles go to `PUT /auth/me/preferences` via
 * `PreferencesContext`. Nothing is kept only in the browser.
 */
export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { isLoading: arePreferencesLoading, isSaving } = usePreferences();

  if (isAuthLoading || arePreferencesLoading || !user) {
    return <LoadingState message="Loading your settings…" />;
  }

  return (
    <Box>
      <PageHeader
        title="Settings"
        subtitle="These apply to your account, so they follow you to every device you sign in on."
        actions={
          isSaving ? <Chip size="small" color="info" label="Saving…" /> : null
        }
      />

      <ProfileSection />
      <InvestmentDefaultsSection />
      <AppearanceSection />
      <NotificationsSection />
      <SecuritySection />
      <DataPrivacySection />
      <DangerZoneCard onDeleted={() => navigate(ROUTES.LOGIN, { replace: true })} />
    </Box>
  );
}
