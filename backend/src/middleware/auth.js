import { prisma } from '../lib/prisma.js';
import { verifyAccessToken } from '../lib/jwt.js';
import { unauthorized, forbidden } from '../lib/errors.js';

export async function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw unauthorized();
    }

    const { username } = verifyAccessToken(token);
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) throw unauthorized();
    if (!user.isActive) throw forbidden('Inactive user');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
