# Project Status

> Last updated: 22 October 2026
> Live site: https://teamalum-bookstore.vercel.app

## Summary

The storefront, the admin panel and the database are aligned on a single
entitlement model. What is **not** done is applying the new SQL migration to the
database — that needs a human with dashboard access.

| Area | Status |
|------|--------|
| Storefront UI | ✅ Done |
| Single admin panel (`/admin`) | ✅ Done |
| Redemption → entitlement → content pipeline | ✅ Code complete, ⏳ needs migration applied |
| Purchase request → issue code flow | ✅ Code complete, ⏳ needs migration applied |
| Book content in the database | ⬜ **Empty — no chapters published** |
| CI/CD deploy | ✅ Fixed and verified green |
| Docs | ✅ Rewritten to match reality |

---

## Architecture (as actually built)

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla HTML/CSS/JS SPA — one `index.html`, no build step |
| Admin | `admin-subscriptions.html`, served at `/admin` |
| Backend | `server.js` (local dev only, plain Node `http`) |
| Database | Supabase Postgres + RLS + RPC functions |
| Auth | Supabase Auth (Google OAuth + email/password) |
| Hosting | Vercel (GitHub Actions → Vercel CLI) |

There is **no** Next.js, no React, no TypeScript, no Tailwind, no bundler, no API-route
layer. Older versions of this file described all of those; they do not exist here.

---

## Pages

| Route | File | Status |
|-------|------|--------|
| `/` | `index.html` (SPA, 15 sections) | ✅ |
| `/admin` | `admin-subscriptions.html` | ✅ |
| `/admin.team` | → redirects to `/admin` | ✅ |
| `/admin.html` | → redirect stub to `/admin` | ✅ |
| `/auth/callback` | `auth/callback.html` | ✅ |
| anything else | `404.html` | ✅ |

The storefront is a single document. Its "pages" are `<section class="page" data-index="N">`
blocks: Cover, About, Contents, Chapters, Preview, Pricing, Purchase, Sign-in, Profile,
Reader, Redeem, FAQ, Contact, Newsletter.

## Admin panel tabs

Dashboard · Purchase Requests · Generate Code · Subscriptions · Devices · Content ·
Users · Newsletter · Archive.

---

## Data model

**Source of truth:** `subscriptions` + `device_activations`.
**Archive (read-only):** `licenses`, `redeem_codes`.

A chapter is two rows in `chapters`:
`is_free_preview = true` → public teaser, `is_free_preview = false` → paid full text.
Postgres RLS is row-level, so this is the only way to gate a column.

## RPC functions

`redeem_code`, `validate_code`, `get_chapters`, `get_book_outline`,
`has_active_subscription`, `owns_subscription`, `request_purchase`, `is_admin`.

---

## Blocked / needs a human

### 1. Apply the database migration — **required**

The new migration is written but **not applied**. The Supabase CLI access token in
Windows Credential Manager is expired (`401 Invalid access token`), there is no
`SUPABASE_ACCESS_TOKEN`, no `SUPABASE_DB_PASSWORD` and no `psql` on this machine.

```bash
npm run db:build
```

Then paste `supabase/APPLY_NOW.sql` into
**https://supabase.com/dashboard/project/gvkcwtoryrzgbtufsgff/sql/new** and press Run.

It is idempotent — running it twice is harmless.

Until it is applied:
- The new `request_purchase()` signature is not in the database. The site's purchase
  form falls back gracefully, but new orders will not be stored.
- `get_chapters()` does not exist. The client falls back to a direct RLS-gated select,
  which only returns the preview rows.
- `subscriptions.user_id` and `subscriptions.book_slug` do not exist yet.

### 2. Add the `VERCEL_TOKEN` secret — ✅ **done**

Repository secret: **Settings → Secrets and variables → Actions → Repository secrets**.

Every one of the 21 workflow runs before 22 October 2026 failed at the "Deploy to
Vercel" step because the secret was missing. The workflow now fails fast with an
explicit message if the token is absent, and passes `VERCEL_ORG_ID` /
`VERCEL_PROJECT_ID` so the CLI can find the project even though `.vercel/` is
gitignored.

The secret is now set and the workflow has been verified **green end-to-end**
(checkout → verify → link → deploy → summary), producing a `Ready` production
deployment.

> **Heads-up:** the token currently stored is a *session* token from the local
> `vercel login`. It works, but it expires. To make CI permanent, create a dedicated
> token at **vercel.com → Account Settings → Tokens → Create** (give it access to the
> `team-alum-88e68813` team), then replace the secret:
>
> ```bash
> gh secret set VERCEL_TOKEN --repo sudarshandev-llm/Teamalum-bookstore
> ```
>
> The site does not depend on this: Vercel's own Git integration auto-deploys every
> push to `main`, and that is what has been shipping the changes all along. The
> workflow is a redundant, independently-auditable path.

### 2b. CI now verifies before deploying

The workflow runs `npm run check` (inline-script syntax, element-id cross-check, JSON
validation) before deploying, so a broken script or a dangling element id fails the
build instead of shipping.

### 3. Publish the book content — **required for the reader to show anything**

`books` and `chapters` are empty. The free Chapter 1 preview on the site is a static
block inside `index.html`, not a database row.

Use `/admin` → **Content** to add chapters. Until then the reader says
*"No chapters published yet."*

### 4. Verify existing admin-issued codes — **one click each**

Existing codes were created before `payment_verified` existed, so their value is
`NULL`. The new enforcement only blocks rows where `created_by = 'public'`, so those
codes keep working. But if you want the "Payment Verified" badge to be green, open
`/admin` → Subscriptions → tick **Payment Verified** → Save.

---

## Security status

| Check | Result |
|-------|--------|
| Anon `INSERT` into `subscriptions` | ✅ Blocked (42501, RLS) |
| Anon `SELECT` on `profiles` / `audit_logs` / `support_tickets` / `newsletter_subscribers` / `contact_messages` | ✅ Returns `[]` |
| `validate_code` with null/empty input | ✅ Rejected |
| `is_admin()` as anon | ✅ `false` |
| `service_role` key in any git commit | ✅ Not found (all-history grep clean) |
| `expire_subscriptions()` callable by anon | 🔒 Revoked by the new migration |
| Admin access gated by | ✅ Email via `auth.jwt()` |

---

## Verification commands

```bash
npm run check          # syntax-check scripts, verify element ids, validate JSON
npm run db:build       # regenerate supabase/APPLY_NOW.sql
```

---

## Roadmap

- [ ] Apply `supabase/APPLY_NOW.sql` to the live project
- [x] Add `VERCEL_TOKEN` repository secret (add a durable dashboard token)
- [ ] Publish chapters 1+ through `/admin` → Content
- [ ] Migrate the free Chapter 1 preview from `index.html` into the database
- [ ] Add server-side email delivery for issued codes
- [ ] Automated tests for the redeem flow
- [ ] `POST /api/...`-style serverless functions if a real backend is ever needed
