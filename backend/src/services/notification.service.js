import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { notFound } from '../lib/errors.js';
import { serializeNotification } from '../lib/serialize.js';
import { renderEmail, sendMail } from '../lib/mailer.js';
import { getRawPreferences } from './preferences.service.js';

/**
 * Notification types mapped to the preference switch that gates their email copy.
 * `null` means the notification is transactional and always emailed when email is on.
 */
const EMAIL_PREFERENCE_BY_TYPE = {
  portfolio: 'portfolioAlerts',
  market: 'marketNewsAlerts',
  performance: 'performanceReports',
  ipo: 'ipoAlerts',
  security: null,
  account: null,
  system: null,
};

/**
 * Creates an in-app notification and, when the user's preferences allow it,
 * emails the same content. Never throws — notification delivery must not break
 * the action that triggered it.
 *
 * @param {number} userId
 * @param {{ type?: string, title: string, body?: string, link?: string, severity?: string, email?: boolean }} input
 */
export async function notify(userId, input) {
  const type = input.type ?? 'system';

  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title: input.title,
        body: input.body ?? null,
        link: input.link ?? null,
        severity: input.severity ?? 'info',
      },
    });

    const wantsEmail = input.email !== false;
    if (!wantsEmail) return serializeNotification(notification);

    const prefs = await getRawPreferences(userId);
    if (!prefs.emailNotifications) return serializeNotification(notification);

    const gate = EMAIL_PREFERENCE_BY_TYPE[type];
    if (gate && prefs[gate] === false) return serializeNotification(notification);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) return serializeNotification(notification);

    const link = input.link ? `${env.APP_URL}${input.link}` : env.APP_URL;
    const result = await sendMail({
      to: user.email,
      subject: input.title,
      text: input.body || input.title,
      html: renderEmail({
        title: input.title,
        intro: input.body || undefined,
        ctaLabel: 'Open Portfolio Optimizer',
        ctaHref: link,
      }),
    });

    if (result.delivered) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { emailSent: true },
      });
      return serializeNotification({ ...notification, emailSent: true });
    }

    return serializeNotification(notification);
  } catch (err) {
    logger.warn(`Notification failed for user ${userId}: ${err.message}`);
    return null;
  }
}

export async function listNotifications(userId, { limit = 30, unreadOnly = false } = {}) {
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    items: rows.map(serializeNotification),
    unread_count: unreadCount,
    email_enabled: env.smtpEnabled,
  };
}

export async function markRead(userId, notificationId) {
  const existing = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!existing) throw notFound('Notification not found');

  const row = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
  return serializeNotification(row);
}

export async function markAllRead(userId) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { updated: result.count };
}

export async function clearAll(userId) {
  const result = await prisma.notification.deleteMany({ where: { userId } });
  return { deleted: result.count };
}

/** Sends a real email to the signed-in user so they can confirm delivery works. */
export async function sendTestEmail(user) {
  const result = await sendMail({
    to: user.email,
    subject: 'Your Portfolio Optimizer email alerts are working',
    text: 'This is a test email from Portfolio Optimizer.',
    html: renderEmail({
      title: 'Email alerts are working',
      intro: `Hi ${user.fullName || user.username}, this is a test message confirming your notification email address is set up correctly.`,
      bodyHtml:
        '<ul style="padding-left:18px;margin:0"><li>Portfolio alerts</li><li>Market news</li><li>Performance reports</li><li>IPO alerts</li></ul>',
      ctaLabel: 'Review notification settings',
      ctaHref: `${env.APP_URL}/settings`,
      footnote: 'You received this because you clicked "Send test email" in Settings.',
    }),
  });

  await notify(user.id, {
    type: 'system',
    title: result.delivered ? 'Test email sent' : 'Test email could not be sent',
    body: result.delivered
      ? `We sent a test message to ${user.email}.`
      : `SMTP is not configured on the server (${result.reason}). In-app notifications still work.`,
    severity: result.delivered ? 'success' : 'warning',
    email: false,
  });

  return {
    delivered: result.delivered,
    smtp_configured: env.smtpEnabled,
    message: result.delivered
      ? `Test email sent to ${user.email}`
      : `Email not sent: ${result.reason}. Add SMTP_* values to the backend .env to enable delivery.`,
  };
}
