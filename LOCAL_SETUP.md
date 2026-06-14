# Xeno Mini CRM — Local Setup

## Architecture

```mermaid
flowchart LR
  FE[Frontend :5173] -->|/api proxy| CRM[Backend :3000]
  CRM -->|POST /api/send| CH[Channel Service :3001]
  CH -->|webhook callbacks| CRM
  CRM --> DB[(PostgreSQL)]
  CRM -->|GROQ_API_KEY| GPT[Groq API]
```

**Callback flow:** CRM queues communications → channel-service simulates delivery → posts events (`sent`, `delivered`, `opened`, `read`, `clicked`, `failed`) to `POST /api/webhooks/channel-callback` → campaign stats update live.

## Quick start (3 terminals)

### Step 0 — Database (one-time)

The schema uses **PostgreSQL** (required for Railway; SQLite is not used).

```bash
# From repo root — starts Postgres on localhost:5432
docker compose up -d
```

Copy env and point at local Postgres:

```bash
cd backend
cp .env.example .env
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/xeno_crm
```

### Terminal 1 — Backend
```bash
cd backend
npm install
npm run db:push
npm run db:seed
npm run dev
```
Runs at http://localhost:3000

### Terminal 2 — Channel service
```bash
cd channel-service
npm install
npm run dev
```
Runs at http://localhost:3001

### Terminal 3 — Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs at http://localhost:5173

## Environment variables

Copy `backend/.env.example` to `backend/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/xeno_crm` (see `docker-compose.yml`) |
| `PORT` | No | Backend port (default 3000) |
| `CRM_PUBLIC_URL` | Yes for callbacks | `http://localhost:3000` |
| `CHANNEL_SERVICE_URL` | Yes for send | `http://localhost:3001` |
| `GROQ_API_KEY` | For CampaignGPT | Free key from [console.groq.com](https://console.groq.com) |

### CampaignGPT (Groq)

1. Sign up at [console.groq.com](https://console.groq.com) and create a free API key.
2. Add to `backend/.env`:
   ```
   GROQ_API_KEY=your_groq_key_here
   ```
3. Restart the backend (`npm run dev`).

Without `GROQ_API_KEY`, the CRM works but CampaignGPT returns a fallback/unavailable message.

**Never commit real API keys** — only use `.env` locally (`.env` is gitignored).

## Verify

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/dashboard
curl http://localhost:3000/api/customers
```

Seed loads ~500 customers, segments, and sample campaigns.

## Full send flow test

1. Open http://localhost:5173 → Segments → create a segment (or use seeded ones).
2. Campaigns → create campaign with `Hi {{name}}` → confirm send.
3. Watch channel-service logs for callbacks.
4. Campaign stats should update: sent → delivered → opened → read → clicked.

Ensure `backend/.env` includes:
```
CRM_PUBLIC_URL=http://localhost:3000
CHANNEL_SERVICE_URL=http://localhost:3001
```

See also [BACKEND_SETUP.md](./BACKEND_SETUP.md) for API endpoint reference and [CHANNEL_SERVICE.md](./CHANNEL_SERVICE.md) for the full callback/retry/queue architecture.

### Channel service (optional tuning)

| Variable | Default | Description |
|----------|---------|-------------|
| `CHANNEL_CONCURRENCY` | `12` | Parallel message simulations |
| `CALLBACK_MAX_RETRIES` | `4` | CRM callback retry attempts |
| `CALLBACK_BASE_DELAY_MS` | `400` | Initial retry backoff |

```bash
curl http://localhost:3001/api/health    # queue depth + dead-letter count
curl http://localhost:3001/api/dead-letter
```
