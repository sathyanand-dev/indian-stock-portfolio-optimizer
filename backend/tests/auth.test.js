import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();

describe('auth', () => {
  beforeEach(async () => {
    await prisma.portfolioHolding.deleteMany();
    await prisma.portfolio.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should register and login a user', async () => {
    const register = await request(app).post('/api/v1/auth/register').send({
      email: 'test@example.com',
      username: 'tester',
      password: 'secret12',
    });

    expect(register.status).toBe(201);
    expect(register.body.username).toBe('tester');

    const login = await request(app)
      .post('/api/v1/auth/login')
      .type('form')
      .send({ username: 'tester', password: 'secret12' });

    expect(login.status).toBe(200);
    expect(login.body.access_token).toBeTruthy();

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.access_token}`);

    expect(me.status).toBe(200);
    expect(me.body.email).toBe('test@example.com');
  });
});
