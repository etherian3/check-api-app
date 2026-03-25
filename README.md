# C.api — API Monitoring Platform

> Monitor any REST API endpoint manually — track uptime, latency, and health in real-time.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js Frontend (port 3000)                        │   │
│  │                                                      │   │
│  │  Dashboard ──→ APIs List ──→ API Detail              │   │
│  │     │              │              │                  │   │
│  │  SSE stream    Add/Edit/     Check Now               │   │
│  │  (live update) Delete APIs   Edit/Delete             │   │
│  └────────┬─────────────────────────┬───────────────────┘   │
└───────────│─────────────────────────│────────────────────── ┘
            │ HTTP(REST)              │ HTTP(REST)
            ▼                         ▼
┌───────────────────────────────────────────────────────────┐
│              Express.js Backend (port 3001)               │
│                                                           │
│  POST /api/apis      → Add API endpoint                   │
│  PUT  /api/apis/:id  → Edit API                           │
│  DEL  /api/apis/:id  → Delete API                         │
│  POST /api/apis/:id/check → On-demand check               │
│  GET  /api/stream    → SSE live data stream               │
│  GET  /api/stats/*   → Dashboard overview stats           │
└───────────────┬───────────────────────────────────────────┘
                │ PostgreSQL (pg)
                ▼
┌───────────────────────────────────────────────────────────┐
│           PostgreSQL Database (port 5432)                 │
│                                                           │
│  apis        → API configs (url, method, headers, ...)    │
│  api_checks  → Check history (status, latency, ...)       │
└───────────────────────────────────────────────────────────┘
                ▲
                │ writes results
┌───────────────┴───────────────────────────────────────────┐
│              BullMQ Worker                                │
│                                                           │
│  Scheduler (every 60s)                                    │
│    └─→ reads all APIs from DB                             │
│    └─→ enqueues check job per API ──→ Redis Queue         │
│                                                           │
│  Processor (concurrent, up to 5)                          │
│    └─→ HTTP request (with method, headers, body)          │
│    └─→ compares response vs expected_status               │
│    └─→ saves result to api_checks table                   │
└───────────────────────────────────────────────────────────┘
                ▲
                │ Redis pub/sub
┌───────────────┴───────────────────────────────────────────┐
│              Redis (port 6379)                            │
│              BullMQ job queue                             │
└───────────────────────────────────────────────────────────┘
```

### Monitoring Flow (step-by-step)

1. **You add an API** via the dashboard form (name, URL, method, headers, etc.)
2. **Worker scheduler** (runs every 60s) picks up all APIs from the DB
3. **Worker processor** fires an HTTP request to each API endpoint with the configured method/headers/body
4. **Results** (status code, latency, success/fail) are saved to `api_checks` table
5. **Backend SSE stream** broadcasts live stats to all connected browsers every 5s
6. **Dashboard updates** automatically — uptime %, avg latency, recent activity

---

## Architecture

```
apps/
  backend/     → Express.js REST API + SSE stream (port 3001)
  worker/      → BullMQ background monitoring worker
  frontend/    → Next.js dashboard (port 3000)

shared/
  database/    → SQL schema (schema.sql)

migrate.js     → DB migration script (adds new columns to existing DB)
```

## Tech Stack

| Layer    | Tech                           |
| -------- | ------------------------------ |
| Frontend | Next.js 15, Recharts, SSE      |
| Backend  | Node.js, Express.js, pg, Axios |
| Worker   | BullMQ, ioredis, Axios         |
| Database | PostgreSQL 16                  |
| Queue    | Redis 7                        |

---

## Quick Start

### 1. Start Services (PostgreSQL + Redis)

```bash
docker-compose up -d
```

### 2. Setup Environment

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql://capi:capi_password@localhost:5432/capi_db
REDIS_URL=redis://localhost:6379
CHECK_INTERVAL=60000      # ms between monitoring rounds
REQUEST_TIMEOUT=10000     # ms before HTTP timeout
BACKEND_PORT=3001
```

### 3. Init Database

**Fresh install:**

```bash
docker exec capi-postgres psql -U capi -d capi_db -f /dev/stdin < shared/database/schema.sql
```

**Existing DB (add new columns):**

```bash
node migrate.js
```

### 4. Install Dependencies

```bash
npm install                          # root
cd apps/backend && npm install
cd apps/frontend && npm install
cd apps/worker && npm install
```

### 5. Run All Services

```bash
# Terminal 1
cd apps/backend && npm run dev

# Terminal 2
cd apps/worker && npm run dev

# Terminal 3
cd apps/frontend && npm run dev
```

Open **http://localhost:3000**

---

## Adding Your First API

1. Go to **http://localhost:3000/apis**
2. Click **"+ Add API"**
3. Fill in the form:

| Field           | Example                                          |
| --------------- | ------------------------------------------------ |
| Name            | `GitHub API Status`                              |
| Endpoint URL    | `https://api.github.com`                         |
| Method          | `GET`                                            |
| Category        | `Developer Tools`                                |
| Expected Status | `200` _(optional, default: any 2xx/3xx)_         |
| Custom Headers  | `{"Authorization": "Bearer token"}` _(optional)_ |
| Request Body    | `{"key": "value"}` _(optional, POST/PUT only)_   |

4. Click **"Add API"** → the worker will monitor it automatically every 60 seconds
5. Click **"Check Now"** on the detail page to trigger an immediate check

---

## API Endpoints

| Method | Endpoint                     | Description                              |
| ------ | ---------------------------- | ---------------------------------------- |
| GET    | `/api/apis`                  | List all APIs (search, filter, paginate) |
| POST   | `/api/apis`                  | **Add a new API**                        |
| GET    | `/api/apis/:id`              | Single API details                       |
| PUT    | `/api/apis/:id`              | **Edit an API**                          |
| DELETE | `/api/apis/:id`              | **Delete an API**                        |
| POST   | `/api/apis/:id/check`        | **On-demand check**                      |
| GET    | `/api/apis/:id/stats`        | Uptime, latency, error rate              |
| GET    | `/api/apis/:id/history`      | Check history (paginated)                |
| GET    | `/api/apis/categories`       | All categories                           |
| GET    | `/api/stats/overview`        | Dashboard summary                        |
| GET    | `/api/stats/recent-activity` | Last 20 checks                           |
| GET    | `/api/stream`                | SSE live data stream                     |

---

## Dashboard Pages

| Page       | URL         | Description                                    |
| ---------- | ----------- | ---------------------------------------------- |
| Dashboard  | `/`         | Overview stats, uptime ring, recent activity   |
| APIs List  | `/apis`     | All monitored APIs — add, edit, delete, filter |
| API Detail | `/apis/:id` | Charts, stats, history, Check Now button       |
