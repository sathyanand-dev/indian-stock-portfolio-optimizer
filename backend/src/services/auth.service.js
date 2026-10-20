import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { createAccessToken } from '../lib/jwt.js';
import { badRequest, unauthorized, conflict } from '../lib/errors.js';
import { serializeUser } from '../lib/serialize.js';
import { PREFERENCE_DEFAULTS } from './preferences.service.js';
import { notify } from './notification.service.js';

let googleClient = null;
const getGoogleClient = () => {
  if (!googleClient) googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  return googleClient;
};

const issueToken = (user) => ({
  access_token: createAccessToken({ sub: user.username }),
  token_type: 'bearer',
});

async function sendWelcomeNotification(user) {
  await notify(user.id, {
    type: 'account',
    title: 'Welcome to Portfolio Optimizer',
    body: 'Build your first optimized portfolio from the Optimize page, then track it under My Portfolios.',
    link: '/optimize',
    severity: 'success',
  });
}

export async function registerUser(input) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.email }, { username: input.username }],
    },
  });
  if (existing) throw conflict('Email or username already registered');

  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      hashedPassword: await hashPassword(input.password),
      fullName: input.full_name ?? null,
      riskTolerance: input.risk_tolerance ?? 'moderate',
      investmentHorizon: input.investment_horizon ?? 60,
      preferences: { create: { ...PREFERENCE_DEFAULTS } },
    },
  });

  await sendWelcomeNotification(user);
  return serializeUser(user);
}

export async function loginUser(username, password) {
  const identifier = String(username).trim();
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: identifier }, { email: identifier.toLowerCase() }] },
  });

  if (!user) throw unauthorized('Incorrect username or password');

  if (!user.hashedPassword) {
    throw badRequest(
      'This account was created with Google. Use "Continue with Google", then set a password in Settings.',
    );
  }
  if (!(await verifyPassword(password, user.hashedPassword))) {
    throw unauthorized('Incorrect username or password');
  }
  if (!user.isActive) throw badRequest('Inactive user');

  return issueToken(user);
}

/** Builds a unique username from a Google email/name. */
async function uniqueUsername(seed) {
  const base =
    String(seed || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20) || 'user';

  let candidate = base.length >= 3 ? base : `${base}user`;
  let attempt = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    attempt += 1;
    candidate = `${base}${attempt}`.slice(0, 30);
  }
  return candidate;
}

/**
 * Verifies a Google ID token from the browser (GIS) and signs the user in,
 * linking to an existing account by email or creating a new one.
 */
export async function googleSignIn(credential) {
  if (!env.googleAuthEnabled) {
    throw badRequest('Google sign-in is not configured on this server (GOOGLE_CLIENT_ID missing)');
  }

  let payload;
  try {
    const ticket = await getGoogleClient().verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw unauthorized('Google sign-in failed: invalid token');
  }

  if (!payload?.email) throw unauthorized('Google account did not return an email address');
  if (payload.email_verified === false) throw unauthorized('Google email is not verified');

  const email = payload.email.toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { OR: [{ googleId: payload.sub }, { email }] },
  });

  if (existing) {
    if (!existing.isActive) {
      // Signing back in with Google reactivates a soft-deleted account.
      await prisma.user.update({ where: { id: existing.id }, data: { isActive: true } });
    }

    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        googleId: existing.googleId ?? payload.sub,
        avatarUrl: payload.picture ?? existing.avatarUrl,
        fullName: existing.fullName ?? payload.name ?? null,
        emailVerified: true,
        authProvider: existing.hashedPassword ? 'local+google' : 'google',
      },
    });
    return { ...issueToken(user), user: serializeUser(user), created: false };
  }

  const user = await prisma.user.create({
    data: {
      email,
      username: await uniqueUsername(payload.email.split('@')[0] || payload.name),
      fullName: payload.name ?? null,
      avatarUrl: payload.picture ?? null,
      googleId: payload.sub,
      authProvider: 'google',
      emailVerified: true,
      preferences: { create: { ...PREFERENCE_DEFAULTS } },
    },
  });

  await sendWelcomeNotification(user);
  return { ...issueToken(user), user: serializeUser(user), created: true };
}

export async function updateUser(userId, input) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.full_name !== undefined ? { fullName: input.full_name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.risk_tolerance !== undefined ? { riskTolerance: input.risk_tolerance } : {}),
      ...(input.investment_horizon !== undefined
        ? { investmentHorizon: input.investment_horizon }
        : {}),
    },
  });
  return serializeUser(user);
}

/**
 * Changes the password. Google-only accounts can set a first password without
 * supplying a current one; password accounts must confirm the existing password.
 */
export async function changePassword(user, { current_password: currentPassword, new_password: newPassword }) {
  if (user.hashedPassword) {
    if (!currentPassword) throw badRequest('Current password is required');
    if (!(await verifyPassword(currentPassword, user.hashedPassword))) {
      throw unauthorized('Current password is incorrect');
    }
    if (currentPassword === newPassword) {
      throw badRequest('New password must be different from the current password');
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      hashedPassword: await hashPassword(newPassword),
      authProvider: user.googleId ? 'local+google' : 'local',
    },
  });

  await notify(user.id, {
    type: 'security',
    title: user.hashedPassword ? 'Your password was changed' : 'Password added to your account',
    body: 'If this was not you, reset your password immediately and review your account security.',
    link: '/settings',
    severity: 'warning',
  });

  return { message: 'Password updated successfully' };
}

export async function deactivateUser(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });
  return { message: 'User deactivated successfully' };
}

/** Full account export: profile, preferences, portfolios and notifications. */
export async function exportAccount(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      preferences: true,
      portfolios: { include: { holdings: true } },
      notifications: { orderBy: { createdAt: 'desc' }, take: 200 },
    },
  });

  return {
    exported_at: new Date().toISOString(),
    profile: serializeUser(user),
    preferences: user.preferences ?? PREFERENCE_DEFAULTS,
    portfolios: user.portfolios,
    notifications: user.notifications,
  };
}
