# Team Alum Bookstore

Digital publishing platform for **Prompt Engineering Blueprint** — a guide to mastering
human-AI communication.

> **Live:** [teamalum-bookstore.vercel.app](https://teamalum-bookstore.vercel.app)

---

## What this actually is

A **static, build-free website** that talks directly to Supabase from the browser.

There is no Next.js, no React, no TypeScript and no bundler. The whole storefront is one
HTML file whose "pages" are `<section class="page" data-index="N">` blocks that the app
shows and hides. Vercel serves the files straight from disk.

| Piece | Technology |
|-------|------------|
| Storefront | Vanilla HTML + CSS + JavaScript (ES modules from `esm.sh`) |
| Admin panel | Same — `admin-subscriptions.html` |
| Local dev server | `server.js` (plain Node `http`, no dependencies) |
| Database | Supabase Postgres with Row Level Security |
| Auth | Supabase Auth (Google OAuth + email/password) |
| Gating logic | Postgres RPC functions (the server is the source of truth) |
| Hosting | Vercel, deployed by GitHub Actions |

---

## The two ideas that matter

### 1. There is exactly one admin panel

`https://teamalum-bookstore.vercel.app/admin` → `admin-subscriptions.html`.

It has nine tabs:

| Tab | What it does |
|-----|--------------|
| Dashboard | Revenue, plan mix, active vs. expired counts, 30-day trend |
| Purchase Requests | Orders the buyer submitted on the site, and where you issue their code |
| Generate Code | Create a code directly (walk-in / offline sales) |
| Subscriptions | Every issued code; edit, revoke, extend |
| Devices | Which device is using which code; unbind a device |
| Content | Write and publish the book's chapters |
| Users | Profiles who signed in with Google |
| Newsletter | Newsletter subscribers |
| Archive | Read-only view of the old `licenses` / `redeem_codes` / `analytics_events` tables |

The old `admin.html` still exists as a file but is only a **redirect stub** — it immediately
sends you to `/admin`. Any old bookmark to `/admin.team` also lands there.

### 2. Redemption and the admin panel are the same data

This is the part that used to be confusing. The chain is:

```
Buyer fills the purchase form on the site
        │
        ▼
request_purchase(...)  →  one row in `subscriptions`
                         status = 'pending', created_by = 'public',
                         buyer_name / buyer_email / buyer_phone / amount_paid filled in
        │
        ▼
You open /admin → "Purchase Requests" tab
        │
        ▼
You confirm the WhatsApp payment, press "Issue Code"
        │
        ▼
That SAME row is updated in place:
   code          = TA-PE-3M-ABC123   (generated for you)
   status        = 'active'
   expires_at    = now + 3 months
   payment_verified = true
        │
        ▼
You send the code to the buyer (copy button is right there)
        │
        ▼
Buyer pastes it into "Redeem code" on the site
        │
        ▼
redeem_code(code, device_id, device_label)  →  row is bound to that device
        │
        ▼
"Read the Book" unlocks; get_chapters() returns the paid rows for that device
```

**There is no second table to sync.** `subscriptions` is both the order queue and the
licence ledger. `licenses` and `redeem_codes` are the *old* model and are kept only as a
read-only archive.

---

## Why a book has two rows per chapter

Postgres Row Level Security works on **rows**, not columns. So a chapter that has a free
preview *and* a paid full text has to be stored as two rows:

| `is_free_preview` | Meaning | Who can read it |
|-------------------|---------|-----------------|
| `true` | The public teaser | Anyone |
| `false` | The full paid text | Only a device with an active subscription |

`get_chapters()` returns both rows for an entitled reader (the app shows the preview row
first, then the full text) and only the preview row for everyone else.

---

## Content is currently empty

`books` and `chapters` exist in the database but **no chapters have been published yet**.
The free Chapter 1 preview you see on the site is a static `<script type="text/plain">`
block inside `index.html` — it is not in the database.

To publish real content:

1. Go to `/admin` → **Content** tab
2. Add a chapter, write the preview text and the full text, set `Published`
3. The reader picks it up immediately — no redeploy needed

Until then the reader shows *"No chapters published yet."*

---

## Plans and pricing

| Plan | Duration | Price | Code prefix |
|------|----------|-------|-------------|
| Starter | 1 month | ₹199 | `TA-PE-1M-XXXXXX` |
| Professional | 3 months | ₹399 | `TA-PE-3M-XXXXXX` |
| Lifetime | forever | ₹999 | `TA-PE-LT-XXXXXX` |
| Custom | as agreed | — | `TA-PE-CUS-XXXXXX` |

Code format: `TA-PE-<prefix>-<6 chars>` where the 6 characters come from
`ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no `I`, `O`, `0`, `1` — they get misread on WhatsApp).

---

## Getting started locally

```bash
git clone https://github.com/sudarshandev-llm/Teamalum-bookstore.git
cd Teamalum-bookstore
npm start            # http://localhost:3000
```

There is nothing to install and nothing to build — the site is plain files.

### npm scripts

| Script | What it does |
|--------|--------------|
| `npm start` | Local static server on port 3000 |
| `npm run check` | Syntax-checks every inline script, verifies element ids, validates JSON |
| `npm run check:scripts` | Syntax-check only |
| `npm run check:ids` | Verify every `getElementById` / `#id` in the scripts exists in the markup |
| `npm run db:build` | Bundles `supabase/migrations/*` into `supabase/APPLY_NOW.sql` |
| `npm run verify:json` | Validates `vercel.json` and `package.json` parse |

---

## Database

Applied migrations live in `supabase/migrations/`. To apply them by hand:

```bash
npm run db:build
# then paste supabase/APPLY_NOW.sql into
# https://supabase.com/dashboard/project/gvkcwtoryrzgbtufsgff/sql/new
```

Every statement is idempotent, so it is safe to run more than once.

### Tables

| Table | Purpose |
|-------|---------|
| `subscriptions` | **Source of truth.** Orders, codes, entitlements, expiry. |
| `device_activations` | Which device is using which subscription |
| `books` | The book (title, slug, status) |
| `chapters` | Chapter rows — preview + full text as separate rows |
| `profiles` | Mirror of `auth.users` with a role |
| `reading_progress` / `bookmarks` | Per-user reading state |
| `newsletter_subscribers` | Newsletter signups |
| `contact_messages` / `support_tickets` | Contact form and support inbox |
| `audit_logs` / `analytics_events` | Admin tooling |
| `licenses` / `redeem_codes` | **Legacy archive** — read-only, do not use |

### RPC functions

| Function | Who can call it | Purpose |
|----------|-----------------|---------|
| `redeem_code(code, device_id, device_label)` | anon | Redeems a code, binds a device, returns the subscription |
| `validate_code(code)` | anon | Dry-run check, delegates to `redeem_code` |
| `get_chapters(book_slug)` | anon | RLS-gated chapter list (preview or full depending on entitlement) |
| `get_book_outline(book_slug)` | anon | Chapter titles + numbers without the text |
| `has_active_subscription()` | authenticated | Does the signed-in user have a live subscription? |
| `owns_subscription(uuid)` | authenticated | Does the signed-in user own this subscription? |
| `request_purchase(plan, amount, name, email, phone)` | anon | Creates the pending purchase row |
| `is_admin()` | authenticated | `auth.jwt()->>'email' = 'teamalumorg@gmail.com'` |

### Security model

- **RLS is enforced in Postgres.** The browser never decides whether a chapter is paid.
- Every page load and every reader open re-checks the subscription against the database.
  `localStorage` only remembers *which* code was used; it is never trusted.
- `payment_verified` only blocks rows created by the public purchase form. Codes issued
  by an admin are trusted, so no existing customer is locked out.
- The `service_role` key is **not** in this repository and must never be added to it.
- The anon key in the HTML is the *public* anon key — that is expected and safe.

---

## Project structure

```
├── .github/workflows/deploy.yml   # GitHub Actions → Vercel
├── auth/callback.html             # OAuth redirect handler
├── scripts/                       # Build/verify helper scripts
├── supabase/
│   ├── migrations/                # Numbered, idempotent SQL migrations
│   ├── APPLY_NOW.sql              # Generated bundle (paste into SQL Editor)
│   ├── config.toml
│   └── schema.sql                 # Original baseline schema
├── index.html                     # The storefront (all pages in one file)
├── admin-subscriptions.html       # The admin panel
├── admin.html                     # Redirect stub → /admin
├── server.js                      # Local dev server
├── vercel.json                    # Rewrites + security headers
├── 404.html                       # Not-found page
├── manifest.json / icon-*.svg     # PWA assets
└── *.md                           # Documentation
```

---

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which runs the Vercel CLI with
the project ids from `.vercel/repo.json` (the `.vercel` folder is gitignored, so the ids
are passed as `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` environment variables).

**Required repository secret:** `VERCEL_TOKEN`.
Set it under *Settings → Secrets and variables → Actions → Repository secrets*.
Without it the workflow fails immediately with a clear message.

Manual deploys still work:

```bash
vercel --prod --token=<VERCEL_TOKEN>
```

---

## Documentation

- [API Documentation](./API_DOCUMENTATION.md)
- [Database Schema](./Database%20Schema.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Security Report](./SECURITY_REPORT.md)
- [Performance Report](./PERFORMANCE_REPORT.md)
- [Changelog](./CHANGELOG.md)
- [Project Status](./PROJECT_STATUS.md)

---

## Authors

- **Sudarshan Hadmode** — Founder, Team Alum Publishing
- **Soham Takale** — Co-Founder, Team Alum Publishing

## Contact

- Support email: socialsudarshan8@gmail.com
- WhatsApp: 917775990933
- Admin email: teamalumorg@gmail.com

## License

All content © Team Alum Publishing. Access is licence-based.
