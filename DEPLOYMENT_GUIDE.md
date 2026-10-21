# Deployment Guide

The Team Alum Bookstore is a **static site with no build step**. Vercel serves the files
straight from disk and the browser talks to Supabase directly.

| | |
|---|---|
| Live site | https://teamalum-bookstore.vercel.app |
| Supabase project | `gvkcwtoryrzgbtufsgff` |
| Framework preset | **Other** (not Next.js) |
| Build command | *(leave empty)* |
| Output directory | `.` |
| Install command | *(leave empty)* |
| Node runtime | 18+ (only for the optional local `server.js`) |

---

## 1. Supabase setup

1. Open https://supabase.com/dashboard/project/gvkcwtoryrzgbtufsgff
2. **Project Settings → API** — note the project URL and the **anon** key.
   The anon key is already embedded in `index.html` and `admin-subscriptions.html`.
   The **service_role** key must never be committed to this repository.
3. **Authentication → Providers**
   - Google: enable it and paste the client id / secret
   - Email: enable it (disable "Confirm email" if you want instant sign-up)
   - **Authentication → URL Configuration**
     - Site URL: `https://teamalum-bookstore.vercel.app`
     - Redirect URLs: `https://teamalum-bookstore.vercel.app/auth/callback`
       and `http://localhost:3000/auth/callback`

---

## 2. Apply the database migrations

```bash
npm run db:build
```

This concatenates every file in `supabase/migrations/` into
**`supabase/APPLY_NOW.sql`**.

Then:

1. Open **SQL Editor → New query**
2. Paste the whole contents of `supabase/APPLY_NOW.sql`
3. Press **Run**

Every statement is idempotent, so running it twice is harmless. Re-run it after every
schema change.

**Verify** in the Table Editor that `subscriptions` has `user_id` and `book_slug`, and
that `chapters` accepts two rows for the same `chapter_number` (one with
`is_free_preview = true`, one with `false`).

---

## 3. Deploy

### Option A — GitHub Actions (automatic)

Pushes to `main` trigger `.github/workflows/deploy.yml`, which:

1. checks that `VERCEL_TOKEN` exists (fails fast with a clear message if not),
2. runs `npm run check` — inline-script syntax, element-id cross-check, JSON validation,
3. writes a minimal `.vercel/project.json` from `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`
   (the `.vercel/` folder is gitignored, so the CLI cannot discover the project on its own),
4. runs `vercel --prod --yes --token="$VERCEL_TOKEN"`.

**Required repository secret:**

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | A Vercel access token (**Account Settings → Tokens**) |

Add it under **Settings → Secrets and variables → Actions → Repository secrets**.

```bash
# from a machine with the gh CLI logged in
gh secret set VERCEL_TOKEN --repo sudarshandev-llm/Teamalum-bookstore
```

The project ids baked into the workflow:

```
VERCEL_ORG_ID:     team_RiqZ3IUO0YDro6TZXnXKgqpR
VERCEL_PROJECT_ID: prj_upHclPgbf4DEdYKoesMFK1VkE2WD
```

> **Vercel's own Git integration also deploys every push to `main`.** That is the
> primary path and it has been shipping all changes. The GitHub Actions workflow is a
> redundant, independently-auditable backup.

### Option B — Vercel dashboard (manual)

1. Vercel → **Add New Project** → import the repo
2. Framework preset: **Other**
3. Build command: *(empty)* · Output directory: `.` · Install command: *(empty)*
4. Deploy

### Option C — Vercel CLI

```bash
npm i -g vercel
vercel link            # once, links .vercel/project.json
vercel --prod --token=$VERCEL_TOKEN
```

---

## 4. Post-deployment checks

- [ ] `/` loads and the nav works
- [ ] `/admin` loads the **unified** panel (not the old one) and the tab bar works
- [ ] `/admin.team` redirects to `/admin`
- [ ] An unknown path shows `404.html`
- [ ] Sign in with Google as `teamalumorg@gmail.com` — the panel unlocks
- [ ] Sign in with Google as somebody else — the panel stays locked
- [ ] Buy a plan on the site → a `pending` row appears in **Purchase Requests**
- [ ] **Issue Code** on that request → the code appears in **Subscriptions** and in the
      copy box
- [ ] Redeem the code on the site → the reader unlocks
- [ ] A chapter with a preview row and a full row shows the **full** text to the
      redeemed reader and the **preview** to everyone else
- [ ] Newsletter and contact forms still work

---

## 5. Custom domain

1. Vercel → project → **Domains** → add your domain
2. DNS: `CNAME` → `cname.vercel-dns.com`
3. Wait for propagation (up to 48h)
4. Update **Authentication → URL Configuration** in Supabase: Site URL and Redirect URLs

---

## 6. Environment variables

The site is static — **no environment variables are required at build time.** The Supabase
URL and anon key are constants inside the HTML. If you want to point at a different
project, change them in `index.html` and `admin-subscriptions.html` (both read
`localStorage` overrides first, so you can test a different project without editing
files).

| Name | Where | Required |
|------|-------|----------|
| `VERCEL_TOKEN` | GitHub Actions secret | ✅ for CI deploys |

---

## Troubleshooting

### The workflow fails at "Deploy to Vercel"

Almost always a missing or expired `VERCEL_TOKEN` secret. The workflow now checks for
it in a separate step first, so the error message names the problem directly.

If the token is set and it still fails, run the same command locally:

```bash
vercel --prod --yes --token=$VERCEL_TOKEN
```

### The workflow fails at "Verify"

`npm run check` failed — either an inline script has a syntax error, a script
references an element id that does not exist, or a JSON file is malformed. The output
names the exact problem.

### The deployment succeeds but the site shows the old version

Vercel caches aggressively. `vercel.json` already sends
`Cache-Control: no-cache, no-store, must-revalidate` for HTML. Hard-reload
(<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>) or check a deployment URL directly.

### "The specified project does not exist"

The `.vercel/` folder is gitignored, so the CLI has nothing to read on the runner. The
workflow writes a minimal `.vercel/project.json` with `projectId` and `orgId` before
deploying — make sure those two values still match `.vercel/repo.json` on your machine.

### "No changes detected" / deploy skipped

The commit did not change anything Vercel considers deployable. Check
`vercel.json` — `outputDirectory` is `.` and `buildCommand` is empty, which is correct
for a static site.

### Redeeming a code says "not found"

The code was issued in the panel but the **migration is not applied** to the database, so
`redeem_code()` does not exist yet. The client falls back to `validate_code()`, which
exists but behaves differently. Apply `supabase/APPLY_NOW.sql`.

### The reader says "No chapters published yet"

The `chapters` table is empty. Publish content from `/admin` → **Content**. Each chapter
needs two rows: the preview row (public) and the full-text row (licensed).

### An old code stopped working

It should not have. `payment_verified` only blocks rows with `created_by = 'public'`.
Admin-issued codes keep working. If one fails, check its `status` and `expires_at` in
**Subscriptions**.

### Everything returns 401/403 from Supabase

Check that RLS is enabled on the table and that the anon key in the HTML is the **anon**
key, not the service-role key.

---

## Rollback

Vercel keeps every deployment. **Deployments → ⋮ → Promote to Production** restores a
previous build in one click.

For the database, migrations are additive and idempotent — there is no automatic
down-migration. If a migration goes wrong, fix it in the SQL Editor and re-run
`npm run db:build` output.

---

## Useful links

- Vercel: https://vercel.com/docs
- Supabase: https://supabase.com/docs
- Supabase SQL editor: https://supabase.com/dashboard/project/gvkcwtoryrzgbtufsgff/sql/new
- Vercel dashboard: https://vercel.com/teamalum-bookstore
