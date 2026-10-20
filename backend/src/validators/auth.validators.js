import { z } from 'zod';

const horizonToMonths = (value) => {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const key = String(value).trim().toLowerCase();
  const map = {
    '1y': 12,
    '3y': 36,
    '5y': 60,
    '10y': 120,
    long_term: 180,
  };
  if (map[key] != null) return map[key];
  const parsed = Number(key);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
};

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(128),
  full_name: z.string().optional().nullable(),
  risk_tolerance: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate'),
  investment_horizon: z.preprocess(horizonToMonths, z.number().int().positive().default(60)),
});

export const updateUserSchema = z.object({
  full_name: z.string().optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  risk_tolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  investment_horizon: z.preprocess(horizonToMonths, z.number().int().positive().optional()),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1).optional(),
  new_password: z.string().min(8).max(128),
});

export const googleAuthSchema = z.object({
  credential: z.string().min(20),
});

export const preferencesSchema = z
  .object({
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    language: z.enum(['en', 'hi', 'ta']).optional(),
    date_format: z.enum(['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd']).optional(),
    number_format: z.enum(['indian', 'international']).optional(),
    currency: z.enum(['INR', 'USD']).optional(),
    density: z.enum(['comfortable', 'compact']).optional(),
    email_notifications: z.boolean().optional(),
    portfolio_alerts: z.boolean().optional(),
    market_news_alerts: z.boolean().optional(),
    performance_reports: z.boolean().optional(),
    ipo_alerts: z.boolean().optional(),
    digest_frequency: z.enum(['daily', 'weekly', 'monthly', 'never']).optional(),
    data_retention: z.enum(['1y', '2y', '5y', 'forever']).optional(),
    analytics_opt_in: z.boolean().optional(),
    beta_features: z.boolean().optional(),
  })
  .strict();
