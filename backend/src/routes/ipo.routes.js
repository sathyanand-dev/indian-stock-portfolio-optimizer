import { Router } from 'express';
import { dataLimiter } from '../middleware/rateLimit.js';
import * as ipoService from '../services/ipo.service.js';

const router = Router();
router.use(dataLimiter);

router.get('/', async (req, res, next) => {
  try {
    const status = String(req.query.status || 'open').toLowerCase();
    res.json(await ipoService.listIpos(status));
  } catch (err) {
    next(err);
  }
});

router.get('/:symbol/analysis', async (req, res, next) => {
  try {
    res.json(await ipoService.getIpoAnalysis(req.params.symbol));
  } catch (err) {
    next(err);
  }
});

router.get('/:symbol', async (req, res, next) => {
  try {
    res.json(await ipoService.getIpo(req.params.symbol));
  } catch (err) {
    next(err);
  }
});

export default router;
