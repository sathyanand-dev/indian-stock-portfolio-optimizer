import { Router } from 'express';
import { env } from '../config/env.js';

const router = Router();

/**
 * Public, non-secret runtime capabilities so the web app can hide features that
 * are not configured on this server. The Google client ID is public by design.
 */
router.get('/', (req, res) => {
  res.json({
    google_auth: {
      enabled: env.googleAuthEnabled,
      client_id: env.GOOGLE_CLIENT_ID || null,
    },
    email_notifications: { enabled: env.smtpEnabled },
    features: {
      company_research_news: Boolean(env.FINNHUB_API_KEY),
      ipo_gmp: Boolean(env.IPO_GURU_API_KEY),
    },
    default_market_suffix: env.DEFAULT_MARKET_SUFFIX,
  });
});

export default router;
