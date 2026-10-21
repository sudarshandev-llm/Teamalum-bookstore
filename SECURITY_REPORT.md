# Security Report

> Last audited: 22 October 2026 — after the entitlement-model rewrite.

The storefront is a static site that talks to Supabase directly from the browser. There
is no application server, so **the database is the security boundary**. Every rule that
matters is enforced by Postgres (RLS + RPC functions), not by JavaScript.

---

## What is exposed to the browser

| Value | Where | Risk if leaked |
|-------|-------|----------------|
| Supabase project URL | `index.html`, `admin-subscriptions.html` | None — it is a public URL |
| Supabase **anon** key | same | None — it is RLS-scoped, this is by design |
| Admin email | `admin-subscriptions.html` | Low — knowing it is not enough; you also need to sign in with it |

### What is **not** in this repository

- The **service_role** key — verified absent from every commit in the git history.
- Any `.env` file with real credentials.
- Any database password.

If a service-role key is ever pasted into a file, rotate it in
**Supabase → Project Settings → API** immediately and purge it from git history.

---

## Verified checks (live probes against the running site)

| Check | Result |
|-------|--------|
| Anon `INSERT` into `subscriptions` | ✅ **Blocked** — `42501`, RLS violation |
| Anon `SELECT` on `profiles` | ✅ Returns `[]` |
| Anon `SELECT` on `audit_logs` | ✅ Returns `[]` |
| Anon `SELECT` on `support_tickets` | ✅ Returns `[]` |
| Anon `SELECT` on `newsletter_subscribers` | ✅ Returns `[]` |
| Anon `SELECT` on `contact_messages` | ✅ Returns `[]` |
| `validate_code(null)` / `validate_code('')` | ✅ Rejected, `valid: false` |
| `is_admin()` as anon | ✅ Returns `false` |
| `service_role` key in any commit | ✅ Not found (all-history grep) |

### Fixed during this audit

- **`expire_subscriptions()` was callable by `anon`** — anyone could flip rows to
  `expired`. Now revoked from `public`, `anon` and `authenticated`. Real-time expiry is
  enforced inside `redeem_code()` and `get_chapters()` instead, so nothing depended on
  that function running.
- **The admin panel depended on `profiles.role`** for its read policies — a mis-seeded
  role row silently broke the panel. Every table the panel reads now has an additive,
  email-based `is_admin()` SELECT policy.
- **The SPA catch-all rewrite** meant any mistyped URL rendered the homepage instead of
  a 404. Removed; `404.html` is now served for unknown paths.

---

## The core security model

### 1. The browser is never trusted

`localStorage` holds the licence code so the reader knows which code to re-check, but it
is **never** the source of truth. On every page load and every reader open the code is
re-validated against the database through `redeem_code()` / `get_chapters()`.

Editing `localStorage` therefore grants nothing: the server re-checks the code, its
status, its expiry and the device binding on every call.

### 2. Content gating lives in RLS

Paid chapter text is not merely hidden with CSS. The `chapters` table has two rows per
chapter and the SELECT policies split them:

```sql
-- public
using (status = 'published' and is_free_preview = true)
-- licensed only
using (status = 'published' and not is_free_preview
       and public.has_active_subscription())
```

A non-subscribed visitor cannot read the full text even with a direct REST call,
because PostgREST applies the same policies.

### 3. The public cannot grant themselves a licence

There is no public INSERT/UPDATE/DELETE policy on `subscriptions`. The only public write
path is `request_purchase()`, a `security definer` function that hard-codes
`code = NULL`, `status = 'pending'`, `payment_verified = false`, `created_by = 'public'`.
A purchase request stays unredeemable until the admin confirms the payment.

### 4. One admin, gated by JWT email

```sql
create or replace function public.is_admin()
returns boolean language sql stable security invoker set search_path = ''
as $$ select coalesce((auth.jwt() ->> 'email') = 'teamalumorg@gmail.com', false); $$;
```

The anon key carries no email claim, so a client can never satisfy this on its own.
It also does not depend on a `profiles.role` row that could be seeded incorrectly or
promoted by mistake.

### 5. Device binding and the 3-device limit

`device_activations` is unique on `(subscription_id, device_id)`. `redeem_code()`
refuses a 4th device. Unbinding is an admin action from `/admin` → Devices.

### 6. Real-time expiry

Expiry is checked against `now()` on every call, not by a cron job:

```sql
if rec.expires_at is not null and rec.expires_at <= now() then ...
```

The cron job only tidies the `status` column for the admin view.

---

## XSS

All dynamic content in both panels is written through `esc()`, which uses
`textContent` (never `innerHTML` with raw input):

```js
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}
```

The storefront uses `escapeHtml()` for the same purpose. Chapter content is rendered
through a `renderMarkdown()` helper — **review it before publishing untrusted text**,
since it is the one place where book content is turned into HTML.

---

## Input validation

| Input | Validation |
|-------|-----------|
| Licence code | `/^TA-PE-([A-Z0-9]{2,4})-[A-Z0-9]{6}$/` in the client, plus a DB lookup with `upper(trim(...))` |
| Buyer email | `/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/` in the client; the DB also rejects malformed addresses and stores `NULL` |
| Plan | Cast to the `subscription_plan` enum — an unknown value raises an error rather than being stored |
| Amount | `numeric(10,2)` |
| Phone / name | Trimmed; empty strings stored as `NULL` |

SQL injection is not possible: the Supabase client parameterises every query, and the
`security definer` functions never concatenate user input into SQL.

---

## Security headers

Set in `vercel.json` for every response:

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Cache-Control` | `no-cache, no-store, must-revalidate` (HTML), `public, max-age=31536000, immutable` (assets) |

> **Not yet set: Content-Security-Policy.** The pages load `@supabase/supabase-js` from
> `esm.sh` and Supabase Auth from `*.supabase.co`, so a policy has to allow both plus
> Google OAuth. It is worth adding carefully — an over-strict policy will break the
> admin sign-in and the reader.

---

## Deployment security

- `VERCEL_TOKEN` lives only as a GitHub Actions **repository secret**. The workflow
  checks it exists before doing anything else and masks it in the log.
- `.vercel/` is gitignored, so the project linkage is passed as workflow environment
  variables instead of being committed.
- `server.js` (local dev only) guards against path traversal and serves `404.html` for
  unknown routes.

---

## Open recommendations

### High

1. **Enable email confirmation** in Supabase Auth to stop throwaway sign-ups.
2. **Add a CAPTCHA** to the newsletter and contact forms.
3. **Turn on Point-in-Time Recovery** for the Supabase project.
4. **Add rate limiting** to `redeem_code()` — an attacker can brute-force code prefixes.
   (Codes are 30 bits of entropy, so this is a hardening measure, not an emergency.)

### Medium

5. **Add a CSP** once you have verified it against the Supabase Auth redirect flow.
6. **Enable 2FA** on the admin Google account.
7. **Restrict Supabase network access** — if the site is only ever served from Vercel,
   an allowlist for your Vercel egress IPs further reduces the attack surface.
8. **Log admin actions** into `audit_logs` from the panel (the table exists; the writes
   are not wired up yet).

### Low

9. **Add `/.well-known/security.txt`**.
10. **Automated dependency scanning** (`npm audit`) in CI.
11. **Rotate the anon key** if you ever suspect it leaked — it is low-risk but trivial to
    rotate.

---

## If something goes wrong

1. **Rotate the service-role key** — Supabase → Project Settings → API.
2. **Rotate the anon key** — same page.
3. **Revoke sessions** — Supabase → Authentication → Users → "Sign out all sessions".
4. **Revoke a licence** — `/admin` → Subscriptions → Revoke. The reader re-validates on
   every load, so access stops within one page load.
5. **Unbind a device** — `/admin` → Devices → Unbind.
6. **Check `audit_logs`** — admin reads and writes are visible to the admin account.
