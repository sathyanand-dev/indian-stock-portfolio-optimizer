import { z } from 'zod';

export const weightedSymbolsSchema = z.object({
  symbols: z.array(z.string().min(1)).min(1).max(20),
  weights: z.array(z.number().min(0).max(1)).optional(),
  period: z.string().default('1y'),
}).superRefine((value, context) => {
  if (value.weights && (value.weights.length !== value.symbols.length || Math.abs(value.weights.reduce((a, b) => a + b, 0) - 1) > 0.01)) {
    context.addIssue({ code: 'custom', message: 'Weights must match symbols and sum to 1.0', path: ['weights'] });
  }
});

export const optimizationSchema = weightedSymbolsSchema.extend({
  optimization_type: z.enum(['mean_variance', 'minimum_variance', 'risk_parity', 'black_litterman', 'monte_carlo']),
  risk_tolerance: z.enum(['conservative', 'moderate', 'aggressive']).default('moderate'),
  target_return: z.number().optional(),
  views: z.record(z.string(), z.number()).optional(),
  view_confidences: z.record(z.string(), z.number()).optional(),
  num_portfolios: z.number().int().min(1000).max(50000).default(10000),
});
