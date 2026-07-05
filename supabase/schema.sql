-- ============================================================
-- Team Alum Bookstore — Database Schema
-- Target: Supabase (PostgreSQL)
-- ============================================================

-- 0. EXTENSIONS
create extension if not exists "pg_crypto" with schema "extensions";
create extension if not exists "pg_net" with schema "extensions";

-- 1. ENUMS
create type user_role as enum ('user', 'admin', 'super_admin');
create type license_plan as enum ('1M', '3M', 'LT');
create type license_status as enum ('active', 'expired', 'revoked', 'pending');
create type redeem_code_status as enum ('available', 'assigned', 'used', 'revoked');
create type chapter_status as enum ('draft', 'published', 'archived');
create type book_status as enum ('draft', 'published', 'archived');
create type ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type ticket_priority as enum ('low', 'medium', 'high', 'urgent');

-- ============================================================
-- TABLES
-- ============================================================

-- 2. PROFILES (extends auth.users)
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  phone       text,
  role        user_role not null default 'user',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 3. BOOKS
create table public.books (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  slug           text not null unique,
  subtitle       text,
  description    text,
  cover_url      text,
  author         text,
  publisher       text,
  edition        text,
  version        text,
  isbn           text,
  chapters_count integer not null default 0,
  status         book_status not null default 'draft',
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.books enable row level security;

-- 4. CHAPTERS
create table public.chapters (
  id                uuid primary key default gen_random_uuid(),
  book_id           uuid not null references public.books(id) on delete cascade,
  title             text not null,
  slug              text not null,
  chapter_number    integer not null,
  content           text,
  preview_content   text,
  is_premium        boolean not null default true,
  is_free_preview   boolean not null default false,
  word_count        integer,
  estimated_minutes integer,
  status            chapter_status not null default 'draft',
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(book_id, slug),
  unique(book_id, chapter_number)
);

alter table public.chapters enable row level security;

-- 5. LICENSES
create table public.licenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  code          text not null unique,
  plan          license_plan not null,
  status        license_status not null default 'pending',
  purchased_at  timestamptz,
  activated_at  timestamptz,
  expires_at    timestamptz,
  revoked_at    timestamptz,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.licenses enable row level security;

-- 6. REDEEM CODES
create table public.redeem_codes (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  plan          license_plan not null,
  status        redeem_code_status not null default 'available',
  assigned_to   uuid references public.profiles(id),
  used_by       uuid references public.profiles(id),
  used_at       timestamptz,
  expires_at    timestamptz,
  created_by    uuid references public.profiles(id),
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.redeem_codes enable row level security;

-- 7. READING PROGRESS
create table public.reading_progress (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  book_id           uuid not null references public.books(id) on delete cascade,
  chapter_id        uuid not null references public.chapters(id) on delete cascade,
  progress          real not null default 0,
  last_position     text,
  completed         boolean not null default false,
  time_spent_seconds integer not null default 0,
  updated_at        timestamptz not null default now(),
  unique(user_id, book_id, chapter_id)
);

alter table public.reading_progress enable row level security;

-- 8. BOOKMARKS
create table public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  book_id     uuid not null references public.books(id) on delete cascade,
  chapter_id  uuid not null references public.chapters(id) on delete cascade,
  position    text,
  note        text,
  color       text,
  created_at  timestamptz not null default now()
);

alter table public.bookmarks enable row level security;

-- 9. NEWSLETTER
create table public.newsletter_subscribers (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  name            text,
  subscribed      boolean not null default true,
  subscribed_at   timestamptz not null default now(),
  unsubscribed_at timestamptz
);

alter table public.newsletter_subscribers enable row level security;

-- 10. CONTACT MESSAGES
create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  subject    text not null,
  message    text not null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- 11. SUPPORT TICKETS
create table public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id),
  subject     text not null,
  description text not null,
  status      ticket_status not null default 'open',
  priority    ticket_priority not null default 'medium',
  assigned_to uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

-- 12. AUDIT LOGS
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id),
  action      text not null,
  resource    text not null,
  resource_id text,
  details     jsonb,
  ip_address  text,
  created_at  timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

-- 13. ANALYTICS EVENTS
create table public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  event_name  text not null,
  user_id     uuid references public.profiles(id),
  session_id  text,
  properties  jsonb,
  page_url    text,
  created_at  timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

-- 14. RELEASE NOTES
create table public.release_notes (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  version       text not null,
  content       text not null,
  is_published  boolean not null default false,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.release_notes enable row level security;

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_profiles_email on public.profiles(email);
create index idx_profiles_role on public.profiles(role);
create index idx_books_slug on public.books(slug);
create index idx_books_status on public.books(status);
create index idx_chapters_book on public.chapters(book_id);
create index idx_chapters_number on public.chapters(book_id, chapter_number);
create index idx_licenses_user on public.licenses(user_id);
create index idx_licenses_code on public.licenses(code);
create index idx_licenses_status on public.licenses(status);
create index idx_licenses_expiry on public.licenses(expires_at);
create index idx_redeem_codes_code on public.redeem_codes(code);
create index idx_redeem_codes_status on public.redeem_codes(status);
create index idx_reading_progress_user on public.reading_progress(user_id);
create index idx_reading_progress_book on public.reading_progress(user_id, book_id);
create index idx_bookmarks_user on public.bookmarks(user_id);
create index idx_audit_logs_user on public.audit_logs(user_id);
create index idx_audit_logs_action on public.audit_logs(action);
create index idx_analytics_event on public.analytics_events(event_name);
create index idx_analytics_created on public.analytics_events(created_at);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- PROFILES
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  ));

create policy "Admins can update all profiles"
  on public.profiles for update
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  ));

-- BOOKS
create policy "Anyone can view published books"
  on public.books for select
  using (status = 'published');

create policy "Admins can manage books"
  on public.books for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  ));

-- CHAPTERS
create policy "Anyone can view published chapters (preview content)"
  on public.chapters for select
  using (status = 'published');

create policy "Licensed users can view full chapter content"
  on public.chapters for select
  using (
    status = 'published'
    and (
      is_free_preview = true
      or exists (
        select 1 from public.licenses
        where user_id = auth.uid()
          and status = 'active'
          and (expires_at is null or expires_at > now())
      )
    )
  );

create policy "Admins can manage chapters"
  on public.chapters for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  ));

-- LICENSES
create policy "Users can view own licenses"
  on public.licenses for select
  using (user_id = auth.uid());

create policy "Admins can manage licenses"
  on public.licenses for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  ));

-- REDEEM CODES
create policy "Users can redeem codes"
  on public.redeem_codes for select
  using (status = 'available');

create policy "Admins can manage redeem codes"
  on public.redeem_codes for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  ));

-- READING PROGRESS
create policy "Users can manage own reading progress"
  on public.reading_progress for all
  using (user_id = auth.uid());

-- BOOKMARKS
create policy "Users can manage own bookmarks"
  on public.bookmarks for all
  using (user_id = auth.uid());

-- NEWSLETTER
create policy "Anyone can subscribe"
  on public.newsletter_subscribers for insert
  with check (true);

create policy "Admins can manage subscribers"
  on public.newsletter_subscribers for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  ));

-- CONTACT MESSAGES
create policy "Anyone can submit contact messages"
  on public.contact_messages for insert
  with check (true);

create policy "Admins can manage messages"
  on public.contact_messages for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  ));

-- SUPPORT TICKETS
create policy "Users can view own tickets"
  on public.support_tickets for select
  using (user_id = auth.uid());

create policy "Users can create tickets"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

create policy "Admins can manage tickets"
  on public.support_tickets for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  ));

-- AUDIT LOGS
create policy "Admins can view audit logs"
  on public.audit_logs for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  ));

-- ANALYTICS
create policy "Admins can view analytics"
  on public.analytics_events for select
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  ));

create policy "Anyone can insert analytics events"
  on public.analytics_events for insert
  with check (true);

-- RELEASE NOTES
create policy "Anyone can view published release notes"
  on public.release_notes for select
  using (is_published = true);

create policy "Admins can manage release notes"
  on public.release_notes for all
  using (exists (
    select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')
  ));

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- LICENSE EXPIRY FUNCTION (call via cron or manually)
-- ============================================================
create or replace function public.expire_licenses()
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  expired_count integer;
begin
  update public.licenses
  set status = 'expired', updated_at = now()
  where status = 'active'
    and expires_at is not null
    and expires_at <= now();
  get diagnostics expired_count = row_count;
  return expired_count;
end;
$$;
