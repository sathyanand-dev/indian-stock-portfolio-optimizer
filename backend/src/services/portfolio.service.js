import { prisma } from '../lib/prisma.js';
import { badRequest, notFound, forbidden } from '../lib/errors.js';
import { serializePortfolio } from '../lib/serialize.js';
import { notify } from './notification.service.js';

function assertWeightSum(holdings) {
  if (!holdings?.length) return;
  const sum = holdings.reduce((acc, h) => acc + Number(h.weight || 0), 0);
  if (Math.abs(sum - 1) > 0.02) {
    throw badRequest(`Holding weights must sum to ~1.0 (got ${sum.toFixed(4)})`);
  }
}

async function getOwnedPortfolio(portfolioId, userId, includeHoldings = true) {
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId, isActive: true },
    include: includeHoldings ? { holdings: true } : undefined,
  });
  if (!portfolio) throw notFound('Portfolio not found');
  return portfolio;
}

export async function listPortfolios(userId, skip = 0, limit = 100) {
  const portfolios = await prisma.portfolio.findMany({
    where: { userId, isActive: true },
    include: { holdings: true },
    skip,
    take: Math.min(limit, 100),
    orderBy: { createdAt: 'desc' },
  });
  return portfolios.map(serializePortfolio);
}

export async function createPortfolio(userId, input) {
  assertWeightSum(input.holdings);

  const portfolio = await prisma.portfolio.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      userId,
      optimizationMethod: input.optimization_method ?? null,
      riskTolerance: input.risk_tolerance ?? null,
      investmentAmount: input.investment_amount ?? null,
      expectedReturn: input.expected_return ?? null,
      expectedVolatility: input.expected_volatility ?? null,
      sharpeRatio: input.sharpe_ratio ?? null,
      holdings: {
        create: (input.holdings || []).map((h) => ({
          symbol: h.symbol.toUpperCase(),
          weight: h.weight,
          quantity: h.quantity ?? null,
          avgPurchasePrice: h.avg_purchase_price ?? null,
        })),
      },
    },
    include: { holdings: true },
  });

  await notify(userId, {
    type: 'portfolio',
    title: `Portfolio "${portfolio.name}" saved`,
    body: `${portfolio.holdings.length} holdings${
      portfolio.expectedReturn != null
        ? ` · expected return ${(portfolio.expectedReturn * 100).toFixed(1)}%`
        : ''
    }${
      portfolio.expectedVolatility != null
        ? ` · volatility ${(portfolio.expectedVolatility * 100).toFixed(1)}%`
        : ''
    }.`,
    link: '/portfolios',
    severity: 'success',
  });

  return serializePortfolio(portfolio);
}

export async function getPortfolio(portfolioId, userId) {
  const portfolio = await getOwnedPortfolio(portfolioId, userId);
  return serializePortfolio(portfolio);
}

export async function updatePortfolio(portfolioId, userId, input) {
  await getOwnedPortfolio(portfolioId, userId, false);
  if (input.holdings) assertWeightSum(input.holdings);

  const portfolio = await prisma.$transaction(async (tx) => {
    if (input.holdings) {
      await tx.portfolioHolding.deleteMany({ where: { portfolioId } });
      await tx.portfolioHolding.createMany({
        data: input.holdings.map((h) => ({
          portfolioId,
          symbol: h.symbol.toUpperCase(),
          weight: h.weight,
          quantity: h.quantity ?? null,
          avgPurchasePrice: h.avg_purchase_price ?? null,
        })),
      });
    }

    return tx.portfolio.update({
      where: { id: portfolioId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.optimization_method !== undefined
          ? { optimizationMethod: input.optimization_method }
          : {}),
        ...(input.risk_tolerance !== undefined ? { riskTolerance: input.risk_tolerance } : {}),
        ...(input.investment_amount !== undefined
          ? { investmentAmount: input.investment_amount }
          : {}),
        ...(input.expected_return !== undefined ? { expectedReturn: input.expected_return } : {}),
        ...(input.expected_volatility !== undefined
          ? { expectedVolatility: input.expected_volatility }
          : {}),
        ...(input.sharpe_ratio !== undefined ? { sharpeRatio: input.sharpe_ratio } : {}),
      },
      include: { holdings: true },
    });
  });

  return serializePortfolio(portfolio);
}

export async function deletePortfolio(portfolioId, userId) {
  await getOwnedPortfolio(portfolioId, userId, false);
  await prisma.portfolio.update({
    where: { id: portfolioId },
    data: { isActive: false },
  });
  return { message: 'Portfolio deleted successfully' };
}

export async function ensureOwnership(portfolioId, userId) {
  const portfolio = await getOwnedPortfolio(portfolioId, userId);
  if (portfolio.userId !== userId) throw forbidden();
  return portfolio;
}
