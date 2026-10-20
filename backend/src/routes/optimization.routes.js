import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as optimizationService from '../services/optimization.service.js';

const router = Router();
router.use(requireAuth);

const optimizeSchema = z.object({
  symbols: z.array(z.string()).min(2),
  optimization_type: z.enum([
    'mean_variance',
    'minimum_variance',
    'risk_parity',
    'black_litterman',
    'monte_carlo',
  ]),
  risk_tolerance: z.enum(['conservative', 'moderate', 'aggressive']).optional(),
  lookback_period: z.union([z.string(), z.number()]).optional(),
  min_weights: z.record(z.number()).optional(),
  max_weights: z.record(z.number()).optional(),
  target_return: z.number().optional(),
  risk_aversion: z.number().optional(),
  confidence_level: z.number().optional(),
  views: z.record(z.number()).optional(),
  num_simulations: z.number().int().optional(),
});

router.post('/optimize', validate(optimizeSchema), async (req, res, next) => {
  try {
    res.json(await optimizationService.optimizePortfolio(req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/mean-variance', async (req, res, next) => {
  try {
    const symbols = req.body.symbols || req.query.symbols;
    res.json(
      await optimizationService.meanVarianceOptimization(
        Array.isArray(symbols) ? symbols : [symbols].filter(Boolean),
        req.body.risk_tolerance || req.query.risk_tolerance || 'moderate',
        req.body.lookback_period || req.query.lookback_period || '1y',
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.post('/minimum-variance', async (req, res, next) => {
  try {
    const symbols = req.body.symbols || req.query.symbols;
    res.json(
      await optimizationService.minimumVarianceOptimization(
        Array.isArray(symbols) ? symbols : [symbols].filter(Boolean),
        req.body.lookback_period || '1y',
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.post('/risk-parity', async (req, res, next) => {
  try {
    const symbols = req.body.symbols || req.query.symbols;
    res.json(
      await optimizationService.riskParityOptimization(
        Array.isArray(symbols) ? symbols : [symbols].filter(Boolean),
        req.body.lookback_period || '1y',
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.post('/black-litterman', async (req, res, next) => {
  try {
    res.json(
      await optimizationService.blackLittermanOptimization(
        req.body.symbols,
        req.body.views || {},
        req.body.lookback_period || '1y',
        req.body.risk_tolerance || 'moderate',
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.get('/asset-allocation', (req, res) => {
  res.json(
    optimizationService.suggestAssetAllocation(
      req.query.risk_tolerance || 'moderate',
      Number(req.query.investment_horizon || 60),
    ),
  );
});

router.get('/recommended-portfolios', (req, res) => {
  const risk = req.user.riskTolerance || 'moderate';
  res.json({
    risk_tolerance: risk,
    templates: {
      conservative: ['NIFTYBEES.NS', 'GOLDBEES.NS', 'BANKBEES.NS'],
      moderate: ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'NIFTYBEES.NS'],
      aggressive: ['RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'TATAMOTORS.NS', 'ZOMATO.NS'],
    }[risk],
  });
});

export default router;
