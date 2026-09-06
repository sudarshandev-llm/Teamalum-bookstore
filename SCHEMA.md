# Team Alum Bookstore — Database Schema (Admin / Subscriptions)

Live Supabase project: `gvkcwtoryrzgbtufsgff.supabase.co`

The bookstore shares the same Supabase project as the main Team Alum site (per
requirements). The tables below are bookstore-specific; the existing
`profiles`, `books`, `chapters`, `licenses`, `redeem_codes`, etc. tables are
left untouched except where noted.

Migration: `supabase/migrations/20260906000000_bookstore_admin_subscriptions.sql`

---

## The single admin gate

All admin operations are restricted at the **database level** to exactly one
account:

```
teamalumorg@gmail.com
```

This is enforced by RLS using the JWT email claim, **not** the `profiles.role`
column:

```sql
select coalesce((auth.jwt() ->> 'email') = 'teamalumorg@gmail.com', false);
```

Because it reads the token's email claim directly:
- The **anon key** (used in the public frontend) carries no such claim, so it
  can never read/write admin data.
- No seedable role row is required, and no other account (including other
  founder emails) can be promoted accidentally.
- The client side (admin.html) enforces the same check as a convenient UX
  guard; the RLS below is the authoritative, non-bypassable layer.

---

## Table: `public.subscriptions`

Single source of truth for every license/purchase. One row per generated code.

| Column | Type | Meaning |
|--------|------|---------|
| `id` | uuid PK | Surrogate key. |
| `code` | text UNIQUE | Human-shareable code, e.g. `TA-PE-1M-X8K29Q`. Unique; collision-free. |
| `plan` | `subscription_plan` enum | `Starter` / `Professional` / `Lifetime` / `Custom`. |
| `custom_plan_name` | text | Set only when `plan = 'Custom'`. |
| `status` | `subscription_status` enum | `pending` → `active` → `expired` / `revoked`. `pending` = generated/requested, not yet redeemed. |
| `created_at` | timestamptz | Row creation time. |
| `expires_at` | timestamptz | Access expiry. NULL = lifetime / no expiry. |
| `created_by` | text | Admin email who generated the code, or buyer email on self-submitted requests. |
| `buyer_name` | text | Buyer's full name (admin-entered after WhatsApp verification, or from purchase request). |
| `buyer_phone` | text | Buyer phone / WhatsApp number. |
| `buyer_email` | text | Buyer email. |
| `amount_paid` | numeric(10,2) | Amount actually paid (INR). |
| `payment_verified` | boolean | True once admin confirms the WhatsApp payment. |
| `payment_verified_at` | timestamptz | When payment was verified. |
| `date_issued` | timestamptz | Date the code was issued/generated. |
| `date_redeemed` | timestamptz | Date the buyer first activated the code (NULL until redeemed). |
| `device_count` | integer | Number of distinct activated devices (max 3). |
| `notes` | text | Free-form admin notes. |
| `updated_at` | timestamptz | Last modified. |

### RLS
- **Admin** (`teamalumorg@gmail.com`): full SELECT / INSERT / UPDATE / DELETE.
- **Public / anon**: NO direct access to the table. Purchase requests go through
  the security-definer function `public.request_purchase(plan, amount)`, which
  only ever creates a `pending` row (code NULL, status `pending`,
  `payment_verified=false`). This prevents an attacker from self-granting an
  `active` code via a raw anon INSERT. They can **never** SELECT, UPDATE, or
  DELETE these rows. Reading/exporting buyer PII is impossible outside the
  admin email.

---

## Table: `public.device_activations`

Tracks which devices/sessions activated a code (enforces the "up to 3
devices" FAQ rule).

| Column | Type | Meaning |
|--------|------|---------|
| `id` | uuid PK | Surrogate key. |
| `subscription_id` | uuid FK | Owning subscription. |
| `device_id` | text | Stable browser/device fingerprint generated on the client. |
| `device_label` | text | Human label, e.g. "Chrome on Windows". |
| `ip_address` | text | Client IP (best-effort). |
| `user_agent` | text | Raw UA string. |
| `activated_at` | timestamptz | When activated. |

`UNIQUE (subscription_id, device_id)` prevents double-counting a device.

### RLS
- **Admin**: full access.
- **Public**: no direct access (they interact only via the `validate_code`
  security-definer function, which never returns other buyers' data).

---

## Code lifecycle & validity

**Real-time check** (`public.validate_code(code, device_id, device_label)`)
is the authoritative gate at redemption/usage time. It is a SECURITY DEFINER
function, so it runs with elevated privileges but exposes only the boolean
result plus the caller's own plan/expiry — never the whole table. It:

1. Rejects unknown codes.
2. Rejects revoked codes.
3. Treats anything with `expires_at <= now()` as **expired regardless of the
   stored `status`**, flipping the stored status for the admin view —
   this is the real-time backstop so an expired code stops granting access
   immediately even if the cron job has not run yet.
4. Enforces the 3-device limit.
5. Records/activates the device and stamps `date_redeemed` + sets `active`.

**Daily job** (`public.expire_subscriptions()`) is scheduled via `pg_cron`
(`bookstore-daily-expire`, every day 00:05 UTC) to keep the stored `status`
accurate for the admin dashboard. It is belt-and-suspenders with step 3 above.

---

## Enums

```sql
create type public.subscription_plan   as enum ('Starter','Professional','Lifetime','Custom');
create type public.subscription_status as enum ('active','expired','revoked','pending');
```

---

## Security notes

- The Supabase **anon key** goes in the frontend only. The `service_role` key
  is never shipped to the client. Admin mutations go through RLS-protected
  calls authenticated as `teamalumorg@gmail.com`, or through the
  security-definer `validate_code` function for code validation.
- No one other than `teamalumorg@gmail.com` can read or export purchaser
  personal data (name, phone, email) — enforced by RLS, not just the UI.
