-- ============================================================
-- Team Alum Bookstore — Unify License + Content Access
--
-- Fixes the missing link between the admin panel and the reader:
--
--   BEFORE
--     - /admin panel issues codes into `subscriptions`
--     - redemption wrote to `device_activations` only
--     - `chapters` RLS checked the OLD `licenses` table
--       (which the new redemption flow never wrote to)
--     - so a redeemed code unlocked NOTHING
--
--   AFTER
--     - `subscriptions` is the single source of truth for licenses
--     - `redeem_code()` validates + binds the device + binds the account
--     - `get_chapters()` returns chapter content ONLY to a valid license
--     - `chapters` RLS exposes free-preview rows publicly and full
--       rows only to entitled readers
--
-- Safe to re-run (idempotent).
-- ============================================================


-- ============================================================
-- 1. SUBSCRIPTIONS — bind a license to a signed-in account
-- ============================================================
alter table public.subscriptions
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.subscriptions
  add column if not exists book_slug text not null default 'prompt-engineering-blueprint';

create index if not exists idx_subscriptions_user  on public.subscriptions(user_id);
create index if not exists idx_subscriptions_email on public.subscriptions(lower(buyer_email));


-- ============================================================
-- 1b. CHAPTERS — allow two rows per chapter
--
--     The baseline schema declared `unique(book_id, chapter_number)`.
--     That makes it impossible to store the free preview and the
--     paid full text as two rows of the SAME chapter — which is
--     exactly what row-level security needs.
--
--     Replace it with `unique(book_id, chapter_number, is_free_preview)`:
--     at most one preview row and at most one full row per chapter.
-- ============================================================
-- conventional name first (fast path), then a generic sweep in case
-- the constraint was created under a different name.
alter table public.chapters drop constraint if exists chapters_book_id_chapter_number_key;

do $$
declare
  con record;
begin
  for con in
    select c.conname,
           (select array_agg(a.attname::text order by a.attname)
              from unnest(c.conkey) k
              join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k
           ) as colnames
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
     where t.relname = 'chapters'
       and n.nspname = 'public'
       and c.contype = 'u'
  loop
    if con.colnames = array['book_id','chapter_number']::text[] then
      execute format('alter table public.chapters drop constraint %I', con.conname);
    end if;
  end loop;
end;
$$;

create unique index if not exists idx_chapters_variant
  on public.chapters (book_id, chapter_number, is_free_preview);


-- ============================================================
-- 2. ENTITLEMENT CHECK
--    Returns true when the CURRENT caller owns an active license.
--    Takes no arguments on purpose: it derives the identity from
--    the JWT so it can be used inside RLS policies and can never
--    be used to probe somebody else's entitlement.
--
--    security definer is REQUIRED: `subscriptions` is admin-only
--    under RLS, so an invoker-rights check would always be false.
-- ============================================================
create or replace function public.has_active_subscription()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.status = 'active'
      and (s.expires_at is null or s.expires_at > now())
      -- public purchase requests stay locked until the admin
      -- confirms the WhatsApp payment; admin-issued codes are trusted.
      and (s.payment_verified = true or s.created_by is distinct from 'public')
      and (
        (auth.uid() is not null and s.user_id = auth.uid())
        or (
          auth.jwt() ->> 'email' is not null
          and lower(s.buyer_email) = lower(auth.jwt() ->> 'email')
        )
      )
  );
$$;

revoke all on function public.has_active_subscription() from public;
grant execute on function public.has_active_subscription() to anon, authenticated;


-- ============================================================
-- 3. REDEEM_CODE
--    Single entry point for redemption. Does everything the old
--    `validate_code` did, PLUS:
--      - binds the license to the signed-in account (first redemption wins)
--      - reports the device count and the plan
--
--    Returns {valid, reason?, code?, plan?, expires_at?, user_bound?, device_count?}
-- ============================================================
create or replace function public.redeem_code(
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
  rec       public.subscriptions%rowtype;
  v_count   integer;
  v_user    uuid;
begin
  v_user := auth.uid();

  -- reject null / empty codes (never match a NULL-code purchase row)
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  select * into rec
    from public.subscriptions
   where upper(code) = upper(trim(p_code));

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  if rec.status = 'revoked' then
    return jsonb_build_object('valid', false, 'reason', 'revoked');
  end if;

  -- real-time expiry check (the cron job only keeps the column tidy)
  if rec.expires_at is not null and rec.expires_at <= now() then
    update public.subscriptions
       set status = 'expired', updated_at = now()
     where id = rec.id and status <> 'revoked';
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;

  if rec.status not in ('active', 'pending') then
    return jsonb_build_object('valid', false, 'reason', rec.status);
  end if;

  -- a purchase request stays locked until the admin confirms payment
  if rec.payment_verified is not true and rec.created_by = 'public' then
    return jsonb_build_object('valid', false, 'reason', 'payment_not_verified');
  end if;

  -- device limit: up to 3 devices per license
  if p_device_id is not null and length(trim(p_device_id)) > 0 then
    select count(*) into v_count
      from public.device_activations
     where subscription_id = rec.id;

    if v_count >= 3 and not exists (
      select 1 from public.device_activations
       where subscription_id = rec.id and device_id = p_device_id
    ) then
      return jsonb_build_object(
        'valid', false, 'reason', 'device_limit',
        'devices_used', v_count, 'device_limit', 3
      );
    end if;

    insert into public.device_activations (subscription_id, device_id, device_label)
    values (rec.id, p_device_id, p_device_label)
    on conflict (subscription_id, device_id) do nothing;
  end if;

  -- activate + bind the account (first redemption wins the binding)
  update public.subscriptions
     set status        = 'active',
         user_id       = coalesce(user_id, v_user),
         date_redeemed = coalesce(date_redeemed, now()),
         device_count  = (
           select count(*) from public.device_activations
            where subscription_id = rec.id
         ),
         updated_at    = now()
   where id = rec.id;

  return jsonb_build_object(
    'valid',        true,
    'code',         rec.code,
    'plan',         rec.plan::text,
    'expires_at',   rec.expires_at,
    'user_bound',   v_user is not null,
    'device_count', (
      select count(*) from public.device_activations
       where subscription_id = rec.id
    )
  );
end;
$$;

revoke all on function public.redeem_code(text, text, text) from public;
grant execute on function public.redeem_code(text, text, text) to anon, authenticated;


-- ============================================================
-- 4. VALIDATE_CODE — kept for backwards compatibility, now
--    delegates to redeem_code so both paths behave identically.
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
begin
  return public.redeem_code(p_code, p_device_id, p_device_label);
end;
$$;

revoke all on function public.validate_code(text, text, text) from public;
grant execute on function public.validate_code(text, text, text) to anon, authenticated;


-- ============================================================
-- 5. GET_BOOK_OUTLINE — public chapter list (metadata only)
--    No content is returned, so this is safe for anonymous callers.
-- ============================================================
create or replace function public.get_book_outline()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'chapter_number',    x.chapter_number,
        'title',             x.title,
        'slug',              x.slug,
        'free_preview',      x.free_preview,
        'word_count',        x.word_count,
        'estimated_minutes', x.estimated_minutes
      ) order by x.chapter_number
    ), '[]'::jsonb
  )
  from (
    select c.chapter_number,
           min(c.title)             as title,
           min(c.slug)              as slug,
           bool_or(c.is_free_preview) as free_preview,
           max(c.word_count)        as word_count,
           max(c.estimated_minutes) as estimated_minutes
      from public.chapters c
      join public.books b on b.id = c.book_id
     where b.slug = 'prompt-engineering-blueprint'
       and c.status = 'published'
     group by c.chapter_number
  ) x;
$$;

revoke all on function public.get_book_outline() from public;
grant execute on function public.get_book_outline() to anon, authenticated;


-- ============================================================
-- 6. GET_CHAPTERS — content behind a valid license
--    Requires the code AND a device that is already bound to it.
--    Returns {ok, reason?, plan?, expires_at?, chapters: [...]}
--
--    Chapters are stored as TWO rows per chapter so that row-level
--    security can separate them:
--      row A -> is_free_preview = true  (preview text, public)
--      row B -> is_free_preview = false (full text, licensed only)
--    The full row wins when both exist.
-- ============================================================
create or replace function public.get_chapters(
  p_code text,
  p_device_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec public.subscriptions%rowtype;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  select * into rec
    from public.subscriptions
   where upper(code) = upper(trim(p_code));

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if rec.status = 'revoked' then
    return jsonb_build_object('ok', false, 'reason', 'revoked');
  end if;

  if rec.expires_at is not null and rec.expires_at <= now() then
    update public.subscriptions
       set status = 'expired', updated_at = now()
     where id = rec.id and status <> 'revoked';
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  if rec.status not in ('active', 'pending') then
    return jsonb_build_object('ok', false, 'reason', rec.status);
  end if;

  if rec.payment_verified is not true and rec.created_by = 'public' then
    return jsonb_build_object('ok', false, 'reason', 'payment_not_verified');
  end if;

  -- the device must already be bound by redeem_code()
  if p_device_id is not null and length(trim(p_device_id)) > 0 then
    if not exists (
      select 1 from public.device_activations
       where subscription_id = rec.id and device_id = p_device_id
    ) then
      return jsonb_build_object('ok', false, 'reason', 'device_not_bound');
    end if;
  end if;

  return jsonb_build_object(
    'ok',         true,
    'plan',       rec.plan::text,
    'expires_at', rec.expires_at,
    'chapters',   (
      select coalesce(
        jsonb_agg(jsonb_build_object(
          'chapter_number',    c.chapter_number,
          'title',             c.title,
          'slug',              c.slug,
          'content',           c.content,
          'is_free_preview',   c.is_free_preview,
          'word_count',        c.word_count,
          'estimated_minutes', c.estimated_minutes
        ) order by c.chapter_number), '[]'::jsonb)
      from (
        select distinct on (c2.chapter_number)
               c2.chapter_number, c2.title, c2.slug, c2.content,
               c2.is_free_preview, c2.word_count, c2.estimated_minutes
          from public.chapters c2
          join public.books b2 on b2.id = c2.book_id
         where b2.slug = coalesce(rec.book_slug, 'prompt-engineering-blueprint')
           and c2.status = 'published'
         order by c2.chapter_number, c2.is_free_preview asc
      ) c
    )
  );
end;
$$;

revoke all on function public.get_chapters(text, text) from public;
grant execute on function public.get_chapters(text, text) to anon, authenticated;


-- ============================================================
-- 7. PURCHASE REQUEST — now records WHO asked
--    Signature changed from (text, numeric) to (text, numeric, text, text, text).
--    The old 2-arg version is dropped so PostgREST cannot pick the
--    wrong overload; the client always sends all five keys.
-- ============================================================
drop function if exists public.request_purchase(text, numeric);

create or replace function public.request_purchase(
  p_plan text,
  p_amount numeric,
  p_email text default null,
  p_name text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan  public.subscription_plan;
  v_id    uuid;
  v_email text;
begin
  v_plan := p_plan::public.subscription_plan;
  v_email := nullif(trim(coalesce(p_email, '')), '');

  -- reject obviously malformed addresses instead of storing junk
  if v_email is not null and v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    v_email := null;
  end if;

  insert into public.subscriptions
    (plan, status, amount_paid, created_by, date_issued,
     buyer_email, buyer_name, buyer_phone, payment_verified)
  values
    (v_plan, 'pending', p_amount, 'public', now(),
     v_email,
     nullif(trim(coalesce(p_name, '')), ''),
     nullif(trim(coalesce(p_phone, '')), ''),
     false)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.request_purchase(text, numeric, text, text, text) from public;
grant execute on function public.request_purchase(text, numeric, text, text, text) to anon, authenticated;


-- ============================================================
-- 8. ROW LEVEL SECURITY — content is gated by entitlement
-- ============================================================
drop policy if exists "Anyone can view published chapters (preview content)" on public.chapters;
drop policy if exists "Licensed users can view full chapter content"     on public.chapters;
drop policy if exists "Admins can manage chapters"                        on public.chapters;
drop policy if exists "Anyone can view published books"                   on public.books;
drop policy if exists "Admins can manage books"                           on public.books;

-- preview rows are public; full rows require an active license
create policy "chapters_public_preview"
  on public.chapters for select
  using (status = 'published' and is_free_preview = true);

create policy "chapters_licensed_full"
  on public.chapters for select
  using (
    status = 'published'
    and not is_free_preview
    and public.has_active_subscription()
  );

create policy "chapters_admin_all"
  on public.chapters for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "books_public_published"
  on public.books for select
  using (status = 'published');

create policy "books_admin_all"
  on public.books for all
  using (public.is_admin())
  with check (public.is_admin());


-- A reader must be able to see THEIR OWN license row, otherwise the
-- dashboard cannot show what they paid for.
create or replace function public.owns_subscription(p_subscription_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.subscriptions s
    where s.id = p_subscription_id
      and (
        (auth.uid() is not null and s.user_id = auth.uid())
        or (
          auth.jwt() ->> 'email' is not null
          and lower(s.buyer_email) = lower(auth.jwt() ->> 'email')
        )
      )
  );
$$;

revoke all on function public.owns_subscription(uuid) from public;
grant execute on function public.owns_subscription(uuid) to anon, authenticated;

drop policy if exists "Users can view own subscription" on public.subscriptions;
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (public.owns_subscription(id));

drop policy if exists "Users can view own device activations" on public.device_activations;
create policy "Users can view own device activations"
  on public.device_activations for select
  using (public.owns_subscription(subscription_id));


-- ============================================================
-- 8b. ADMIN READ ACCESS — EMAIL BASED
--     The original policies checked `profiles.role`, which only
--     works if that row was seeded correctly. The admin panel is
--     gated by email (auth.jwt()->>'email'), so every table the
--     panel reads also gets an email-based SELECT policy.
--     These are additive: the role-based policies stay in place.
-- ============================================================
create policy "admin_email can view profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "admin_email can view licenses"
  on public.licenses for select
  using (public.is_admin());

create policy "admin_email can view redeem codes"
  on public.redeem_codes for select
  using (public.is_admin());

create policy "admin_email can view analytics events"
  on public.analytics_events for select
  using (public.is_admin());

create policy "admin_email can view newsletter subscribers"
  on public.newsletter_subscribers for select
  using (public.is_admin());

create policy "admin_email can view contact messages"
  on public.contact_messages for select
  using (public.is_admin());

create policy "admin_email can view support tickets"
  on public.support_tickets for select
  using (public.is_admin());

create policy "admin_email can view audit logs"
  on public.audit_logs for select
  using (public.is_admin());

create policy "admin_email can view reading progress"
  on public.reading_progress for select
  using (public.is_admin());

create policy "admin_email can view bookmarks"
  on public.bookmarks for select
  using (public.is_admin());


-- ============================================================
-- 9. STOP LEAKING MAINTENANCE FUNCTIONS TO THE PUBLIC
--    `expire_subscriptions()` only marks already-expired rows, but
--    it should never be callable by an anonymous visitor.
-- ============================================================
revoke all on function public.expire_subscriptions() from public;
revoke all on function public.expire_subscriptions() from anon, authenticated;


-- ============================================================
-- 10. CONTENT SEED
--     The book row only. Chapters are added from
--     /admin -> Content so the text can be edited without a
--     migration. Each chapter is TWO rows:
--       is_free_preview = true  -> public teaser
--       is_free_preview = false -> paid full text
-- ============================================================
insert into public.books
  (title, slug, subtitle, description, author, publisher, edition, status, chapters_count)
values
  ('Prompt Engineering Blueprint',
   'prompt-engineering-blueprint',
   'A comprehensive guide to mastering human-AI communication',
   'From first principles to production workflows — 26 chapters, 1000+ examples and a complete professional toolkit.',
   'Sudarshan Hadmode & Soham Takale',
   'Team Alum Publishing',
   'Foundation v0.4.0',
   'published',
   1)
on conflict (slug) do update
  set title        = excluded.title,
      subtitle     = excluded.subtitle,
      description  = excluded.description,
      author       = excluded.author,
      publisher    = excluded.publisher,
      edition      = excluded.edition,
      status       = excluded.status,
      updated_at   = now();
