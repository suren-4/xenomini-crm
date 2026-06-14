# Xeno Mini CRM

AI-native shopper marketing CRM for the [Xeno Engineering Take-Home](https://xeno.com) assignment. Helps brands decide **who to talk to**, **what to say**, and **which channel** to use — with a real two-service callback loop for message delivery simulation.

**Deadline:** June 15, 2026, 12 PM

---

## What this is

A **shopper engagement CRM** (not a sales CRM). Marketers can:

- Ingest & browse **500 simulated Indian customers** with order history
- Build **segments** with rules (AND/OR) + **AI suggest audience**
- Create **campaigns** with IntelliSense ghost text + tone + channel AI
- **Send** via a separate channel service (WhatsApp / SMS / Email / RCS simulated)
- Watch **live callback events** (SSE) and **performance analytics**
- Use **CampaignGPT** agent for natural-language campaign planning

---

## Architecture

```
Frontend (React + Vite)  :5173
        │ HTTP /api
        ▼
Backend CRM (Express)    :3000  ──► PostgreSQL / SQLite
        │ POST /api/send
        ▼
Channel Service          :3001
        │ async webhooks
        └──────────────────► POST /api/webhooks/channel-callback
```

See [CHANNEL_SERVICE.md](./CHANNEL_SERVICE.md) for retries, ordering, and queue design.

---

## Quick start (local)

### Prerequisites

- Node.js 20+
- npm

### 1. Backend

```bash
cd backend
cp .env.example .env    # add GROQ_API_KEY for AI features
npm install
npm run db:push
npm run db:seed
npm run dev
```

Runs at http://localhost:3000

### 2. Channel service

```bash
cd channel-service
npm install
npm run dev
```

Runs at http://localhost:3001

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Runs at http://localhost:5173

Full details: [LOCAL_SETUP.md](./LOCAL_SETUP.md) · API reference: [BACKEND_SETUP.md](./BACKEND_SETUP.md)

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | `file:./dev.db` (local) or PostgreSQL URL (prod) |
| `CRM_PUBLIC_URL` | Yes | Public backend URL for channel callbacks |
| `CHANNEL_SERVICE_URL` | Yes | Channel service URL |
| `GROQ_API_KEY` | For AI | Groq API key for IntelliSense + CampaignGPT |

### Frontend (`frontend/.env`)

| Variable | Local | Production |
|----------|-------|--------------|
| `VITE_API_URL` | empty (uses Vite proxy) | `https://your-backend-url` |

**Never put API keys in frontend env vars.**

---

## Project structure

```
crm/
├── backend/           # Express API, Prisma, webhooks, AI routes
├── channel-service/   # Simulated messaging + callbacks
├── frontend/          # React SPA
├── LOCAL_SETUP.md
├── BACKEND_SETUP.md
├── CHANNEL_SERVICE.md
└── DEPLOYMENT.md
```

---

## Key features

| Feature | Description |
|---------|-------------|
| **Channel callback loop** | Separate service, async events, retries, dead-letter |
| **IntelliSense** | Copilot-style campaign name/message suggestions |
| **CampaignGPT** | Chat agent — plan & execute campaigns |
| **Suggest audience** | Natural language → segment rules |
| **Live SSE feed** | Watch webhooks arrive during campaign send |
| **Customer journey** | Per-shopper communication timeline + attribution |

---

## Production build

```bash
cd backend && npm run build && npm start
cd channel-service && npm run build && npm start
cd frontend && npx vite build    # output: frontend/dist
```

Deploy guide: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## AI stack

- **Groq** (`llama-3.1-8b-instant`) — IntelliSense, segment suggest, CampaignGPT
- Falls back to heuristics when `GROQ_API_KEY` is unset

---

## License

Built for the Xeno engineering take-home assignment.
