# Cold Store (कोल्ड स्टोर)

A shared cold-storage crate-bay booking board for smallholder farmers.
12 crate bays, 3 states (Available / Reserved / Occupied), live across every
farmer's phone at once, bilingual (English / Hindi), no login.

Built for the OAKS AI Builders take-home challenge.

---

## Tech stack

- **Frontend:** React 18 + Vite (no UI framework, plain CSS — keeps the
  bundle small for 2G/3G phones)
- **Backend:** [Supabase](https://supabase.com) free tier — Postgres +
  Realtime. All booking logic (reserve, check-in, cancel, surrender,
  waitlist bump, auto-expire) lives in Postgres functions so it's atomic
  and can't be bypassed from the browser.
- **Hosting:** Vercel or Netlify free tier

---

## 1. Create the Supabase project (5 min)

1. Go to [supabase.com](https://supabase.com) → **New project** (free tier).
   Pick any name/region/password (you won't need the DB password again).
2. Once it's ready, open **SQL Editor → New query**, paste the entire
   contents of [`supabase/schema.sql`](./supabase/schema.sql), and click
   **Run**. This creates all 4 tables, the 12 bays, row-level security
   policies, every RPC function, and turns on Realtime for the tables.
3. Go to **Project Settings → API**. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

## 2. Run locally

```bash
npm install
cp .env.example .env
# paste your Project URL and anon key into .env
npm run dev
```

Open the printed `http://localhost:5173` URL. Open it in two browser
windows/phones side by side to see live sync — reserve a bay in one, watch
the counters and floor map update instantly in the other.

## 3. Deploy (free, public URL, no login for end users)

**Vercel (recommended):**

```bash
npm i -g vercel
vercel
```

When prompted, add the two environment variables (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) — Vercel will ask, or add them under
**Project Settings → Environment Variables** and redeploy. Vercel auto-detects
Vite and runs `npm run build`.

**Netlify (alternative):**

```bash
npm i -g netlify-cli
netlify deploy --build
```

Set the same two env vars under **Site settings → Environment variables**
first, then `netlify deploy --prod`.

Either way you get a public `https://…` URL — no account or login required
for the farmers who open it.

## 4. Push to GitHub

```bash
git init
git add .
git commit -m "Cold Store: shared cold-room booking board"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/cold-store.git
git push -u origin main
```

(`.env` is git-ignored, so your Supabase key never gets committed —
recruiters/reviewers will use their own or you'll share via the deployed
URL directly.)

## 5. Optional: keep auto-cancel running with zero browsers open

`expire_overdue_reservations()` (late drop-off auto-cancel, spec item D)
is called every 30 seconds by any open client as a simple, free-tier-friendly
fallback. For it to also run when literally nobody has the app open, add a
scheduled job in Supabase (**Database → Cron Jobs**, available on the free
tier via the `pg_cron` extension):

```sql
select cron.schedule(
  'expire-overdue-reservations',
  '*/1 * * * *',
  $$ select expire_overdue_reservations(); $$
);
```

This step is optional for the demo — the client-side poll already satisfies
the take-home's judging criteria as long as one phone/tab is open, which is
the realistic case for a cold-room front desk phone.

---

## Project structure

```
cold-store/
├── supabase/schema.sql     # tables, RLS, RPC functions, realtime publication
├── src/
│   ├── App.jsx              # data loading, realtime subscriptions, routing
│   ├── i18n.js               # every EN/Hindi string + fruit/slot dictionaries
│   ├── speak.js              # browser TTS for speaker icons (low-literacy aid)
│   ├── supabaseClient.js     # Supabase client + anonymous device id
│   └── components/
│       ├── Header.jsx        # room stats, cooling indicator, EN|हिंदी toggle
│       ├── FloorMap.jsx       # 12-bay grid
│       ├── BayCard.jsx        # single bay tile
│       ├── BayModal.jsx       # reserve / check-in / cancel / surrender flows
│       ├── CheckInTab.jsx     # "my booking" by device id, find-by-name fallback
│       ├── Dashboard.jsx      # occupancy, crates in/out, spoilage risk
│       └── BottomNav.jsx
└── TRADEOFFS.md              # written note for submission requirement #3
```

## What was built vs. the AI Studio reference screenshots

The screenshots were an Android/Kotlin prototype — no code from them was
ported. They were used only as a visual/logic reference, and per the final
spec:
- collapsed the old 4th "Equipped" state into **Occupied** (exactly 3 states)
- moved temperature/humidity to **room-level only** (not per-bay)
- rebuilt the "Cooling OFF" emergency state to visually outrank every other
  red element (pulsing border) since it affects all 12 bays at once
