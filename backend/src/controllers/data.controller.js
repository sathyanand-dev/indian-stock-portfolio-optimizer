import { marketDataService } from '../services/marketData.service.js';
import { POPULAR_SYMBOLS } from '../data/indianEquities.js';
import { AppError } from '../lib/errors.js';

const symbolsFromQuery = (req) => {
  const value = req.query.symbols;
  const symbols = Array.isArray(value) ? value : String(value || '').split(',').filter(Boolean);
  if (!symbols.length || symbols.length > 20) throw new AppError(400, 'Provide between 1 and 20 symbols');
  return symbols;
};

export const dataController = {
  indices: async (_req, res) => res.json(await marketDataService.indices()),
  stock: async (req, res) => res.json(await marketDataService.quote(req.params.symbol)),
  historical: async (req, res) => res.json(await marketDataService.historical(req.params.symbol, req.query.period, req.query.interval)),
  batch: async (req, res) => res.json(await marketDataService.batch(req.body)),
  search: async (req, res) => res.json(marketDataService.search(req.query.query, Number(req.query.limit || 20))),
  correlation: async (req, res) => {
    const symbols = symbolsFromQuery(req);
    res.json({ symbols, correlation_matrix: await marketDataService.correlation(symbols, req.query.period || '1y'), period: req.query.period || '1y' });
  },
  returns: async (req, res) => {
    const symbols = symbolsFromQuery(req);
    const result = await marketDataService.alignedReturns(symbols, req.query.period || '1y');
    res.json({ symbols, returns_matrix: result.returns, dates: result.dates, period: req.query.period || '1y' });
  },
  popular: async (_req, res) => {
    const entries = await Promise.allSettled(POPULAR_SYMBOLS.map(async (symbol) => [symbol, await marketDataService.quote(symbol)]));
    res.json({ data: Object.fromEntries(entries.filter((item) => item.status === 'fulfilled').map((item) => item.value)) });
  },
  marketStatus: async (_req, res) => res.json({ market_open: marketDataService.marketOpen(), market_time: 'Market hours: 9:15 AM to 3:30 PM IST', currency: 'INR', indices: await marketDataService.indices() }),
};
