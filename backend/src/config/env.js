import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8001),
  SECRET_KEY: z.string().min(8),
  JWT_ALGORITHM: z.string().default('HS256'),
  ACCESS_TOKEN_EXPIRE_MINUTES: z.coerce.number().default(30),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  CACHE_DURATION_MINUTES: z.coerce.number().default(15),
  RISK_FREE_RATE: z.coerce.number().default(0.07),
  DEFAULT_MARKET_SUFFIX: z.string().default('.NS'),
  LOG_LEVEL: z.string().default('info'),
  FINNHUB_API_KEY: z.string().optional().default(''),
  IPO_GURU_API_KEY: z.string().optional().default(''),
  APP_URL: z.string().default('http://localhost:5173'),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  // Accepts an empty value from a partially filled .env rather than failing boot.
  SMTP_SECURE: z
    .string()
    .default('false')
    .transform((value) => value.trim().toLowerCase() === 'true'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASSWORD: z.string().optional().default(''),
  MAIL_FROM: z.string().optional().default('Portfolio Optimizer <no-reply@localhost>'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

if (data.NODE_ENV === 'production' && data.SECRET_KEY.includes('change')) {
  console.error('SECRET_KEY must be set to a strong value in production');
  process.exit(1);
}

export const env = {
  ...data,
  corsOrigins: data.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
  googleAuthEnabled: Boolean(data.GOOGLE_CLIENT_ID),
  smtpEnabled: Boolean(data.SMTP_HOST && data.SMTP_USER),
};
