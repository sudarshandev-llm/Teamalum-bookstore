-- ============================================================
-- Team Alum Bookstore — Admin Panel Data Model
-- Adds the `subscriptions` + `device_activations` tables,
-- strict single-admin (email-claim based) RLS, and auto-expiry.
--
-- The SINGLE admin account is: teamalumorg@gmail.com
-- All admin access is enforced at the database via:
--   auth.jwt() ->> 'email' = 'teamalumorg@gmail.com'
-- This cannot be bypassed by calling the API with the anon key
-- (that key carries no admin email claim), and it does NOT depend
-- on a seedable profiles.role row.
-- ============================================================

-- 0. EXTENSIONS
create extension if not exists pg_cron;

-- 0. ENUMS
create type public.subscription_plan as enum ('Starter', 'Professional', 'Lifetime', 'Custom');
create type public.subscription_status as enum ('active', 'expired', 'revoked', 'pending');

-- ============================================================
-- 1. SUBSCRIPTIONS  (admin-facing purchase / license record)
-- ============================================================
create table public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),

  -- License code / plan / lifecycle
  -- code is NULL for public purchase requests until the admin issues
  -- a real code after WhatsApp payment verification.
  code                 text unique,
  plan                 public.subscription_plan not null,
  custom_plan_name     text,                              -- only when plan = 'Custom'
  status               public.subscription_status not null default 'pending',

  created_at           timestamptz not null default now(),
  expires_at           timestamptz,                       -- NULL => lifetime / no expiry
  created_by           text,                              -- admin email who generated the code OR 'public' for self-submitted requests

  -- Buyer info (filled by admin after WhatsApp payment verification,
  -- or via public purchase request insert)
  buyer_name           text,
  buyer_phone          text,
  buyer_email          text,

  -- Commercial / verification
  amount_paid          numeric(10,2),                     -- INR amount actually paid
  payment_verified     boolean not null default false,    -- admin confirms WhatsApp payment
  payment_verified_at  timestamptz,

  -- Timelines
  date_issued          timestamptz not null default now(),-- generated / issued date
  date_redeemed        timestamptz,                       -- when the buyer first activated the code

  -- device tracking ("up to 3 devices" rule from FAQ)
  device_count         integer not null default 0,

  notes                text,
  updated_at           timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- ============================================================
-- 2. DEVICE ACTIVATIONS  (which devices/sessions used a code)
-- ============================================================
create table public.device_activations (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references public.subscriptions(id) on delete cascade,
  device_id        text not null,                          -- stable browser/device fingerprint
  device_label     text,                                   -- e.g. "Chrome on Windows"
  ip_address       text,
  user_agent       text,
  activated_at     timestamptz not null default now(),
  unique(subscription_id, device_id)
);

alter table public.device_activations enable row level security;

create index idx_subscriptions_code      on public.subscriptions(code);
create index idx_subscriptions_status    on public.subscriptions(status);
create index idx_subscriptions_plan      on public.subscriptions(plan);
create index idx_subscriptions_expiry    on public.subscriptions(expires_at);
create index idx_subscriptions_created   on public.subscriptions(date_issued);
create index idx_subscriptions_buyer_name  on public.subscriptions(buyer_name);
create index idx_subscriptions_buyer_phone on public.subscriptions(buyer_phone);
create index idx_subscriptions_buyer_email on public.subscriptions(buyer_email);
create index idx_device_sub              on public.device_activations(subscription_id);

-- ============================================================
-- 3. ROW LEVEL SECURITY  (defense in depth — server side)
-- ============================================================
-- Admin predicate shared across SUBSCRIPTIONS + DEVICE_ACTIVATIONS.
-- The ONLY account that can read/write admin data is teamalumorg@gmail.com.

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'email') = 'teamalumorg@gmail.com', false);
$$;

-- SUBSCRIPTIONS -------------------------------------------------
-- Admin: full SELECT/INSERT/UPDATE/DELETE
create policy "admin can manage subscriptions"
  on public.subscriptions for all
  using (public.is_admin())
  with check (public.is_admin());

-- NOTE: public users do NOT get direct INSERT on `subscriptions`.
-- Purchase requests go through the security-definer function
-- `public.request_purchase()` below, which only ever creates a
-- pending row (code NULL, status 'pending', payment_verified=false).
-- This prevents an attacker from self-granting an 'active' code via
-- a raw anon INSERT.

-- DEVICE_ACTIVATIONS --------------------------------------------
-- Admin: full access
create policy "admin access device activations"
  on public.device_activations for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 4. PUBLIC PURCHASE REQUEST
--    Security-definer: creates a controlled 'pending' row only.
--    Cannot set code/status/amount beyond what the function allows.
-- ============================================================
create function public.request_purchase(
  p_plan text,
  p_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.subscription_plan;
  v_id uuid;
begin
  v_plan := p_plan::public.subscription_plan;
  insert into public.subscriptions (plan, status, amount_paid, created_by, date_issued)
  values (v_plan, 'pending', p_amount, 'public', now())
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.request_purchase(text, numeric) to anon, authenticated;

-- ============================================================
-- 5. CODE VALIDATION (real-time check called at redemption time)
--    Returns whether a code is usable right now and registers a device.
--    The validity check treats anything past expires_at as invalid
--    REGARDLESS of the stored `status` column (belt & suspenders),
--    so an expired code stops granting access immediately.
-- ============================================================
create or replace function public.validate_code(
  p_code text,
  p_device_id text default null,
  p_device_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec public.subscriptions%rowtype;
  v_count integer;
begin
  select * into rec from public.subscriptions
    where upper(coalesce(code,'')) = upper(coalesce(p_code,''));

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  -- Real-time expiry check: expired code is invalid even if job hasn't run yet.
  if rec.status = 'revoked' then
    return jsonb_build_object('valid', false, 'reason', 'revoked');
  end if;

  if rec.expires_at is not null and rec.expires_at <= now() then
    -- keep stored status accurate for the admin view
    update public.subscriptions
       set status = 'expired', updated_at = now()
     where id = rec.id and status <> 'revoked';
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;

  if rec.status not in ('active', 'pending') then
    return jsonb_build_object('valid', false, 'reason', rec.status);
  end if;

  -- Device limit (up to 3 devices)
  if p_device_id is not null then
    select count(*) into v_count
      from public.device_activations where subscription_id = rec.id;
    if v_count >= 3 and not exists (
        select 1 from public.device_activations
         where subscription_id = rec.id and device_id = p_device_id
    ) then
      return jsonb_build_object('valid', false, 'reason', 'device_limit');
    end if;

    insert into public.device_activations
      (subscription_id, device_id, device_label)
    values (rec.id, p_device_id, p_device_label)
    on conflict (subscription_id, device_id) do nothing;

    update public.subscriptions
       set device_count = (
             select count(*) from public.device_activations where subscription_id = rec.id
           ),
           date_redeemed = coalesce(date_redeemed, now()),
           status = 'active',
           updated_at = now()
     where id = rec.id;
  end if;

  return jsonb_build_object(
    'valid', true,
    'plan', rec.plan::text,
    'expires_at', rec.expires_at
  );
end;
$$;

grant execute on function public.validate_code(text, text, text) to anon, authenticated;

-- ============================================================
-- 6. AUTO-EXPIRY
--    (a) expire_subscriptions(): keeps stored status accurate (admin view)
--    (b) pg_cron daily job runs it (see separate cron setup script)
--    (c) validate_code() above is the real-time backstop
-- ============================================================
create or replace function public.expire_subscriptions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.subscriptions
     set status = 'expired', updated_at = now()
   where status = 'active'
     and expires_at is not null
     and expires_at <= now();
  get diagnostics n = row_count;
  return n;
end;
$$;