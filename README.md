# C.api — Open Public API Monitoring Platform

A fullstack monorepo that monitors the health, uptime, and latency of public APIs from the [public-api-lists](https://github.com/public-api-lists/public-api-lists) repository.

## Architecture

```
apps/
  backend/     → Express.js REST API (port 3001)
  worker/      → BullMQ background monitoring worker
  frontend/    → Next.js dashboard (port 3000)

shared/
  database/    → SQL schema + migration script
```

## Tech Stack

| Layer    | Tech                              |
|----------|-----------------------------------|
| Frontend | Next.js 14, TailwindCSS, Recharts |
| Backend  | Node.js, Express.js, pg, Axios    |
| Worker   | BullMQ, ioredis, Axios            |
| Database | PostgreSQL                        |
| Queue    | Redis                             |

## Quick Start

### 1. Start Services (PostgreSQL + Redis)

```bash
docker-compose up -d
```

### 2. Run Database Migration

```bash
node shared/database/migrate.js
```

### 3. Start Backend

```bash
cd apps/backend && npm run dev
```

### 4. Start Worker

```bash
cd apps/worker && npm run dev
```

### 5. Start Frontend

```bash
cd apps/frontend && npm run dev
```

### 6. Import APIs

```bash
curl -X POST http://localhost:3001/api/import-apis
```
Or click the **Import APIs** button in the dashboard at http://localhost:3000.

## Environment Variables

Copy `.env.example` to `.env`:

```env
DATABASE_URL=postgresql://capi:capi_password@localhost:5432/capi_db
REDIS_URL=redis://localhost:6379
CHECK_INTERVAL=60000       # ms between monitoring rounds
REQUEST_TIMEOUT=10000      # ms before HTTP timeout
BACKEND_PORT=3001
```

## API Endpoints

| Method | Endpoint                 | Description              |
|--------|--------------------------|--------------------------|
| GET    | /api/apis                | List all APIs            |
| GET    | /api/apis/:id            | Single API details       |
| GET    | /api/apis/:id/stats      | Uptime, latency, errors  |
| GET    | /api/apis/:id/history    | Check history            |
| GET    | /api/apis/categories     | All categories           |
| GET    | /api/stats/overview      | Dashboard summary stats  |
| POST   | /api/import-apis         | Import from GitHub       |

## Dashboard

- **Home** — Summary stats and import trigger
- **APIs** — Searchable, filterable table with uptime bars and status badges
- **API Detail** — Latency line chart, status bar chart, check history table
