import { Router } from 'express';
import authRoutes from './auth.routes.js';
import portfoliosRoutes from './portfolios.routes.js';
import dataRoutes from './data.routes.js';
import optimizationRoutes from './optimization.routes.js';
import analyticsRoutes from './analytics.routes.js';
import backtestingRoutes from './backtesting.routes.js';
import ipoRoutes from './ipo.routes.js';
import notificationsRoutes from './notifications.routes.js';
import configRoutes from './config.routes.js';

const api = Router();

api.use('/config', configRoutes);
api.use('/auth', authRoutes);
api.use('/notifications', notificationsRoutes);
api.use('/portfolios', portfoliosRoutes);
api.use('/data', dataRoutes);
api.use('/optimization', optimizationRoutes);
api.use('/analytics', analyticsRoutes);
api.use('/backtesting', backtestingRoutes);
api.use('/ipo', ipoRoutes);

export default api;
