# Database Schema

Supabase project: `gvkcwtoryrzgbtufsgff`

Migrations live in `supabase/migrations/` and are applied in filename order. To apply
them by hand:

```bash
npm run db:build     # concatenates them into supabase/APPLY_NOW.sql
```

Then paste `supabase/APPLY_NOW.sql` into the Supabase SQL Editor. Every statement is
idempotent.

| Migration | What it does |
|-----------|--------------|
| `20260101000000_initial.sql` | Baseline (bookmark) |
| `20260102000000_followon.sql` | Baseline (bookmark) |
| `20260906000000_bookstore_admin_subscriptions.sql` | `subscriptions`, `device_activations`, `is_admin()`, `validate_code()`, `request_purchase()` |
| `20260906010000_fix_validate_code.sql` | Tightens `validate_code` |
| `20260907000000_unify_license_content.sql` | **The big one** — entitlement model, `redeem_code()`, `get_chapters()`, content RLS, admin read policies, chapter two-row constraint |

---

## The source of truth

| Table | Role |
|-------|------|
| `subscriptions` | **The** licence ledger *and* the order queue. One table for both. |
| `device_activations` | Which device is using which subscription (max 3) |

`licenses` and `redeem_codes` are the **old** model. They are kept as a read-only archive
and are visible in `/admin` → Archive. Do not write to them.

---

## Enums

| Enum | Values |
|------|--------|
| `subscription_plan` | `Starter`, `Professional`, `Lifetime`, `Custom` |
| `subscription_status` | `active`, `expired`, `revoked`, `pending` |
| `license_plan` (legacy) | `1M`, `3M`, `LT` |
| `chapter_status` | `draft`, `published`, `archived` |
| `book_status` | `draft`, `published`, `archived` |
| `user_role` | `user`, `admin`, `super_admin` |

---

## `subscriptions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | `gen_random_uuid()` |
| `code` | text unique | **NULL** for a purchase request until the admin issues one |
| `plan` | `subscription_plan` | |
| `custom_plan_name` | text | Only when `plan = 'Custom'` |
| `status` | `subscription_status` | Default `pending` |
| `created_at` | timestamptz | |
| `expires_at` | timestamptz | `NULL` ⇒ lifetime |
| `created_by` | text | Admin email, or `'public'` for a self-submitted request |
| `buyer_name` | text | |
| `buyer_phone` | text | |
| `buyer_email` | text | Used to match the reader's JWT |
| `amount_paid` | numeric(10,2) | INR |
| `payment_verified` | boolean | Default `false` |
| `payment_verified_at` | timestamptz | |
| `date_issued` | timestamptz | Default `now()` |
| `date_redeemed` | timestamptz | Set on first activation |
| `device_count` | integer | Cached count of activations |
| `notes` | text | |
| `updated_at` | timestamptz | |
| `user_id` | uuid → `auth.users.id` | Added by the unify migration; binds the licence to an account |
| `book_slug` | text | Default `prompt-engineering-blueprint` |

**Indexes:** `code` (unique), `status`, `plan`, `expires_at`, `date_issued`,
`buyer_name`, `buyer_phone`, `lower(buyer_email)`, `user_id`.

### Status flow

```
        request_purchase()                admin issues code          admin revokes
  ───────────────────────────►  pending  ──────────────────►  active  ──────────────►  revoked
                                    │                          │
                                    │                          └── expires_at passes ──► expired
                                    │
                                    └── (never redeemable while payment_verified = false)
```

---

## `device_activations`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `subscription_id` | uuid → `subscriptions.id` | `on delete cascade` |
| `device_id` | text | Stable browser fingerprint |
| `device_label` | text | e.g. `"Win32 Chrome"` — shown in the admin panel |
| `ip_address` | text | |
| `user_agent` | text | |
| `activated_at` | timestamptz | |

Unique on `(subscription_id, device_id)`. The redeem flow enforces a **maximum of 3
devices** per subscription.

---

## `books`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `title` | text | |
| `slug` | text unique | `prompt-engineering-blueprint` |
| `subtitle`, `description`, `cover_url` | text | |
| `author`, `publisher`, `edition`, `version`, `isbn` | text | |
| `chapters_count` | integer | |
| `status` | `book_status` | Default `draft` |
| `metadata` | jsonb | |
| `created_at`, `updated_at` | timestamptz | |

Seeded by the unify migration with the book published.

---

## `chapters` — two rows per chapter

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `book_id` | uuid → `books.id` | `on delete cascade` |
| `title` | text | |
| `slug` | text | Unique per book |
| `chapter_number` | integer | |
| `content` | text | Full text — only readable by a licensed reader |
| `preview_content` | text | The public teaser |
| `is_premium` | boolean | `true` for the full row |
| `is_free_preview` | boolean | **`true` = public row, `false` = paid row** |
| `word_count`, `estimated_minutes` | integer | |
| `status` | `chapter_status` | Only `published` rows are readable |
| `metadata` | jsonb | |
| `created_at`, `updated_at` | timestamptz | |

### Why two rows?

Postgres Row Level Security operates on **rows**, not columns. A single row holding both
the teaser and the paid text would leak the whole text to anyone who can read the row.

So a chapter is stored as:

| Row | `is_free_preview` | Readable by |
|-----|-------------------|-------------|
| A | `true` | Everybody |
| B | `false` | Only a reader with an active subscription |

The baseline schema had `unique(book_id, chapter_number)`, which made this impossible.
The unify migration drops that constraint and replaces it with:

```sql
create unique index idx_chapters_variant
  on public.chapters (book_id, chapter_number, is_free_preview);
```

So a chapter has at most one preview row and at most one full row. `unique(book_id, slug)`
stays — the two rows therefore need different slugs (the admin editor appends
`-preview` / `-full` automatically when needed).

`get_chapters()` returns one entry per chapter number, preferring the **full** row.

---

## Functions

| Function | Returns | Volatility | Who can call it |
|----------|---------|-----------|-----------------|
| `is_admin()` | boolean | stable, `security invoker` | everyone (returns false without an admin JWT) |
| `has_active_subscription()` | boolean | stable, `security definer` | anon, authenticated |
| `owns_subscription(uuid)` | boolean | stable, `security definer` | anon, authenticated |
| `redeem_code(text, text, text)` | jsonb | `security definer` | anon, authenticated |
| `validate_code(text, text, text)` | jsonb | `security definer` | anon, authenticated (delegates to `redeem_code`) |
| `get_chapters(text, text)` | jsonb | `security definer` | anon, authenticated |
| `get_book_outline()` | jsonb | stable, `security definer` | anon, authenticated |
| `request_purchase(text, numeric, text, text, text)` | uuid | `security definer` | anon, authenticated |
| `expire_subscriptions()` | integer | `security definer` | **service_role only** (revoked from anon/authenticated) |

---

## Row Level Security

RLS is enabled on every table.

### `chapters` (the important ones)

| Policy | Action | Rule |
|--------|--------|------|
| `chapters_public_preview` | SELECT | `status = 'published' and is_free_preview = true` |
| `chapters_licensed_full` | SELECT | `status = 'published' and not is_free_preview and has_active_subscription()` |
| `chapters_admin_all` | ALL | `is_admin()` |

### `books`

| Policy | Action | Rule |
|--------|--------|------|
| `books_public_published` | SELECT | `status = 'published'` |
| `books_admin_all` | ALL | `is_admin()` |

### `subscriptions`

| Policy | Action | Rule |
|--------|--------|------|
| `admin can manage subscriptions` | ALL | `is_admin()` |
| `Users can view own subscription` | SELECT | `owns_subscription(id)` |

There is deliberately **no** public INSERT/UPDATE/DELETE policy. Public writes only
happen through `request_purchase()`.

### `device_activations`

| Policy | Action | Rule |
|--------|--------|------|
| `admin access device activations` | ALL | `is_admin()` |
| `Users can view own device activations` | SELECT | `owns_subscription(subscription_id)` |

### Other tables

| Table | Public read | Public write | Admin read |
|-------|-------------|--------------|------------|
| `profiles` | own row | own row | ✅ `is_admin()` |
| `licenses` | — | — | ✅ `is_admin()` (archive) |
| `redeem_codes` | — | — | ✅ `is_admin()` (archive) |
| `reading_progress` | own | own | ✅ `is_admin()` |
| `bookmarks` | own | own | ✅ `is_admin()` |
| `newsletter_subscribers` | — | INSERT | ✅ `is_admin()` |
| `contact_messages` | — | INSERT | ✅ `is_admin()` |
| `support_tickets` | own | own | ✅ `is_admin()` |
| `audit_logs` | — | — | ✅ `is_admin()` |
| `analytics_events` | — | INSERT | ✅ `is_admin()` |

The email-based admin policies were added because the original ones checked
`profiles.role`, which only works if that row was seeded correctly. They are additive —
the role-based policies remain.

---

## Legacy tables (archive)

`licenses` and `redeem_codes` are the **first version** of the licence model. The old
`chapters` RLS policy checked `licenses`, which the new redemption flow never wrote to —
that is why a redeemed code used to unlock nothing. They are kept for reference only.

---

## Entity relationships

```
                 ┌──────────────────────┐
                 │      subscriptions   │  ← source of truth
                 │  code / plan / status │
                 │  buyer_* / amount     │
                 │  payment_verified     │
                 └───┬──────────────┬───┘
       user_id  ┌───┘              │  └────┐
       (auth)   │                  │       │
                ▼                  ▼       ▼
   ┌────────────────────┐  ┌──────────────────────┐
   │  device_activations │  │      profiles        │
   │  max 3 per licence  │  │  mirror of auth.users │
   └────────────────────┘  └──────────────────────┘

   ┌──────────┐        ┌────────────────────────────┐
   │  books   │───────>│          chapters          │
   └──────────┘        │  row A: is_free_preview=true  (public)
                       │  row B: is_free_preview=false (licensed)
                       └────────────────────────────┘
```
