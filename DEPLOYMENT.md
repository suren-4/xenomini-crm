# Xeno Mini CRM — Deployment Plan

Pre-deployment verification was run locally on **June 14, 2026**. Use this guide to ship a public URL for the Xeno submission.

---

## Pre-deploy verification summary

| Check | Status |
|-------|--------|
| Backend health `GET /api/health` | OK |
| Channel service health + queue | OK |
| Frontend `localhost:5173` | OK (200) |
| Data: 500 customers, 9 segments, 11 campaigns | OK |
| Dashboard + analytics APIs | OK |
| Suggest segment AI | OK |
| IntelliSense suggest | OK |
| Channel suggest | OK |
| CampaignGPT chat | OK |
| Customer communications + events | OK |
| SSE recent events API | OK |
| `npm run build` — backend | OK |
| `npm run build` — channel-service | OK |
| `npx vite build` — frontend | OK |

### Manual UI checks (do once before recording video)

- [ ] Segments → **Suggest audience** → rules fill → save
- [ ] Campaigns → create → IntelliSense ghost → **Send** → live callback feed ticks
- [ ] Customers → open profile → **Communication journey** timeline
- [ ] CampaignGPT → ask + optional launch proposal
- [ ] Dark mode toggle (optional)

### Known local-only constraints

- **SQLite** (`file:./dev.db`) — fine locally; **use PostgreSQL in production**
- **Frontend** uses empty `VITE_API_URL` in dev (Vite proxy). In prod, set to your backend URL **or** serve frontend with `/api` on same origin
- Remove **`VITE_GROQ_API_KEY` from `frontend/.env`** — Groq key belongs only in `backend/.env` (never commit keys)

---

## Recommended hosting: Railway (3 services + Postgres)

Railway fits this stack: Node apps + PostgreSQL + internal networking.

```mermaid
flowchart LR
  User[Browser] --> FE[Vercel or Railway Frontend]
  FE -->|HTTPS /api| CRM[Railway: backend]
  CRM --> DB[(PostgreSQL)]
  CRM -->|POST /api/send| CH[Railway: channel-service]
  CH -->|webhook callbacks| CRM
```

**Alternative:** Frontend on **Vercel**, backend + channel + DB on **Railway**.

---

## Step-by-step deployment

### Phase 0 — Repo hygiene (30 min)

1. Create **GitHub repo** (if not done)
2. Ensure `.gitignore` includes:
   - `node_modules/`, `dist/`, `.env`, `*.db`, `*.sqlite`
3. **Never commit** `backend/.env` or API keys
4. Add root **`README.md`** (product intro, architecture, local setup link)

### Phase 1 — PostgreSQL (15 min)

1. Railway → **New Project** → **PostgreSQL**
2. Copy `DATABASE_URL` (starts with `postgresql://`)

### Phase 2 — Backend CRM (45 min)

1. Railway → **New Service** → deploy from repo, root: `backend/`
2. **Build command:** `npm install && npm run build`
3. **Start command:** `npx prisma db push && npm run db:seed && npm start`
   - Or run seed once manually, then start: `npm start`
4. **Environment variables:**

| Variable | Example | Required |
|----------|---------|----------|
| `DATABASE_URL` | `postgresql://...` | Yes |
| `PORT` | `3000` (Railway sets automatically) | Auto |
| `CRM_PUBLIC_URL` | `https://your-crm.up.railway.app` | **Yes** — channel callbacks target this |
| `CHANNEL_SERVICE_URL` | `https://your-channel.up.railway.app` | **Yes** |
| `GROQ_API_KEY` | `gsk_...` | For AI features |

5. **Prisma:** change `schema.prisma` datasource:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

6. Redeploy after schema change
7. Verify: `curl https://your-crm.up.railway.app/api/health`

### Phase 3 — Channel service (20 min)

1. Railway → **New Service** → root: `channel-service/`
2. **Build:** `npm install && npm run build`
3. **Start:** `npm start`
4. **Env:** `PORT` (auto), optional `CHANNEL_CONCURRENCY=12`
5. Verify: `curl https://your-channel.up.railway.app/api/health`
6. Update backend `CHANNEL_SERVICE_URL` to this public URL

### Phase 4 — Frontend (30 min)

**Option A — Vercel (recommended for static SPA)**

1. Import repo, root: `frontend/`
2. **Build:** `npm install && npx vite build` (skip `tsc` if CI fails — vite build alone works)
3. **Output:** `dist`
4. **Env:**

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://your-crm.up.railway.app` |

5. Deploy → open URL → confirm API calls hit Railway backend

**Option B — Same Railway project**

- Build frontend, serve `dist` via nginx/Caddy, or add static hosting on Railway

### Phase 5 — Wire callbacks (critical)

Channel service must reach CRM webhook **over the public internet**:

```
CRM_PUBLIC_URL=https://your-crm.up.railway.app
→ callbacks go to https://your-crm.up.railway.app/api/webhooks/channel-callback
```

**Test after deploy:**

1. Open app → send a small segment campaign
2. `curl https://your-channel.../api/health` — queue should show activity
3. Campaign stats should increase within ~30s
4. Open campaign drawer → **Live callback feed**

### Phase 6 — CORS (if frontend on different domain)

If browser blocks API calls, add to `backend/src/server.ts`:

```ts
app.use(cors({
  origin: ["https://your-frontend.vercel.app"],
  credentials: true,
}));
```

Currently `cors()` allows all — works for demo; tighten if desired.

---

## Environment variable cheat sheet

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://user:pass@host:5432/db
PORT=3000
CRM_PUBLIC_URL=https://YOUR-CRM-DOMAIN
CHANNEL_SERVICE_URL=https://YOUR-CHANNEL-DOMAIN
GROQ_API_KEY=gsk_...
```

### Channel service

```env
PORT=3001
CHANNEL_CONCURRENCY=12
CALLBACK_MAX_RETRIES=4
```

### Frontend (`frontend/.env.production` or Vercel env)

```env
VITE_API_URL=https://YOUR-CRM-DOMAIN
```

Leave `VITE_API_URL` **empty** only for local dev with Vite proxy.

---

## Submission deliverables checklist

| Item | Action |
|------|--------|
| **Hosted URL** | Frontend public link (judges open in browser) |
| **GitHub repo** | Clean README, no secrets |
| **Walkthrough video** | 5–6 min, narrated, show live deployed URL |
| **Deadline** | June 15, 2026, 12 PM |

### Video demo order (recommended)

1. Product intro — shopper CRM, AI-native
2. Suggest audience → create segment
3. Campaign + IntelliSense → send
4. Live callback feed (SSE)
5. Customer communication journey
6. Architecture diagram (CRM ↔ channel ↔ webhooks)
7. How you used AI to build

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Campaign sends but stats stay 0 | `CRM_PUBLIC_URL` wrong — channel can't callback |
| AI features empty | Set `GROQ_API_KEY` on backend |
| Frontend can't reach API | Set `VITE_API_URL`; check CORS |
| DB empty on deploy | Run `npm run db:seed` once on backend |
| SSE not live in prod | Ensure proxy doesn't buffer SSE; Vercel → call backend URL directly |
| SQLite on Railway | Switch to PostgreSQL — ephemeral disk loses SQLite |

---

## Optional polish before submit

- [ ] Root `README.md` with architecture diagram
- [ ] Remove unused `frontend/.env` Groq key
- [ ] Pin Node version in `package.json` (`engines`: `"node": ">=20"`)
- [ ] One screenshot for README hero image

---

## Quick local re-verify (any time)

```bash
curl http://localhost:3000/api/health
curl http://localhost:3001/api/health
curl http://localhost:3000/api/counts
curl http://localhost:3000/api/dashboard
```

All three terminals: `backend`, `channel-service`, `frontend` → http://localhost:5173
