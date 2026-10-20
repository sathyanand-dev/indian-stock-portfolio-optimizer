import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const app = createApp();

async function authHeader() {
  await request(app).post('/api/v1/auth/register').send({
    email: 'owner@example.com',
    username: 'owner',
    password: 'secret12',
  });
  const login = await request(app)
    .post('/api/v1/auth/login')
    .type('form')
    .send({ username: 'owner', password: 'secret12' });
  return `Bearer ${login.body.access_token}`;
}

describe('portfolios', () => {
  beforeEach(async () => {
    await prisma.portfolioHolding.deleteMany();
    await prisma.portfolio.deleteMany();
    await prisma.user.deleteMany();
  });

  it('should create and list portfolios', async () => {
    const auth = await authHeader();
    const created = await request(app)
      .post('/api/v1/portfolios')
      .set('Authorization', auth)
      .send({
        name: 'Core',
        holdings: [
          { symbol: 'RELIANCE.NS', weight: 0.5, quantity: 10, avg_purchase_price: 2500 },
          { symbol: 'TCS.NS', weight: 0.5, quantity: 5, avg_purchase_price: 3600 },
        ],
        investment_amount: 43000,
      });

    expect(created.status).toBe(201);
    expect(created.body.holdings).toHaveLength(2);

    const list = await request(app).get('/api/v1/portfolios').set('Authorization', auth);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe('Core');
  });
});
