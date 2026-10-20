import { Router } from 'express';
import { dataLimiter } from '../middleware/rateLimit.js';
import * as marketData from '../services/marketData.service.js';
import { badRequest } from '../lib/errors.js';

const router = Router();
router.use(dataLimiter);

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

router.get('/indices', async (_req, res, next) => {
  try {
    res.json(await marketData.getMarketIndices());
  } catch (err) {
    next(err);
  }
});

router.get('/stocks/:symbol', async (req, res, next) => {
  try {
    res.json(await marketData.getStockQuote(req.params.symbol));
  } catch (err) {
    next(err);
  }
});

router.get('/historical/:symbol', async (req, res, next) => {
  try {
    res.json(
      await marketData.getHistoricalData(
        req.params.symbol,
        req.query.period || '1y',
        req.query.interval || '1d',
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.post('/historical/batch', async (req, res, next) => {
  try {
    const { symbols, period, interval } = req.body || {};
    res.json(await marketData.getHistoricalBatch(symbols, period || '1y', interval || '1d'));
  } catch (err) {
    next(err);
  }
});

router.get('/search/symbols', async (req, res, next) => {
  try {
    res.json(await marketData.searchEquities(req.query.query || '', Number(req.query.limit || 20)));
  } catch (err) {
    next(err);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.query || '');
    if (q.trim().length < 2) throw badRequest('Query must be at least 2 characters long');
    const matches = await marketData.searchEquities(q, Number(req.query.limit || 10));
    const quotes = [];
    for (const m of matches) {
      try {
        const quote = await marketData.getStockQuote(m.symbol);
        quotes.push({ ...quote, company_name: m.name });
      } catch {
        // skip
      }
    }
    res.json(quotes);
  } catch (err) {
    next(err);
  }
});

router.get('/correlation', async (req, res, next) => {
  try {
    res.json(
      await marketData.getCorrelationMatrix(asArray(req.query.symbols), req.query.period || '1y'),
    );
  } catch (err) {
    next(err);
  }
});

router.get('/returns-matrix', async (req, res, next) => {
  try {
    res.json(
      await marketData.getReturnsMatrix(asArray(req.query.symbols), req.query.period || '1y'),
    );
  } catch (err) {
    next(err);
  }
});

router.get('/company/:symbol/research', async (req, res, next) => {
  try {
    const { researchCompany } = await import('../services/companyResearch.service.js');
    res.json(await researchCompany(req.params.symbol));
  } catch (err) {
    next(err);
  }
});

router.get('/popular', async (_req, res, next) => {
  try {
    res.json(await marketData.getPopular());
  } catch (err) {
    next(err);
  }
});

router.get('/market-status', async (_req, res, next) => {
  try {
    res.json(await marketData.getMarketStatus());
  } catch (err) {
    next(err);
  }
});

router.get('/multiple', async (req, res, next) => {
  try {
    const symbols = asArray(req.query.symbols).slice(0, 50);
    const data = {};
    await Promise.all(
      symbols.map(async (s) => {
        try {
          data[s] = await marketData.getStockQuote(s);
        } catch {
          // skip
        }
      }),
    );
    res.json({ data, count: Object.keys(data).length });
  } catch (err) {
    next(err);
  }
});

export default router;
