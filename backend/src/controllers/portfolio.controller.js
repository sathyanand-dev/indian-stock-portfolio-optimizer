import { portfolioService } from '../services/portfolio.service.js';

export const portfolioController = {
  list: async (req, res) => res.json(await portfolioService.list(req.user.id, Number(req.query.skip || 0), Number(req.query.limit || 100))),
  create: async (req, res) => res.status(201).json(await portfolioService.create(req.user.id, req.body)),
  get: async (req, res) => res.json(await portfolioService.get(Number(req.params.id), req.user.id)),
  update: async (req, res) => res.json(await portfolioService.update(Number(req.params.id), req.user.id, req.body)),
  remove: async (req, res) => {
    await portfolioService.remove(Number(req.params.id), req.user.id);
    res.json({ message: 'Portfolio deleted successfully' });
  },
};
