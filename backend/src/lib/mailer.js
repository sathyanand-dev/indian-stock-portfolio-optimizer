import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

let transporter = null;

function getTransporter() {
  if (!env.smtpEnabled) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
  });
  return transporter;
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Wraps body content in the shared branded email shell.
 * @param {{ title: string, intro?: string, bodyHtml?: string, ctaLabel?: string, ctaHref?: string, footnote?: string }} parts
 */
export function renderEmail({ title, intro, bodyHtml, ctaLabel, ctaHref, footnote }) {
  const cta =
    ctaLabel && ctaHref
      ? `<tr><td style="padding:8px 0 24px"><a href="${escapeHtml(ctaHref)}" style="background:#2C3E50;color:#fff;border-radius:8px;padding:12px 22px;text-decoration:none;font-weight:600;display:inline-block">${escapeHtml(ctaLabel)}</a></td></tr>`
      : '';

  return `<!doctype html>
<html><body style="margin:0;background:#f4f6f8;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2C3E50">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;padding:32px;box-shadow:0 1px 3px rgba(44,62,80,.12)">
        <tr><td style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#5D6D7E;padding-bottom:8px">Portfolio Optimizer</td></tr>
        <tr><td style="font-size:22px;font-weight:700;padding-bottom:12px">${escapeHtml(title)}</td></tr>
        ${intro ? `<tr><td style="font-size:15px;line-height:1.6;color:#5D6D7E;padding-bottom:16px">${escapeHtml(intro)}</td></tr>` : ''}
        ${bodyHtml ? `<tr><td style="font-size:15px;line-height:1.6;padding-bottom:20px">${bodyHtml}</td></tr>` : ''}
        ${cta}
        <tr><td style="border-top:1px solid #eceff1;padding-top:16px;font-size:12px;line-height:1.6;color:#8A99A8">
          ${footnote ? `${escapeHtml(footnote)}<br/>` : ''}
          Educational research only — not investment advice.<br/>
          Manage which emails you receive in <a href="${escapeHtml(`${env.APP_URL}/settings`)}" style="color:#3498DB">Settings → Notifications</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Sends an email when SMTP is configured; otherwise logs it so local dev still works.
 * @returns {Promise<{ delivered: boolean, reason?: string }>}
 */
export async function sendMail({ to, subject, html, text }) {
  const transport = getTransporter();

  if (!transport) {
    logger.info('Email suppressed (SMTP not configured)', { to, subject });
    return { delivered: false, reason: 'smtp_not_configured' };
  }

  try {
    await transport.sendMail({
      from: env.MAIL_FROM,
      to,
      subject,
      text: text || subject,
      html,
    });
    logger.info('Email sent', { to, subject });
    return { delivered: true };
  } catch (err) {
    logger.error(`Email send failed: ${err.message}`, { to, subject });
    return { delivered: false, reason: err.message };
  }
}

export async function verifySmtp() {
  const transport = getTransporter();
  if (!transport) return { configured: false, ok: false, message: 'SMTP not configured' };
  try {
    await transport.verify();
    return { configured: true, ok: true, message: 'SMTP connection verified' };
  } catch (err) {
    return { configured: true, ok: false, message: err.message };
  }
}
