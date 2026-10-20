# Portfolio Optimizer — Frontend (Revamp)

Vite + React (JavaScript) + MUI 5 client for the Express/Prisma API.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

- App: http://localhost:5173  
- API (default): `VITE_API_URL=http://localhost:8001`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |

## Auth

JWT is stored in `localStorage` as `access_token`. Login uses `application/x-www-form-urlencoded` against `/api/v1/auth/login`.

## Routes

`/login` `/register` `/dashboard` `/optimize` `/portfolios` `/analytics` `/risk-analysis` `/backtest` `/market-data` `/settings`
