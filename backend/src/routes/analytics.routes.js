import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as analyticsService from '../services/analytics.service.js';
import * as marketData from '../services/marketData.service.js';
import { badRequest } from '../lib/errors.js';

const router = Router();
router.use(requireAuth);

router.post('/performance', (req, res, next) => {
  try {
    const { portfolio_returns: returns, benchmark_returns: bench, risk_free_rate: rf } =
      req.body || {};
    if (!Array.isArray(returns)) throw badRequest('portfolio_returns array required');
    res.json(analyticsService.calculatePerformanceMetrics(returns, bench || null, rf));
  } catch (err) {
    next(err);
  }
});

router.post('/risk', (req, res, next) => {
  try {
    const { portfolio_returns: returns, benchmark_returns: bench } = req.body || {};
    if (!Array.isArray(returns)) throw badRequest('portfolio_returns array required');
    res.json(analyticsService.calculateRiskMetrics(returns, bench || null));
  } catch (err) {
    next(err);
  }
});

router.post('/portfolio-analysis', async (req, res, next) => {
  try {
    res.json(await analyticsService.analyzePortfolioPerformance(req.body || {}));
  } catch (err) {
    next(err);
  }
});

router.get('/correlation-analysis', async (req, res, next) => {
  try {
    const symbols = Array.isArray(req.query.symbols) ? req.query.symbols : [req.query.symbols];
    const data = await marketData.getCorrelationMatrix(
      symbols.filter(Boolean),
      req.query.period || '1y',
    );
    const matrix = data.correlation_matrix;
    let sum = 0;
    let count = 0;
    for (let i = 0; i < matrix.length; i += 1) {
      for (let j = i + 1; j < matrix.length; j += 1) {
        sum += matrix[i][j];
        count += 1;
      }
    }
    const avg = count ? sum / count : 0;
    res.json({
      ...data,
      average_correlation: avg,
      diversification_score: Math.max(0, 1 - avg),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
