import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createPortfolioSchema,
  updatePortfolioSchema,
} from '../validators/portfolio.validators.js';
import * as portfolioService from '../services/portfolio.service.js';
import * as analyticsService from '../services/analytics.service.js';
import * as optimizationService from '../services/optimization.service.js';
import { badRequest } from '../lib/errors.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const skip = Number(req.query.skip || 0);
    const limit = Number(req.query.limit || 100);
    res.json(await portfolioService.listPortfolios(req.user.id, skip, limit));
  } catch (err) {
    next(err);
  }
});

router.post('/', validate(createPortfolioSchema), async (req, res, next) => {
  try {
    res.status(201).json(await portfolioService.createPortfolio(req.user.id, req.body));
  } catch (err) {
    next(err);
  }
});

router.get('/:portfolioId', async (req, res, next) => {
  try {
    res.json(await portfolioService.getPortfolio(Number(req.params.portfolioId), req.user.id));
  } catch (err) {
    next(err);
  }
});

router.put('/:portfolioId', validate(updatePortfolioSchema), async (req, res, next) => {
  try {
    res.json(
      await portfolioService.updatePortfolio(Number(req.params.portfolioId), req.user.id, req.body),
    );
  } catch (err) {
    next(err);
  }
});

router.delete('/:portfolioId', async (req, res, next) => {
  try {
    res.json(await portfolioService.deletePortfolio(Number(req.params.portfolioId), req.user.id));
  } catch (err) {
    next(err);
  }
});

router.get('/:portfolioId/performance', async (req, res, next) => {
  try {
    const portfolio = await portfolioService.ensureOwnership(
      Number(req.params.portfolioId),
      req.user.id,
    );
    if (!portfolio.holdings?.length) throw badRequest('Portfolio has no holdings');

    const symbols = portfolio.holdings.map((h) => h.symbol);
    const weights = portfolio.holdings.map((h) => h.weight);
    const analysis = await analyticsService.analyzePortfolioPerformance({
      symbols,
      weights,
      startDate: req.query.start_date,
      endDate: req.query.end_date,
      benchmark: req.query.benchmark || '^NSEI',
    });
    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

router.get('/:portfolioId/optimize', async (req, res, next) => {
  try {
    const portfolio = await portfolioService.ensureOwnership(
      Number(req.params.portfolioId),
      req.user.id,
    );
    const symbols = portfolio.holdings.map((h) => h.symbol);
    const current = Object.fromEntries(portfolio.holdings.map((h) => [h.symbol, h.weight]));
    const optimized = await optimizationService.optimizePortfolio({
      symbols,
      optimization_type: req.query.optimization_type || 'mean_variance',
      risk_tolerance: req.query.risk_tolerance || portfolio.riskTolerance || 'moderate',
    });
    res.json({ current_weights: current, optimized });
  } catch (err) {
    next(err);
  }
});

export default router;
