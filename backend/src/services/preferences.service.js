import { prisma } from '../lib/prisma.js';
import { serializePreferences } from '../lib/serialize.js';

/** Field defaults mirror prisma/schema.prisma so a missing row still returns a full object. */
export const PREFERENCE_DEFAULTS = {
  theme: 'light',
  language: 'en',
  dateFormat: 'dd/MM/yyyy',
  numberFormat: 'indian',
  currency: 'INR',
  density: 'comfortable',
  emailNotifications: true,
  portfolioAlerts: true,
  marketNewsAlerts: false,
  performanceReports: true,
  ipoAlerts: true,
  digestFrequency: 'weekly',
  dataRetention: '2y',
  analyticsOptIn: false,
  betaFeatures: false,
};

/** snake_case API field -> camelCase Prisma column. */
const FIELD_MAP = {
  theme: 'theme',
  language: 'language',
  date_format: 'dateFormat',
  number_format: 'numberFormat',
  currency: 'currency',
  density: 'density',
  email_notifications: 'emailNotifications',
  portfolio_alerts: 'portfolioAlerts',
  market_news_alerts: 'marketNewsAlerts',
  performance_reports: 'performanceReports',
  ipo_alerts: 'ipoAlerts',
  digest_frequency: 'digestFrequency',
  data_retention: 'dataRetention',
  analytics_opt_in: 'analyticsOptIn',
  beta_features: 'betaFeatures',
};

export async function getPreferences(userId) {
  const row = await prisma.userPreference.findUnique({ where: { userId } });
  return serializePreferences(row ?? { userId, ...PREFERENCE_DEFAULTS });
}

/** Returns the raw camelCase record, creating it on first read. Used by the notification dispatcher. */
export async function getRawPreferences(userId) {
  const row = await prisma.userPreference.findUnique({ where: { userId } });
  return row ?? { userId, ...PREFERENCE_DEFAULTS };
}

export async function updatePreferences(userId, input) {
  const data = {};
  for (const [apiField, column] of Object.entries(FIELD_MAP)) {
    if (input[apiField] !== undefined) data[column] = input[apiField];
  }

  const row = await prisma.userPreference.upsert({
    where: { userId },
    create: { userId, ...PREFERENCE_DEFAULTS, ...data },
    update: data,
  });

  return serializePreferences(row);
}

export async function resetPreferences(userId) {
  const row = await prisma.userPreference.upsert({
    where: { userId },
    create: { userId, ...PREFERENCE_DEFAULTS },
    update: PREFERENCE_DEFAULTS,
  });
  return serializePreferences(row);
}
