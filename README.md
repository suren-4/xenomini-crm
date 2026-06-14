# Xeno Mini CRM

AI-native **shopper marketing CRM** for the Xeno Engineering take-home. Helps brands decide **who to talk to**, **what to say**, and **which channel** to use — with a real two-service callback loop for simulated message delivery.

> **Shopper CRM, not sales CRM** — segments, campaigns, and engagement analytics for retail shoppers.

---

## Highlights

| Area | What you get |
|------|----------------|
| **Audience** | 500 seeded Indian shoppers, fuzzy search, geo map, segment rule builder |
| **AI** | IntelliSense ghost text, tone + channel suggestions, **Suggest audience**, **CampaignGPT** agent |
| **Delivery** | Separate channel microservice with queue, retries, dead-letter, ordered webhooks |
| **Live ops** | SSE campaign event feed, customer communication journey, attribution |
| **Analytics** | Campaign funnel, channel breakdown, segment performance |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend — React + Vite + Tailwind          :5173          │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS /api
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend CRM — Express + Prisma              :3000          │
│  • REST API  • AI routes  • SSE  • Webhook receiver         │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             │ POST /api/send
         ┌──────────────┐                     ▼
         │  PostgreSQL  │          ┌──────────────────────────┐
         └──────────────┘          │  Channel Service  :3001  │
                                   │  simulate → callback     │
                                   └────────────┬─────────────┘
                                                │
                    POST /api/webhooks/channel-callback
                                                ▼
                                         (back to Backend)
```

Deep dive: [CHANNEL_SERVICE.md](./CHANNEL_SERVICE.md) — retries, event ordering, queue design.

---

## Tech stack

| Layer | Stack |
|-------|--------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js 20+, Express, Prisma |
| Database | **PostgreSQL** (production + local via Docker) |
| Channel | Standalone Express service (simulated WhatsApp / SMS / Email / RCS) |
| AI | Groq (`llama-3.1-8b-instant`) with heuristic fallbacks |

---

## Quick start (local)

### Prerequisites

- **Node.js 20+**
- **Docker** (for local PostgreSQL)
- **Groq API key** (optional — [console.groq.com](https://console.groq.com))

### 1. Start PostgreSQL

```bash
# From repo root
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # set GROQ_API_KEY for AI features
npm install
npm run db:push
npm run db:seed
npm run dev
```

→ http://localhost:3000

### 3. Channel service

```bash
cd channel-service
npm install
npm run dev
```

→ http://localhost:3001

### 4. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

→ http://localhost:5173

**Verify:**

```bash
curl http://localhost:3000/api/health
curl http://localhost:3001/api/health
curl http://localhost:3000/api/counts
```

More detail: [LOCAL_SETUP.md](./LOCAL_SETUP.md) · API reference: [BACKEND_SETUP.md](./BACKEND_SETUP.md)

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes |(local) |
| `CRM_PUBLIC_URL` | Yes | Public backend URL — channel callbacks target this |
| `CHANNEL_SERVICE_URL` | Yes | Channel service URL |
| `GROQ_API_KEY` | For AI | Groq key for IntelliSense, suggest-audience, CampaignGPT |

### Frontend (`frontend/.env`)

| Variable | Local | Production |
|----------|-------|------------|
| `VITE_API_URL` | empty (Vite proxies `/api`) | `https://your-backend-url` |

> **Never commit `.env` files or put API keys in frontend env vars.**

---

## Project structure

```
xenomini-crm/
├── backend/              # Express API, Prisma, webhooks, AI routes
│   ├── prisma/schema.prisma
│   └── src/
├── channel-service/      # Simulated messaging + callback retries
├── frontend/             # React SPA
├── docker-compose.yml    # Local PostgreSQL
├── LOCAL_SETUP.md
├── BACKEND_SETUP.md
├── CHANNEL_SERVICE.md
└── DEPLOYMENT.md
```

---

## Key features

### Channel callback loop
CRM queues communications → channel service simulates delivery → posts lifecycle events (`sent` → `delivered` → `opened` → `read` → `clicked`) back via webhook. Retries + dead-letter on failure.

### IntelliSense
Copilot-style ghost completions for campaign names and messages, plus tone and channel recommendations.

### Suggest audience
Describe an audience in plain English → AI returns segment rules you can save.

### CampaignGPT
Chat agent that plans campaigns, proposes segments, and can launch sends from conversation.

### Live SSE feed
Watch webhook events arrive in real time while a campaign is sending.

### Customer journey
Per-shopper timeline of every communication, status changes, and order attribution.

---

## Production build

```bash
cd backend && npm run build && npm start
cd channel-service && npm run build && npm start
cd frontend && npx vite build    # output: frontend/dist
```

**Deploy:** [DEPLOYMENT.md](./DEPLOYMENT.md) — recommended stack **Railway** (backend + channel + Postgres) + **Vercel** (frontend).

Railway start command for backend:

```bash
npx prisma db push && npm run db:seed:prod && npm start
```

---

## AI stack

- **Groq** — `llama-3.1-8b-instant` for IntelliSense, segment suggestions, CampaignGPT
- Graceful **heuristic fallbacks** when `GROQ_API_KEY` is unset

---

## Documentation

| Doc | Contents |
|-----|----------|
| [LOCAL_SETUP.md](./LOCAL_SETUP.md) | Full local dev guide |
| [BACKEND_SETUP.md](./BACKEND_SETUP.md) | API endpoints |
| [CHANNEL_SERVICE.md](./CHANNEL_SERVICE.md) | Callback architecture |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Railway + Vercel deploy |

---

## License

Built for the Xeno Engineering take-home assignment.
