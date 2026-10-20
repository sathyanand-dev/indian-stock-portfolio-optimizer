import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as backtestingService from '../services/backtesting.service.js';

const router = Router();
router.use(requireAuth);

router.post('/backtest', async (req, res, next) => {
  try {
    const body = req.body || {};
    // Accept both array weights and Record<string, number>
    let { symbols, weights } = body;
    if (weights && !Array.isArray(weights) && typeof weights === 'object') {
      symbols = Object.keys(weights);
      weights = Object.values(weights);
    }
    res.json(
      await backtestingService.backtestPortfolio({
        ...body,
        symbols,
        weights,
      }),
    );
  } catch (err) {
    next(err);
  }
});

// Compatibility alias for older client path
router.post('/run', async (req, res, next) => {
  try {
    req.url = '/backtest';
    const body = req.body || {};
    let { symbols, weights } = body;
    if (weights && !Array.isArray(weights) && typeof weights === 'object') {
      symbols = Object.keys(weights);
      weights = Object.values(weights);
    }
    res.json(
      await backtestingService.backtestPortfolio({
        ...body,
        symbols,
        weights,
      }),
    );
  } catch (err) {
    next(err);
  }
});

router.post('/monte-carlo', async (req, res, next) => {
  try {
    res.json(await backtestingService.monteCarloSimulation(req.body || {}));
  } catch (err) {
    next(err);
  }
});

router.post('/compare', async (req, res, next) => {
  try {
    const { portfolios = [], start_date: startDate, end_date: endDate } = req.body || {};
    const results = [];
    for (const p of portfolios) {
      const symbols = p.symbols || Object.keys(p.weights || {});
      const weights = Array.isArray(p.weights)
        ? p.weights
        : symbols.map((s) => p.weights[s]);
      const backtest = await backtestingService.backtestPortfolio({
        symbols,
        weights,
        start_date: startDate,
        end_date: endDate,
      });
      results.push({
        name: p.name || 'Portfolio',
        ...backtest,
      });
    }
    results.sort((a, b) => (b.sharpe_ratio || 0) - (a.sharpe_ratio || 0));
    res.json({ strategies: results });
  } catch (err) {
    next(err);
  }
});

router.get('/stress-testing', async (req, res, next) => {
  try {
    const symbols = Array.isArray(req.query.symbols) ? req.query.symbols : [req.query.symbols];
    const weights = Array.isArray(req.query.weights)
      ? req.query.weights.map(Number)
      : [Number(req.query.weights)];
    res.json(
      await backtestingService.stressTest({
        symbols: symbols.filter(Boolean),
        weights: weights.filter((w) => Number.isFinite(w)),
      }),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
