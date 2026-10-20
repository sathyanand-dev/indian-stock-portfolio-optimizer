import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { unauthorized } from './errors.js';

export function createAccessToken(payload, expiresMinutes = env.ACCESS_TOKEN_EXPIRE_MINUTES) {
  return jwt.sign(payload, env.SECRET_KEY, {
    algorithm: env.JWT_ALGORITHM,
    expiresIn: `${expiresMinutes}m`,
  });
}

export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, env.SECRET_KEY, {
      algorithms: [env.JWT_ALGORITHM],
    });
    if (!decoded?.sub) {
      throw unauthorized();
    }
    return { username: decoded.sub };
  } catch {
    throw unauthorized();
  }
}
