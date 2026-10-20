import { Router } from 'express';
import * as notificationService from '../services/notification.service.js';
import { requireAuth } from '../middleware/auth.js';
import { badRequest } from '../lib/errors.js';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const result = await notificationService.listNotifications(req.user.id, {
      limit: Number(req.query.limit) || 30,
      unreadOnly: req.query.unread === 'true',
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/read-all', async (req, res, next) => {
  try {
    res.json(await notificationService.markAllRead(req.user.id));
  } catch (err) {
    next(err);
  }
});

router.post('/test-email', async (req, res, next) => {
  try {
    res.json(await notificationService.sendTestEmail(req.user));
  } catch (err) {
    next(err);
  }
});

router.post('/:notificationId/read', async (req, res, next) => {
  try {
    const id = Number(req.params.notificationId);
    if (!Number.isInteger(id)) throw badRequest('notificationId must be an integer');
    res.json(await notificationService.markRead(req.user.id, id));
  } catch (err) {
    next(err);
  }
});

router.delete('/', async (req, res, next) => {
  try {
    res.json(await notificationService.clearAll(req.user.id));
  } catch (err) {
    next(err);
  }
});

export default router;
