import { z } from 'zod';

const holdingSchema = z.object({
  symbol: z.string().min(1),
  weight: z.number().min(0).max(1),
  quantity: z.number().optional().nullable(),
  avg_purchase_price: z.number().optional().nullable(),
});

export const createPortfolioSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional().nullable(),
  holdings: z.array(holdingSchema).default([]),
  optimization_method: z.string().optional().nullable(),
  risk_tolerance: z.string().optional().nullable(),
  investment_amount: z.number().optional().nullable(),
  expected_return: z.number().optional().nullable(),
  expected_volatility: z.number().optional().nullable(),
  sharpe_ratio: z.number().optional().nullable(),
});

export const updatePortfolioSchema = createPortfolioSchema.partial();
