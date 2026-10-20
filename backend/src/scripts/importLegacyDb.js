/**
 * One-time importer from legacy SQLAlchemy SQLite into Prisma SQLite.
 * Usage: npm run db:import -- ../../backend/portfolio_optimizer.db
 *
 * Prefers better-sqlite3 when installed; falls back to the sqlite3 CLI.
 */
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '../lib/prisma.js';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const defaultSource = path.resolve(here, '../../../../backend/portfolio_optimizer.db');
const sourcePath = path.resolve(process.argv[2] || defaultSource);

if (!existsSync(sourcePath)) {
  console.error(`Legacy SQLite database not found: ${sourcePath}`);
  process.exit(1);
}

async function importWithBetterSqlite() {
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch {
    return false;
  }

  const db = new Database(sourcePath, { readonly: true });
  const rows = (sql) => db.prepare(sql).all();

  const users = rows('SELECT * FROM users');
  console.log(`Importing ${users.length} users...`);

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        email: u.email,
        hashedPassword: u.hashed_password,
        fullName: u.full_name,
        isActive: Boolean(u.is_active ?? 1),
        riskTolerance: u.risk_tolerance || 'moderate',
        investmentHorizon: u.investment_horizon || 60,
      },
      create: {
        email: u.email,
        username: u.username,
        hashedPassword: u.hashed_password,
        fullName: u.full_name,
        isActive: Boolean(u.is_active ?? 1),
        riskTolerance: u.risk_tolerance || 'moderate',
        investmentHorizon: u.investment_horizon || 60,
      },
    });
  }

  const usernameToId = Object.fromEntries(
    (await prisma.user.findMany()).map((u) => [u.username, u.id]),
  );
  const legacyUsers = Object.fromEntries(users.map((u) => [u.id, u.username]));
  const portfolios = rows('SELECT * FROM portfolios');
  console.log(`Importing ${portfolios.length} portfolios...`);

  for (const p of portfolios) {
    const username = legacyUsers[p.user_id];
    const userId = usernameToId[username];
    if (!userId) continue;

    const existing = await prisma.portfolio.findFirst({
      where: { userId, name: p.name, isActive: Boolean(p.is_active ?? 1) },
    });
    if (existing) continue;

    const created = await prisma.portfolio.create({
      data: {
        name: p.name,
        description: p.description,
        userId,
        isActive: Boolean(p.is_active ?? 1),
        optimizationMethod: p.optimization_method,
        riskTolerance: p.risk_tolerance,
        investmentAmount: p.investment_amount,
        expectedReturn: p.expected_return,
        expectedVolatility: p.expected_volatility,
        sharpeRatio: p.sharpe_ratio,
      },
    });

    const holdings = rows(
      `SELECT * FROM portfolio_holdings WHERE portfolio_id = ${Number(p.id)}`,
    );
    if (holdings.length) {
      await prisma.portfolioHolding.createMany({
        data: holdings.map((h) => ({
          portfolioId: created.id,
          symbol: h.symbol,
          weight: h.weight,
          quantity: h.quantity,
          avgPurchasePrice: h.avg_purchase_price,
        })),
      });
    }
  }

  db.close();
  return true;
}

function importWithSqliteCli() {
  const targetDb = path.resolve(here, '../../prisma/dev.db');
  const sql = `
ATTACH DATABASE '${sourcePath.replaceAll("'", "''")}' AS legacy;
INSERT OR IGNORE INTO users (id,email,username,hashed_password,full_name,is_active,risk_tolerance,investment_horizon,created_at,updated_at)
SELECT id,email,username,hashed_password,full_name,is_active,COALESCE(risk_tolerance,'moderate'),COALESCE(investment_horizon,60),COALESCE(created_at,CURRENT_TIMESTAMP),COALESCE(updated_at,CURRENT_TIMESTAMP) FROM legacy.users;
INSERT OR IGNORE INTO portfolios SELECT * FROM legacy.portfolios;
INSERT OR IGNORE INTO portfolio_holdings SELECT * FROM legacy.portfolio_holdings;
DETACH DATABASE legacy;`;
  execFileSync('sqlite3', [targetDb, sql], { stdio: 'inherit' });
  return true;
}

async function main() {
  const usedBetter = await importWithBetterSqlite();
  if (!usedBetter) {
    try {
      importWithSqliteCli();
    } catch (err) {
      console.error(
        'Import failed. Install better-sqlite3 (`npm i better-sqlite3`) or ensure sqlite3 CLI is available.',
      );
      console.error(err.message);
      process.exit(1);
    }
  }
  console.log('Import complete');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
