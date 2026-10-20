import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ detail: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      detail: 'Validation failed',
      errors: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      detail: err.message,
      ...(err.details ? { errors: err.details } : {}),
    });
  }

  logger.error('Unhandled error', {
    requestId: req.requestId,
    message: err.message,
    stack: err.stack,
  });

  return res.status(500).json({ detail: 'Internal server error' });
}
