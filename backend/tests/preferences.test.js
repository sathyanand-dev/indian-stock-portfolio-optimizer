import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();

async function signUp() {
  await request(app).post('/api/v1/auth/register').send({
    email: 'prefs@example.com',
    username: 'prefsuser',
    password: 'secret12',
  });

  const login = await request(app)
    .post('/api/v1/auth/login')
    .type('form')
    .send({ username: 'prefsuser', password: 'secret12' });

  return login.body.access_token;
}

describe('user preferences', () => {
  let token;

  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.userPreference.deleteMany();
    await prisma.portfolioHolding.deleteMany();
    await prisma.portfolio.deleteMany();
    await prisma.user.deleteMany();
    token = await signUp();
  });

  const auth = (req) => req.set('Authorization', `Bearer ${token}`);

  describe('GET /api/v1/auth/me/preferences', () => {
    it('should return defaults for a new account', async () => {
      const res = await auth(request(app).get('/api/v1/auth/me/preferences'));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        theme: 'light',
        currency: 'INR',
        email_notifications: true,
        market_news_alerts: false,
      });
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/v1/auth/me/preferences');

      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/auth/me/preferences', () => {
    it('should persist a theme change across requests', async () => {
      const update = await auth(request(app).put('/api/v1/auth/me/preferences')).send({
        theme: 'dark',
        market_news_alerts: true,
      });

      expect(update.status).toBe(200);
      expect(update.body.theme).toBe('dark');

      const reread = await auth(request(app).get('/api/v1/auth/me/preferences'));

      expect(reread.body.theme).toBe('dark');
      expect(reread.body.market_news_alerts).toBe(true);
    });

    it('should reject an unknown theme value', async () => {
      const res = await auth(request(app).put('/api/v1/auth/me/preferences')).send({
        theme: 'neon',
      });

      expect(res.status).toBe(400);
    });

    it('should reject unknown preference keys', async () => {
      const res = await auth(request(app).put('/api/v1/auth/me/preferences')).send({
        not_a_setting: true,
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/me/preferences/reset', () => {
    it('should restore defaults after changes', async () => {
      await auth(request(app).put('/api/v1/auth/me/preferences')).send({ theme: 'dark' });

      const res = await auth(request(app).post('/api/v1/auth/me/preferences/reset'));

      expect(res.status).toBe(200);
      expect(res.body.theme).toBe('light');
    });
  });

  describe('PUT /api/v1/auth/me', () => {
    it('should persist phone on the profile', async () => {
      const res = await auth(request(app).put('/api/v1/auth/me')).send({
        full_name: 'Prefs User',
        phone: '+91 90000 00000',
      });

      expect(res.status).toBe(200);
      expect(res.body.phone).toBe('+91 90000 00000');
      expect(res.body.has_password).toBe(true);
    });
  });
});

describe('password change', () => {
  let token;

  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.userPreference.deleteMany();
    await prisma.portfolioHolding.deleteMany();
    await prisma.portfolio.deleteMany();
    await prisma.user.deleteMany();
    token = await signUp();
  });

  it('should change the password and allow login with the new one', async () => {
    const change = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: 'secret12', new_password: 'newsecret123' });

    expect(change.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .type('form')
      .send({ username: 'prefsuser', password: 'secret12' });
    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .type('form')
      .send({ username: 'prefsuser', password: 'newsecret123' });

    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
  });

  it('should reject a wrong current password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: 'wrongpass', new_password: 'newsecret123' });

    expect(res.status).toBe(401);
  });

  it('should reject a password shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_password: 'secret12', new_password: 'short' });

    expect(res.status).toBe(400);
  });
});

describe('login by email', () => {
  beforeEach(async () => {
    await prisma.notification.deleteMany();
    await prisma.userPreference.deleteMany();
    await prisma.portfolioHolding.deleteMany();
    await prisma.portfolio.deleteMany();
    await prisma.user.deleteMany();
    await signUp();
  });

  it('should accept the email address as the username field', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .type('form')
      .send({ username: 'prefs@example.com', password: 'secret12' });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeTruthy();
  });
});
