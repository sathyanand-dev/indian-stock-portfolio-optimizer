# Indian Stock Portfolio Optimizer

Web app for building, optimizing, and monitoring Indian equity portfolios (NSE / BSE). It combines live market data with classical quantitative methods so you can compare allocations, inspect risk, backtest ideas, and track IPOs from one place.

The stack is a Node.js Express API (Prisma + SQLite) and a Vite + React frontend.

## What it does

- **Optimize portfolios** using Mean-Variance, Minimum Variance, Risk Parity, Black–Litterman, and Monte Carlo simulation
- **Manage holdings** with NSE/BSE symbol search (curated catalogue plus Yahoo Finance fallback)
- **Analytics and risk** — expected return, volatility, Sharpe ratio, and related risk views
- **Backtesting** of proposed allocations against historical prices
- **Market data** — Indian index ticks with a 15-minute cache; last close outside market hours
- **Company research** — news and earnings when a Finnhub key is configured
- **IPO analysis** — NSE subscription data, optional live grey-market premium via IPO Guru
- **Accounts** — email/password auth, optional Google Sign-In, per-user settings (theme, INR formatting, notifications)

## Architecture

| Unit | Stack | Local port |
|------|-------|------------|
| [`backend/`](backend/) | Express.js, Prisma, SQLite | `8001` |
| [`frontend/`](frontend/) | Vite, React, MUI, Recharts | `5173` |

- Feature folders on the API (`routes`, `services`, `middleware`) and on the web app (`features/*`)
- Security middleware: Helmet, CORS allow-list, compression, request IDs, rate limits, Zod validation, JWT, centralized errors
- Market prices from Yahoo Finance chart data via `backend/src/lib/yahoo.js`
- Quant engines implemented in JavaScript (no Python runtime)

## Prerequisites

- Node.js 20 or newer
- npm 10+

## Local setup

```bash
npm install
npm run install:all
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
cd backend && npx prisma migrate deploy && cd ..
npm run dev
```

On macOS/Linux use `cp` instead of `copy`.

- API health: http://localhost:8001/health
- Web app: http://localhost:5173

`backend/.env` already exists in a local checkout if you copied it; keep `SECRET_KEY` private and never commit `.env` files. SQLite lives at `backend/prisma/dev.db` (gitignored).

## Optional integrations

The app runs without these. Set them in `backend/.env` (see `backend/.env.example`) and restart the API.

| Feature | Env vars | Notes |
|---------|----------|-------|
| Google Sign-In | `GOOGLE_CLIENT_ID` | OAuth 2.0 **Web application** client in [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Add `http://localhost:5173` as an authorised JavaScript origin. The web app reads the ID from `GET /api/v1/config`. |
| Email notifications | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM` | Without SMTP, emails are logged to the API console; in-app notifications still work. |
| Company news & earnings | `FINNHUB_API_KEY` | Free tier at [finnhub.io](https://finnhub.io). |
| Live IPO grey market premium | `IPO_GURU_API_KEY` | Optional; NSE IPO subscription data works without it. |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API + web together |
| `npm run test` | Backend + frontend Vitest |
| `npm run build` | Production frontend build |
| `backend`: `npm run prisma:migrate` | Create/apply migrations |

## Deploying separately

1. Host `backend/` with `DATABASE_URL`, a strong `SECRET_KEY`, and `CORS_ORIGINS` set to your frontend origin(s).
2. Host `frontend/` with `VITE_API_URL` pointing at the public API URL.
3. Keep SPA rewrite to `index.html` (see `frontend/vercel.json`).

## License

Private / personal project unless you add a license file.
