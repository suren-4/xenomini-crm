# Backend & Database Setup

## What was added

- `backend/` — Express API + Prisma + SQLite
- `channel-service/` — Simulated WhatsApp/SMS/Email/RCS delivery with callbacks, retries, and concurrency queue (see [CHANNEL_SERVICE.md](../CHANNEL_SERVICE.md))
- Schema tweaks: `ruleLogic`, `sentAt`, `attributedOrderId`, event deduplication

## Quick start (3 terminals)

### Terminal 1 — Backend
```bash
cd backend
npm install
npm run db:push
npm run db:seed
npm run dev
```
Runs at http://localhost:3000

> **CampaignGPT:** Add `GROQ_API_KEY` to `backend/.env` — see [LOCAL_SETUP.md](../LOCAL_SETUP.md).

### Terminal 2 — Channel service
```bash
cd channel-service
npm install
npm run dev
```
Runs at http://localhost:3001

### Terminal 3 — Frontend (unchanged for now)
```bash
cd frontend
npm run dev
```
Runs at http://localhost:5173

## Verify it works

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/dashboard
curl http://localhost:3000/api/customers | head
curl http://localhost:3000/api/segments
```

### Test full campaign send flow
1. Get a draft campaign ID: `curl http://localhost:3000/api/campaigns`
2. Send it: `curl -X POST http://localhost:3000/api/campaigns/<ID>/send`
3. Watch channel-service terminal for `[send]` and `[callback]` logs
4. Check queue: `curl http://localhost:3001/api/health`
5. Poll stats: `curl http://localhost:3000/api/campaigns/<ID>/stats`
6. (If needed) Inspect failed callbacks: `curl http://localhost:3001/api/dead-letter`

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/customers` | List customers (search, city, spend filters) |
| GET | `/api/segments` | List segments with live counts |
| POST | `/api/segments` | Create segment `{ name, rules, ruleLogic }` |
| GET | `/api/campaigns` | List campaigns with stats |
| POST | `/api/campaigns` | Create campaign |
| POST | `/api/campaigns/:id/send` | Send to segment via channel service |
| GET | `/api/campaigns/:id/stats` | Live performance stats |
| POST | `/api/ai/suggest-segment` | AI audience rules from natural language |
| GET | `/api/campaigns/:id/events/stream` | SSE live callback feed |
| GET | `/api/campaigns/:id/events/recent` | Recent campaign events (history) |
| POST | `/api/webhooks/channel-callback` | Channel service callbacks |
| GET | `/api/dashboard` | Dashboard summary |

## Next step: connect frontend

Frontend is now wired to the API. With all 3 services running:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd channel-service && npm run dev

# Terminal 3
cd frontend && npm run dev
```

Open http://localhost:5173 — data loads from the live backend via Vite proxy (`/api` → `localhost:3000`).

### What works live
- Dashboard stats, funnel, map, campaigns, segments
- Customers list with orders + communication history
- Create segments (saved to DB)
- Send draft campaigns (channel callbacks update stats)

## Production (Railway)

1. Change `DATABASE_URL` to PostgreSQL in `schema.prisma` provider
2. Set env vars: `CRM_PUBLIC_URL`, `CHANNEL_SERVICE_URL`
3. Deploy backend + channel-service separately
