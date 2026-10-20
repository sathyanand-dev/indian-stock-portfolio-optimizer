import { optimizationService } from '../services/optimization.service.js';
import { analyticsService } from '../services/analytics.service.js';
import { backtestingService } from '../services/backtesting.service.js';

export const analysisController = {
  optimize: async (req, res) => res.json(await optimizationService.optimize(req.body)),
  performance: async (req, res) => res.json(analyticsService.performanceMetrics(req.body.returns, req.body.benchmark_returns)),
  risk: async (req, res) => res.json(analyticsService.riskMetrics(req.body.returns, req.body.benchmark_returns)),
  analyze: async (req, res) => res.json(await analyticsService.analyze(req.body)),
  backtest: async (req, res) => res.json(await backtestingService.backtest(req.body)),
  monteCarlo: async (req, res) => res.json(await backtestingService.monteCarlo(req.body)),
  stress: async (req, res) => res.json(backtestingService.stressTest(req.body)),
};
