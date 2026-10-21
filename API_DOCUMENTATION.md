# API Documentation

## There is no custom API server

This project has **no Next.js API routes and no backend of its own**. The browser talks
straight to Supabase over its REST + RPC interface using the *anon* key. All business
logic (entitlement, redemption, content gating) lives in Postgres functions and RLS
policies — that is deliberate, because a rule enforced only in JavaScript can be bypassed
by editing the browser.

So "the API" is:

1. **Supabase PostgREST** — table reads/writes (`/rest/v1/<table>`), governed by RLS
2. **Supabase RPC** — the `public.*` functions below, invoked as `/rest/v1/rpc/<fn>`
3. **Supabase Auth** — `/auth/v1/*` (Google OAuth, email/password, session)

Base URL: `https://gvkcwtoryrzgbtufsgff.supabase.co`

Headers on every request:

```
apikey: <anon key>
Authorization: Bearer <session JWT>   # only for signed-in calls
Content-Type: application/json
```

---

## RPC functions

These are the only write paths that matter. They are all `security definer`, so they
bypass RLS deliberately — the checks live inside the function body.

### `redeem_code(code, device_id, device_label)`

The single entry point for redemption. Validates the code, binds the device, binds the
account, activates the subscription.

| Parameter | Type | Notes |
|-----------|------|-------|
| `p_code` | text | e.g. `TA-PE-3M-A1B2C3`. Case-insensitive, trimmed |
| `p_device_id` | text | Stable per-browser id (UUID in `localStorage`) |
| `p_device_label` | text | e.g. `"Win32 Chrome"` — shown in the admin panel |

**Success**

```json
{
  "valid": true,
  "code": "TA-PE-3M-A1B2C3",
  "plan": "Professional",
  "expires_at": "2026-11-22T10:00:00+00:00",
  "user_bound": true,
  "device_count": 1
}
```

**Failure** — `valid` is `false` and `reason` explains why:

| `reason` | Meaning |
|----------|---------|
| `not_found` | No such code (also returned for null/empty input) |
| `revoked` | The admin revoked it |
| `expired` | `expires_at` is in the past (checked in real time, not by cron) |
| `payment_not_verified` | A public purchase request the admin has not confirmed yet |
| `device_limit` | Already bound to 3 devices (limit is 3) |
| `active` / `expired` / `pending` | The stored `status` was not usable |

---

### `validate_code(code, device_id, device_label)`

Identical behaviour — it simply delegates to `redeem_code`. Kept for backwards
compatibility with older clients. The storefront calls `redeem_code` first and only falls
back to `validate_code` if the function does not exist yet.

---

### `get_chapters(code, device_id)`

Returns the book content **only** if the code is valid *and* the device is already bound
to it.

**Success**

```json
{
  "ok": true,
  "plan": "Lifetime",
  "expires_at": null,
  "chapters": [
    {
      "chapter_number": 1,
      "title": "Foundations of Prompt Engineering",
      "slug": "chapter-1",
      "content": "# Foundations\n\n...",
      "is_free_preview": false,
      "word_count": 3120,
      "estimated_minutes": 14
    }
  ]
}
```

When a chapter has both a preview row and a full row, the **full row wins** (the preview
is a teaser for non-readers; a licensed reader gets the real text).

**Failure**

```json
{ "ok": false, "reason": "device_not_bound" }
```

Possible reasons: `not_found`, `revoked`, `expired`, `payment_not_verified`,
`device_not_bound`.

---

### `get_book_outline()`

Public chapter list **without any content** — safe for anonymous callers.

```json
[
  { "chapter_number": 1, "title": "Foundations", "slug": "chapter-1",
    "free_preview": true, "word_count": 3120, "estimated_minutes": 14 }
]
```

---

### `has_active_subscription()`

No arguments. Returns `true` when the *current caller* (from the JWT) owns an active
subscription. Used inside RLS policies, so it can never be used to probe somebody
else's entitlement.

The caller qualifies if **any** of these hold:

- `subscriptions.user_id = auth.uid()`, or
- `lower(subscriptions.buyer_email) = lower(auth.jwt() ->> 'email')`

…and the row satisfies:

- `status = 'active'`
- `expires_at IS NULL OR expires_at > now()`
- `payment_verified = true` **or** `created_by <> 'public'`

---

### `owns_subscription(subscription_id)`

`true` when the caller owns that specific subscription row. Powers the
"Users can view own subscription" / "Users can view own device activations" policies.

---

### `request_purchase(plan, amount, email, name, phone)`

Creates a **pending** purchase request. This is the only way the public can write to
`subscriptions` — a raw `INSERT` with the anon key is rejected by RLS.

| Parameter | Type | Notes |
|-----------|------|-------|
| `p_plan` | text | `Starter` \| `Professional` \| `Lifetime` \| `Custom` |
| `p_amount` | numeric | INR amount |
| `p_email` | text | Required by the client; malformed addresses are stored as `NULL` |
| `p_name` | text | Optional |
| `p_phone` | text | Optional |

Returns the new row's `uuid`.

The row it creates always has `code = NULL`, `status = 'pending'`,
`payment_verified = false`, `created_by = 'public'`. It becomes redeemable only after the
admin confirms the payment from `/admin` → Purchase Requests → **Issue Code**.

> The old two-argument `(text, numeric)` overload was dropped so PostgREST cannot pick
> the wrong one. The client always sends all five keys.

---

### `is_admin()`

Returns `true` when `auth.jwt() ->> 'email' = 'teamalumorg@gmail.com'`.
There is exactly one admin account. The check does not depend on a `profiles.role` row,
so it cannot be locked out by a bad seed.

---

### `expire_subscriptions()`

Marks already-expired rows as `expired`. **Not callable by `anon` or `authenticated`**
anymore — it is a maintenance function for `service_role` / the cron job. Real-time
expiry is enforced inside `redeem_code` and `get_chapters`, so nothing depends on it
running.

---

## Tables

Reads and writes go through `/rest/v1/<table>` with the anon key; RLS decides what is
visible. Only these three are writable by the public:

| Table | Public write? | How |
|-------|---------------|-----|
| `newsletter_subscribers` | ✅ INSERT | "anyone can subscribe" policy |
| `contact_messages` | ✅ INSERT | "anyone can submit messages" policy |
| `subscriptions` | ⚠️ via RPC only | `request_purchase()` — direct INSERT is blocked |
| `chapters` / `books` | ❌ | admin only |
| `device_activations` | ❌ | written by `redeem_code()` |

---

## Errors

PostgREST returns:

```json
{ "code": "42501", "message": "new row violates row-level security policy for table \"subscriptions\"" }
```

| Code | Meaning |
|------|---------|
| `42501` | RLS blocked the operation — you are not allowed to see/write that row |
| `PGRST202` | Function not found — usually means the migration has not been applied yet |
| `PGRST202` / `42883` on `rpc()` | The client falls back to a direct table read |

---

## Example requests

```bash
SB=https://gvkcwtoryrzgbtufsgff.supabase.co
KEY=<anon key>

# Redeem a code
curl -X POST "$SB/rest/v1/rpc/redeem_code" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"p_code":"TA-PE-3M-A1B2C3","p_device_id":"device-abc","p_device_label":"Win32 Chrome"}'

# Fetch the book with that code
curl -X POST "$SB/rest/v1/rpc/get_chapters" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"p_code":"TA-PE-3M-A1B2C3","p_device_id":"device-abc"}'

# Public outline (no content)
curl -X POST "$SB/rest/v1/rpc/get_book_outline" \
  -H "apikey: $KEY" -H "Content-Type: application/json" -d '{}'

# Submit a purchase request
curl -X POST "$SB/rest/v1/rpc/request_purchase" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"p_plan":"Starter","p_amount":199,"p_email":"buyer@example.com","p_name":"A Buyer","p_phone":"+919999999999"}'

# Read published preview rows (public)
curl "$SB/rest/v1/chapters?select=chapter_number,title,is_free_preview,content&status=eq.published" \
  -H "apikey: $KEY"
```

---

## Client-side flows

### Redemption (`index.html`)

```
1. Buyer pastes a code  →  format check  /^TA-PE-([A-Z0-9]{2,4})-[A-Z0-9]{6}$/
2. redeem_code(code, deviceId, deviceLabel)
3. On success: save {code, plan, expires_at} in localStorage
4. On every page load and every reader open: re-validate with the server
   (localStorage is never trusted on its own)
```

### Purchase (`index.html`)

```
1. Buyer picks a plan → modal asks for email (required), name and phone
2. confirmWhatsApp() opens wa.me with the buyer's details pre-filled
3. request_purchase(plan, amount, email, name, phone) records the request
4. The admin issues the code from /admin → Purchase Requests
```

### Admin (`admin-subscriptions.html`)

The panel uses the anon key but with an admin session (Google sign-in as
`teamalumorg@gmail.com`). Every read and write is authorised by `is_admin()` in RLS —
the browser cannot elevate itself.

| Action | Call |
|--------|------|
| List subscriptions | `from('subscriptions').select('*')` |
| Issue a code | `from('subscriptions').update({code, status:'active', expires_at, payment_verified:true}).eq('id', …)` |
| Generate a code | `from('subscriptions').insert({...})` |
| Revoke | `from('subscriptions').update({status:'revoked'})` |
| Unbind a device | `from('device_activations').delete().eq('id', …)` |
| Save a chapter | `from('chapters').update(...)` / `.insert(...)` |
