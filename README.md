# SuperK Support Portal

A production-ready ticketing system for SuperK franchise store partners. Built with:

- **Next.js 16** (App Router, Server Components, Server Actions)
- **Supabase** (Postgres, Auth, Row Level Security)
- **Tailwind CSS** + lucide-react icons
- **TypeScript** throughout
- Deploys to **Vercel** with one click; develops on **StackBlitz** in the browser

Three roles, three portals:

- **Store Partner** (`/sp`) — raise tickets via a 4-step wizard, get instant KB answers, track tickets
- **Agent** (`/agent`) — queue of tickets routed by category, reply and resolve
- **Admin** (`/admin`) — dashboard, store-level view, all tickets, KB, users

---

## 📁 Project structure

```
superk-support-portal/
├── app/                          # Next.js App Router
│   ├── login/                    # Public login page + signIn/signOut actions
│   ├── sp/                       # Store Partner portal (role-guarded)
│   │   ├── tickets/
│   │   │   ├── new/              # 4-step ticket wizard
│   │   │   ├── [id]/             # Ticket detail
│   │   │   └── actions.ts        # createTicket, postMessage, updateStatus
│   ├── agent/                    # Agent console
│   ├── admin/                    # Admin dashboard
│   │   ├── stores/               # Store-level view (NEW)
│   │   ├── tickets/              # All tickets
│   │   ├── kb/                   # Knowledge base
│   │   └── users/                # User management
│   └── components/
│       ├── Shell.tsx             # Shared layout
│       └── TicketDetail.tsx      # Reusable ticket detail panel
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server client (RSC, Actions, Routes)
│   │   └── middleware.ts         # Session refresh + role-based routing
│   └── types.ts                  # Shared TS types
├── proxy.ts                      # Next.js 16 proxy (was middleware.ts)
├── supabase/
│   ├── migrations/0001_init.sql  # Schema, RLS, triggers, views
│   └── seed/0002_seed.sql        # Stores, categories, KB entries
├── scripts/seed-users.mjs        # Create auth users + profiles
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 Setup — step by step

### Step 1: Create the Supabase project (10 min)

1. Go to **[supabase.com](https://supabase.com)** → New project. Pick a region close to India (Mumbai or Singapore).
2. Save your **database password** in your password manager.
3. Once provisioned, open **Project Settings → API**:
   - Copy `Project URL` → this is `NEXT_PUBLIC_SUPABASE_URL`
   - Open the **API Keys** tab. If you see "Publishable key" (`sb_publishable_…`), copy it → that's `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. If not, use the legacy `anon` key — same variable name.
   - From the same page, copy the **secret key** (`sb_secret_…` or legacy `service_role`) → `SUPABASE_SECRET_KEY`. **Never expose this client-side.**

### Step 2: Run the SQL migrations (5 min)

In Supabase, open **SQL Editor → New query** and run these two files in order:

1. Paste **`supabase/migrations/0001_init.sql`** → Run. This creates all tables, RLS policies, triggers, and the `v_store_stats` view.
2. Paste **`supabase/seed/0002_seed.sql`** → Run. This seeds 5 stores, 21 category rows, and 7 KB entries.

### Step 3: Seed the demo users (2 min)

This step creates the 12 demo auth users (5 SPs, 6 agents, 1 admin) and their profile rows.

**Two ways to do this — pick one.**

#### Option A — SQL Editor (works from anywhere, no install)

In Supabase SQL Editor, paste **`supabase/seed/0003_seed_users.sql`** and run it. Done.

This creates users by inserting directly into `auth.users` with bcrypt-hashed passwords. It runs entirely inside Postgres so there's no API-key issue.

#### Option B — Node script (cleaner, but needs Node locally)

The Node script uses the Supabase Admin API (more "official"), but Supabase's new secret keys refuse to run in browser-like environments (StackBlitz, etc.), so you must run this from a real machine:

```bash
# On your laptop, in the project root
cp .env.example .env
# Edit .env with your URL and SUPABASE_SECRET_KEY
node scripts/seed-users.mjs
```

The script is idempotent — running it twice just no-ops. You should see 12 users created.

> If you see `Forbidden use of secret API key in browser`, you're in a WebContainer (StackBlitz). Use Option A instead, or run the script on your local machine.

### Step 4: Install + run locally (3 min)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with any demo account — the login screen has three quick-fill buttons.

| Role           | Email                   | Password     |
| -------------- | ----------------------- | ------------ |
| Store Partner  | `ramesh@superk.in`      | `Welcome@123`|
| Agent          | `karthik@superk.in`     | `Agent@123`  |
| Admin          | `admin@superk.in`       | `Admin@123`  |

---

## ☁️ Deploy to Vercel

### Option A — One-click via GitHub

1. Push this repo to GitHub.
2. On [vercel.com/new](https://vercel.com/new), import the repo.
3. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` (mark as **server-only**)
4. Click Deploy. Vercel auto-detects Next.js and runs `next build`.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
vercel env add SUPABASE_SECRET_KEY
vercel --prod
```

### After deploy

1. In Supabase **Authentication → URL Configuration**, add your Vercel URL (e.g. `https://superk.vercel.app`) to **Site URL** and **Redirect URLs**.
2. Test all three logins on the live URL.

---

## 💻 Develop on StackBlitz

StackBlitz runs Next.js in the browser via WebContainers — perfect for editing without a local toolchain.

1. Push to GitHub.
2. Open `https://stackblitz.com/github/YOUR_USERNAME/superk-support-portal`
3. StackBlitz auto-installs deps and runs `npm run dev:webpack` (configured via `.stackblitzrc`).
4. Add your `.env.local` via the **Files** panel (StackBlitz won't sync `.env` from GitHub).

> **About Turbopack vs Webpack** — Next.js 16's default is Turbopack, which needs native binaries that StackBlitz's WebContainer (WASM-only) can't load. To keep things working everywhere, this project's `npm run dev` and `npm run build` scripts use `--webpack`. On your local machine and on Vercel — where native binaries work fine — you can run `npm run dev:turbo` / `npm run build:turbo` for ~5x faster builds. Vercel auto-detects Next.js and will happily run either; if you want Turbopack on Vercel, set the build command to `npm run build:turbo` in the Vercel project settings.

> **Note:** StackBlitz' WebContainer can hit Supabase Cloud directly — but the **session cookies** for auth need a stable domain. For full auth testing, deploy to Vercel; for UI tweaks, StackBlitz is fastest.

---

## 🔐 Security — what RLS gives you

Every table has Row Level Security enabled. The policies enforce:

| Table             | Store Partner          | Agent                              | Admin    |
| ----------------- | ---------------------- | ---------------------------------- | -------- |
| `tickets` SELECT  | Only own store         | Only categories they handle        | All      |
| `tickets` INSERT  | Only own store + own SP_ID | ❌                                 | ✅       |
| `tickets` UPDATE  | ❌                     | Only handled categories            | All      |
| `ticket_messages` | Same rules as parent ticket                                                     | All      |
| `knowledge_base`  | Read Active only       | Read Active only                   | Full CRUD|
| `profiles`        | Read self              | Read all                           | Full CRUD|

The `auth_role()`, `auth_store()`, and `auth_categories()` SQL helper functions read these from the JWT, so policies are fast.

**A malicious SP cannot read another store's tickets, even by editing the URL** — the API itself will return zero rows.

---

## ➕ Adding a new knowledge base entry

Two options:

**Via SQL:**
```sql
insert into knowledge_base (category, sub_category, question, answer, keywords, owner)
values ('Inventory', 'Expiry Tracking',
  'How do I mark a SKU as near-expiry?',
  E'1. Open the SuperK app → Inventory → Near Expiry.\n2. Scan or search the SKU.\n3. Set the markdown %.',
  'expiry, markdown, near expiry, dump',
  'Inventory Team');
```

**Via Supabase Studio:**
Tables → `knowledge_base` → Insert row. Fill the fields. The `search_vector` column auto-populates.

The portal picks up the new entry on the next page load — no redeploy needed.

---

## 🧱 Adding a new store / partner / agent

The easiest path is to extend `scripts/seed-users.mjs` and re-run it. For one-off additions:

**Stores:**
```sql
insert into stores (code, name, city, state, region, asm_owner)
values ('STR006', 'SuperK Banjara Hills', 'Hyderabad', 'Telangana', 'South-1', 'Rajesh M.');
```

**Users (use the admin script approach — auth.users needs the Admin API):**
Add a new entry to the `USERS` array in `scripts/seed-users.mjs`, then `node scripts/seed-users.mjs`. The script is idempotent — re-running won't duplicate.

---

## 🛠 Architecture notes

- **Server-first**: Every page is a React Server Component that fetches its own data via the server Supabase client. Only forms and interactive widgets (`NewTicketWizard`, `TicketDetail`, `StoreFilter`) are Client Components.
- **Server Actions** (`'use server'`) handle every mutation: `signIn`, `signOut`, `createTicket`, `postMessage`, `updateTicketStatus`. No separate API routes needed.
- **Session refresh** runs in `proxy.ts` (Next.js 16's renamed middleware) — refreshes Supabase tokens on every request and enforces role-based routing.
- **`v_store_stats` view** does the heavy aggregation in Postgres so the admin Stores tab is just a single fast `SELECT *`.
- **Trigger on `ticket_messages`**: when the first agent message is posted, `tickets.first_response_at` is auto-set and status flips from Open → In Progress. No client logic needed.

---

## 📋 Decisions you still need to make

These were called out in the v1 plan; revisit them now that the system is real:

1. **Domain** — `support.superk.in` pointed at Vercel? Set up in Vercel Project → Domains.
2. **SSO** — currently password auth. If your SPs already use a SuperK app, we can swap in OTP or SSO via `supabase.auth.signInWithOtp` / OAuth providers.
3. **Notifications** — Supabase has built-in webhooks. Easy adds: on ticket insert, send SMS via MSG91/Twilio to the assigned agent; on status change, notify the SP via WhatsApp Cloud API.
4. **Realtime** — Supabase Realtime can push new messages instantly. Add to the `TicketDetail` component with `supabase.channel('messages:' + ticketId).on(...)`. ~20 lines of code.
5. **KB growth from resolved tickets** — once you have 100+ resolved tickets, we can build an admin tool that clusters them and suggests new KB entries to approve.

---

## 🧪 Testing checklist

After deployment:

- [ ] Sign in as `admin@superk.in` → land on `/admin`
- [ ] Click **Stores** tab → see 5 stores, all-clear
- [ ] Sign out, sign in as `ramesh@superk.in` → land on `/sp`
- [ ] Click **Raise a query** → step through Category → Sub-category → Other (verify title field appears) → Description → Review
- [ ] Submit a ticket → should appear in your "My tickets"
- [ ] Sign out, sign in as the right agent (e.g. for Inventory ticket, sign in as `karthik@superk.in`) → see the new ticket in queue
- [ ] Post a reply → verify `first_response_at` populates and status flips to In Progress
- [ ] Mark Resolved → verify `resolved_at` is set
- [ ] Sign back in as admin → Stores tab → see updated counts
- [ ] Sign back in as `anita@superk.in` (STR002) → verify she can NOT see Ramesh's STR001 ticket (RLS proof)

If all 9 boxes pass, you're live.

---

## 📞 Need help?

Common issues:

- **Login redirects in a loop**: the `proxy.ts` matcher might be excluding `/_next` incorrectly. Check the matcher in `proxy.ts`.
- **"Row level security policy violated"**: probably an attempted cross-store access — that's the RLS *working*, not a bug.
- **`getUser()` returns null in dev**: clear browser cookies for `localhost`.
- **Seed script fails**: confirm `SUPABASE_SECRET_KEY` is the secret key (not the publishable one) and the project URL is correct.
