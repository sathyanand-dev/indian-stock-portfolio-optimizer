# Portfolio Optimizer Revamp Backend

Express.js API for authentication, portfolio management, live Indian market data, portfolio optimization, analytics, and backtesting. It uses JavaScript ES modules, Prisma, and SQLite.

## Setup

```bash
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run dev
```

The API listens on `http://localhost:8001` and all routes are under `/api/v1`.

## Main endpoints

- `GET /api/v1/health`
- `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET|PUT|DELETE /api/v1/auth/me`
- `GET|POST /api/v1/portfolios`, `GET|PUT|DELETE /api/v1/portfolios/:id`
- `/api/v1/data/*` for live Yahoo Finance quotes, history, indices, search, returns, and correlations
- `POST /api/v1/optimization`
- `POST /api/v1/analytics/performance|risk|portfolio-analysis`
- `POST /api/v1/backtesting/backtest|monte-carlo` and `GET /api/v1/backtesting/stress-testing`

Login uses `application/x-www-form-urlencoded`. Protected routes require `Authorization: Bearer <token>`.

Market-data responses are cached for 15 minutes. No synthetic quote fallback is used; unavailable Yahoo Finance data produces an error. Daily quote and index responses use the latest available close outside market hours.

## Commands

```bash
npm start
npm run dev
npm test
npm run prisma:generate
npm run prisma:migrate
npm run db:import -- /absolute/path/to/legacy.db
```

The importer requires the `sqlite3` command-line utility and expects the legacy SQLAlchemy table names and columns.
