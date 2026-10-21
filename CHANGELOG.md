# Changelog

All notable changes to the Team Alum Bookstore.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions are dated by release, not by commit.

---

## [1.0.0] — 2026-10-22 — Entitlement model rewrite

This release fixes the core bug: **a redeemed code did not unlock the book.**

### Fixed

- **Redemption now actually unlocks the content.** The `chapters` RLS policies checked
  the old `licenses` table, which the current redemption flow never wrote to. They now
  check `subscriptions` via `has_active_subscription()`.
- **Redeeming a code binds the device *and* the account.** `redeem_code()` sets
  `user_id`, `date_redeemed`, `status = 'active'` and `device_count`.
- **`validate_code()` now delegates to `redeem_code()`**, so the two paths behave
  identically instead of drifting apart.
- **A purchase request stays locked until the admin confirms the payment.** New
  `payment_verified` column; only rows with `created_by = 'public'` are blocked, so
  existing admin-issued codes keep working with no customer locked out.
- **The reader re-validates the licence against the server** on every page load and
  every time it opens. `localStorage` is never trusted on its own.
- **`chapters` can hold two rows per chapter.** The baseline
  `unique(book_id, chapter_number)` constraint made the preview/full-text row split
  impossible; it is now `unique(book_id, chapter_number, is_free_preview)`.
- **The Subscriptions admin tab did nothing** — its `data-tab` pointed at a section
  (`sec-subs`) that did not exist. Renamed to `sec-subscriptions`.
- **The purchase flow used the seller's email**, not the buyer's, when it built the
  WhatsApp message. The buyer now fills in their own email (required), name and phone.
- **`server.js` served `admin.html` at `/admin`**, which after the panel merge became a
  redirect loop. It now serves `admin-subscriptions.html`.
- **The SPA catch-all rewrite** sent every unknown path to `index.html`, so typos
  silently loaded the homepage. Removed — unknown paths now return `404.html`.
- **The CI deploy has never worked** — all 21 workflow runs failed because
  `VERCEL_TOKEN` was missing and the CLI could not find the project (`.vercel/` is
  gitignored). The workflow now fails fast with a clear message, passes
  `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`, and has been verified **green end-to-end**
  producing a `Ready` production deployment.
- **The Vercel project was configured with the `nextjs` framework preset** even though
  this is a static site. `vercel.json` already sets `"framework": null`, which wins —
  but the mismatch made the project settings misleading.

### Added

- **One admin panel.** `admin-subscriptions.html` at `/admin` now has nine tabs:
  Dashboard, Purchase Requests, Generate Code, Subscriptions, Devices, Content, Users,
  Newsletter, Archive. `admin.html` is a redirect stub.
- **Purchase Requests tab.** Buyers submit their details on the site; the request lands
  as a `pending` row in `subscriptions`; the admin confirms the WhatsApp payment and
  presses **Issue Code**, which updates that same row with a code, expiry and
  `payment_verified = true`.
- **Devices tab.** Shows which device is using which licence, with an **Unbind** action.
- **Content tab.** A full chapter editor — title, number, slug, status, preview text,
  full text, and a **"+ Preview/Full row"** button that creates the matching row for the
  two-row-per-chapter model.
- **Archive tab.** Read-only view of the legacy `licenses`, `redeem_codes` and
  `analytics_events` tables.
- **Custom plan support.** `TA-PE-CUS-XXXXXX` codes; the `Custom` plan no longer
  masquerades as a Lifetime code.
- **`request_purchase(plan, amount, email, name, phone)`** now records *who* asked. The
  old two-argument overload was dropped so PostgREST cannot pick the wrong one.
- **New RPCs:** `redeem_code`, `get_chapters`, `get_book_outline`,
  `has_active_subscription`, `owns_subscription`.
- **`404.html`** — a styled not-found page.
- **`scripts/check-scripts.js`** — extracts every inline `<script>` and syntax-checks it.
- **`scripts/check-ids.js`** — verifies every `getElementById` / `#id` used by the scripts
  actually exists in the markup (this is how the dead Subscriptions tab was found).
- **`scripts/build-apply-sql.js`** — bundles every migration into one pasteable
  `supabase/APPLY_NOW.sql`.
- **npm scripts:** `check`, `check:scripts`, `check:ids`, `db:build`, `verify:json`.
- **CI runs `npm run check` before deploying**, so a broken script or a dangling
  element id fails the build instead of shipping.
- **Unified admin read policies.** Every table the panel reads now has an email-based
  `is_admin()` SELECT policy, so the panel no longer depends on a correctly seeded
  `profiles.role` row.

### Changed

- **One source of truth:** `subscriptions` + `device_activations`. `licenses` and
  `redeem_codes` are now a read-only archive.
- **`get_chapters()` returns one entry per chapter**, preferring the full-text row over
  the preview row.
- **`expire_subscriptions()`** is revoked from `anon` and `authenticated`. It was
  callable by anyone; real-time expiry is enforced inside the redeem/check functions.
- **`vercel.json`** — `/admin`, `/admin.team` and `/admin.team.html` all resolve to the
  unified panel; the catch-all rewrite is gone.
- **Code regex** widened to `/^TA-PE-([A-Z0-9]{2,4})-[A-Z0-9]{6}$/` to accept the `CUS`
  prefix.
- **`server.js`** hardened — path-traversal guard, correct MIME types, 404 handling.

### Security

- Revoked `execute` on `expire_subscriptions()` from `public`, `anon` and `authenticated`.
- Verified: an anon `INSERT` into `subscriptions` is rejected with `42501` (RLS).
- Verified: anon `SELECT` on `profiles`, `audit_logs`, `support_tickets`,
  `newsletter_subscribers` and `contact_messages` returns `[]`.
- Verified: `validate_code` rejects null and empty input.
- Verified: no `service_role` key exists in any commit in the repository history.

### Documentation

- `README.md`, `PROJECT_STATUS.md`, `API_DOCUMENTATION.md`, `Database Schema.md` and
  `CHANGELOG.md` rewritten to describe the system that actually exists.
- The previous versions claimed Next.js 16, TypeScript, Tailwind, 17 routes and 12 API
  routes. None of those exist — the site is a static vanilla HTML/CSS/JS SPA.

---

## [0.1.0] — Initial release

The original storefront: static single-page site, Google OAuth, WhatsApp purchase
redirect, licence codes, redemption, dark mode, PWA manifest, newsletter and contact
forms — plus a first admin panel split across two HTML files, backed by the original
`licenses` / `redeem_codes` schema.
