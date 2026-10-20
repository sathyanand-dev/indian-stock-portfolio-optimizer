import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();

async function signUp() {
  await request(app).post('/api/v1/auth/register').send({
    email: 'notify@example.com',
    username: 'notifyuser',
    password: 'secret12',
  });

  const login = await request(app)
    .post('/api/v1/auth/login')
    .type('form')
    .send({ username: 'notifyuser', password: 'secret12' });

  return login.body.access_token;
}

describe('notifications', () => {
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

  describe('GET /api/v1/notifications', () => {
    it('should include a welcome notification after registration', async () => {
      const res = await auth(request(app).get('/api/v1/notifications'));

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.unread_count).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const res = await request(app).get('/api/v1/notifications');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/notifications/:id/read', () => {
    it('should mark a single notification as read', async () => {
      const list = await auth(request(app).get('/api/v1/notifications'));
      const target = list.body.items[0];

      const res = await auth(request(app).post(`/api/v1/notifications/${target.id}/read`));

      expect(res.status).toBe(200);
      expect(res.body.is_read).toBe(true);
    });

    it('should return 404 for a notification owned by nobody', async () => {
      const res = await auth(request(app).post('/api/v1/notifications/999999/read'));

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/notifications/read-all', () => {
    it('should clear the unread count', async () => {
      await auth(request(app).post('/api/v1/notifications/read-all'));

      const res = await auth(request(app).get('/api/v1/notifications'));

      expect(res.body.unread_count).toBe(0);
    });
  });

  describe('portfolio events', () => {
    it('should create a notification when a portfolio is saved', async () => {
      await auth(request(app).post('/api/v1/notifications/read-all'));

      await auth(request(app).post('/api/v1/portfolios')).send({
        name: 'Notify Portfolio',
        holdings: [
          { symbol: 'TCS.NS', weight: 0.5 },
          { symbol: 'INFY.NS', weight: 0.5 },
        ],
      });

      const res = await auth(request(app).get('/api/v1/notifications?unread=true'));

      expect(res.body.items[0].type).toBe('portfolio');
      expect(res.body.items[0].title).toContain('Notify Portfolio');
    });
  });

  describe('DELETE /api/v1/notifications', () => {
    it('should remove all notifications for the user', async () => {
      const res = await auth(request(app).delete('/api/v1/notifications'));

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBeGreaterThan(0);

      const list = await auth(request(app).get('/api/v1/notifications'));

      expect(list.body.items).toEqual([]);
    });
  });
});

describe('GET /api/v1/config', () => {
  it('should report capability flags without requiring auth', async () => {
    const res = await request(app).get('/api/v1/config');

    expect(res.status).toBe(200);
    expect(res.body.google_auth).toHaveProperty('enabled');
    expect(res.body.email_notifications).toHaveProperty('enabled');
  });
});
