# Xeno Mini CRM — Free Deployment Guide

Deploy the full stack for **$0** using:

| Part | Platform |
|------|----------|
| Frontend | **Vercel** |
| Database | **Neon** (PostgreSQL) |
| Backend CRM | **Render** |
| Channel service | **Koyeb** |

```mermaid
flowchart LR
  User[Browser] --> FE[Vercel frontend]
  FE -->|VITE_API_URL| BE[Render backend]
  BE --> DB[(Neon Postgres)]
  BE -->|CHANNEL_SERVICE_URL| CH[Koyeb channel-service]
  CH -->|CRM_PUBLIC_URL webhook| BE
```

**Deadline:** June 15, 2026, 12 PM

---

## Before you deploy

1. Code is pushed to **GitHub** (no `.env` files in the repo)
2. `backend/prisma/schema.prisma` uses `provider = "postgresql"`
3. `frontend/vercel.json` exists (SPA routing for React Router)

---

## Step 1 — Neon PostgreSQL (~5 min)

1. Go to [neon.tech](https://neon.tech) and sign up (GitHub login, **no credit card**)
2. Click **New Project**
3. Name: `xeno-crm` → region closest to you → **Create**
4. On the dashboard, open **Connection details**
5. Copy the **connection string** (PostgreSQL). It looks like:
   ```
   postgresql://neondb_owner:xxxxx@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
6. Save this as your `DATABASE_URL` — you will paste it into Render in Step 2

---

## Step 2 — Backend on Render (~20 min)

1. Go to [render.com](https://render.com) → sign up with **GitHub**
2. Dashboard → **New +** → **Web Service**
3. Connect your CRM GitHub repository
4. Fill in:

| Field | Value |
|-------|-------|
| **Name** | `xeno-crm-backend` |
| **Region** | Same region as Neon if possible |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npx prisma db push && npm run db:seed:prod && npm start` |
| **Instance Type** | **Free** |

5. Expand **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | Paste Neon connection string from Step 1 |
| `GROQ_API_KEY` | Your key from [console.groq.com](https://console.groq.com) |
| `CRM_PUBLIC_URL` | Leave blank for now |
| `CHANNEL_SERVICE_URL` | Leave blank for now |

6. Click **Create Web Service**
7. Wait for the first deploy (5–10 min). Check **Logs** for errors.
8. When live, copy your URL from the top of the dashboard, e.g.:
   ```
   https://xeno-crm-backend.onrender.com
   ```
9. Go to **Environment** → add or update:
   ```
   CRM_PUBLIC_URL=https://xeno-crm-backend.onrender.com
   ```
   (Use your actual URL, **no trailing slash**)
10. Save — Render redeploys automatically
11. Test in browser:
    ```
    https://YOUR-BACKEND.onrender.com/api/health
    https://YOUR-BACKEND.onrender.com/api/counts
    ```
    You should see health JSON and customer/segment counts.

> **Cold starts:** Free Render sleeps after 15 min idle. First request may take 30–60 seconds.

---

## Step 3 — Channel service on Koyeb (~15 min)

1. Go to [koyeb.com](https://koyeb.com) → sign up (free tier, no card)
2. **Create App** → **Web Service**
3. **GitHub** → select the same CRM repo
4. Settings:

| Field | Value |
|-------|-------|
| **Name** | `xeno-channel` |
| **Directory** | `channel-service` |
| **Builder** | Buildpack |
| **Build command** | `npm install && npm run build` |
| **Run command** | `npm start` |
| **Instance** | **Free** (512 MB) |
| **Region** | Washington, D.C. or Frankfurt |

5. No extra env vars required (`PORT` is set by Koyeb)
6. Click **Deploy**
7. When live, copy URL e.g.:
   ```
   https://xeno-channel-USER.koyeb.app
   ```
8. Test:
   ```
   https://YOUR-CHANNEL.koyeb.app/api/health
   ```

> **Cold starts:** Free Koyeb sleeps after ~1 hour idle. Hit `/api/health` before sending a campaign.

---

## Step 4 — Wire channel URL into backend (~2 min)

1. Back on **Render** → open your backend service
2. **Environment** → set:
   ```
   CHANNEL_SERVICE_URL=https://YOUR-CHANNEL.koyeb.app
   ```
3. Save and wait for redeploy

Your backend should now have all four variables:

```env
DATABASE_URL=postgresql://...neon...
CRM_PUBLIC_URL=https://YOUR-BACKEND.onrender.com
CHANNEL_SERVICE_URL=https://YOUR-CHANNEL.koyeb.app
GROQ_API_KEY=gsk_...
```

---

## Step 5 — Frontend on Vercel (~10 min)

1. Go to [vercel.com](https://vercel.com) → sign up with **GitHub**
2. **Add New…** → **Project** → import your CRM repo
3. Configure:

| Field | Value |
|-------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` (click Edit) |
| **Build Command** | `npm install && npx vite build` |
| **Output Directory** | `dist` |

4. **Environment Variables:**

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://YOUR-BACKEND.onrender.com` |

No trailing slash. Use your Render backend URL, not Koyeb.

5. Click **Deploy**
6. When done, open your URL e.g. `https://xeno-crm.vercel.app`
7. Dashboard should load with 500 customers, segments, and campaigns

---

## Step 6 — End-to-end test

Do this **before** recording your demo video:

1. **Wake backend** — open `/api/health`, wait up to 60s if cold
2. **Wake channel** — open `/api/health`
3. Open **Vercel frontend**
4. Go to **Campaigns** → open a draft → **Send**
5. Within ~30 seconds:
   - Stats should increase (sent, delivered, etc.)
   - **Live callback feed** should show events

If stats stay at **0**, `CRM_PUBLIC_URL` on Render is wrong — it must be the public backend URL.

---

## Before your demo (avoid cold starts)

Free tiers sleep when idle. **2 minutes before recording:**

1. Open `https://YOUR-BACKEND.onrender.com/api/health`
2. Open `https://YOUR-CHANNEL.koyeb.app/api/health`
3. Then open the Vercel app

Optional: [cron-job.org](https://cron-job.org) (free) — ping both health URLs every 10 minutes on demo day.

---

## Submission checklist

| Item | What to submit |
|------|----------------|
| **Hosted URL** | Vercel frontend link |
| **GitHub repo** | Public repo URL |
| **Video** | 5–6 min walkthrough on the **live** URL |
| **Deadline** | June 15, 2026, 12 PM |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Render build fails | Root Directory must be `backend` |
| `prisma db push` fails | Check `DATABASE_URL`; schema must use `postgresql` |
| Frontend empty / errors | Set `VITE_API_URL` on Vercel, then **Redeploy** |
| Campaign stats stay 0 | Fix `CRM_PUBLIC_URL` on Render backend |
| `/campaigns` 404 on refresh | Ensure `frontend/vercel.json` is committed |
| AI features don't work | Add `GROQ_API_KEY` on Render backend only |
| Slow first load | Normal on free tier — wake services before demo |
| DB empty | Check Render logs for seed errors; start command includes `db:seed:prod` |

---

## Local dev (unchanged)

Use Neon connection string in `backend/.env`, or run Postgres locally:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd channel-service && npm run dev

# Terminal 3
cd frontend && npm run dev
```

Keep `VITE_API_URL` empty in `frontend/.env` for local Vite proxy.
