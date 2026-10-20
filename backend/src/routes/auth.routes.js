import { Router } from 'express';
import * as authService from '../services/auth.service.js';
import * as preferencesService from '../services/preferences.service.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import {
  registerSchema,
  updateUserSchema,
  changePasswordSchema,
  googleAuthSchema,
  preferencesSchema,
} from '../validators/auth.validators.js';
import { serializeUser } from '../lib/serialize.js';
import { badRequest } from '../lib/errors.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const user = await authService.registerUser(req.body);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const username = req.body.username;
    const password = req.body.password;
    if (!username || !password) throw badRequest('username and password are required');
    const token = await authService.loginUser(username, password);
    res.json(token);
  } catch (err) {
    next(err);
  }
});

router.post('/google', authLimiter, validate(googleAuthSchema), async (req, res, next) => {
  try {
    const result = await authService.googleSignIn(req.body.credential);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/change-password',
  requireAuth,
  validate(changePasswordSchema),
  async (req, res, next) => {
    try {
      const result = await authService.changePassword(req.user, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.get('/me', requireAuth, (req, res) => {
  res.json(serializeUser(req.user));
});

router.put('/me', requireAuth, validate(updateUserSchema), async (req, res, next) => {
  try {
    const user = await authService.updateUser(req.user.id, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/me/preferences', requireAuth, async (req, res, next) => {
  try {
    res.json(await preferencesService.getPreferences(req.user.id));
  } catch (err) {
    next(err);
  }
});

router.put(
  '/me/preferences',
  requireAuth,
  validate(preferencesSchema),
  async (req, res, next) => {
    try {
      res.json(await preferencesService.updatePreferences(req.user.id, req.body));
    } catch (err) {
      next(err);
    }
  },
);

router.post('/me/preferences/reset', requireAuth, async (req, res, next) => {
  try {
    res.json(await preferencesService.resetPreferences(req.user.id));
  } catch (err) {
    next(err);
  }
});

router.get('/me/export', requireAuth, async (req, res, next) => {
  try {
    res.json(await authService.exportAccount(req.user.id));
  } catch (err) {
    next(err);
  }
});

router.delete('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await authService.deactivateUser(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
