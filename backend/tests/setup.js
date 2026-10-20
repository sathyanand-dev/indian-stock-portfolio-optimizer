import { afterAll } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.SECRET_KEY = 'test-secret-key-123456';
process.env.DATABASE_URL = 'file:./test.db';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.PORT = '8001';

afterAll(async () => {
  const { prisma } = await import('../src/lib/prisma.js');
  await prisma.$disconnect();
});
