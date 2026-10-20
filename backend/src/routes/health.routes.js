import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

async function health(_req, res, next) {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      message: 'Indian Portfolio Optimizer API is running',
      service: 'revamp-backend',
    });
  } catch (err) {
    next(err);
  }
}

router.get('/health', health);
router.get('/api/v1/health', health);

function apiInfo(_req, res) {
  res.json({
    name: 'Indian Portfolio Optimizer API',
    version: '1.0.0',
    stack: 'express-js',
    docs: {
      health: '/health',
      api: '/api/v1',
      endpoints: [
        '/api/v1/auth',
        '/api/v1/portfolios',
        '/api/v1/data',
        '/api/v1/optimization',
        '/api/v1/analytics',
        '/api/v1/backtesting',
      ],
    },
  });
}

router.get('/', apiInfo);
router.get('/api/v1', apiInfo);

export default router;
