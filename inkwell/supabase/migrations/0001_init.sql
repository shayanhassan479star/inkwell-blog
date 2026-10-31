-- ════════════════════════════════════════════════════════════════════
-- Inkwell — initial schema (PostgreSQL / Supabase)
-- Run once in the Supabase SQL editor, or with `supabase db push`.
--
-- Security model
--   • Row Level Security is ENABLED on every table.
--   • Anonymous visitors can read only published, already-live posts.
--   • Staff (role admin | author) manage content through their own session;
--     authors are limited to their own posts, admins can manage everything.
--   • Contact messages, comments, subscribers, views, rate limits and AI usage
--     are written ONLY by the server using the service-role key.
--   • New auth users get role 'reader' (no dashboard access) until an admin
--     promotes them — so an accidentally-open sign-up cannot grant access.
-- ════════════════════════════════════════════════════════════════════

-- ── Enums ───────────────────────────────────────────────────────────
create type public.user_role      as enum ('admin', 'author', 'reader');
create type public.post_status    as enum ('draft', 'scheduled', 'published');
create type public.comment_status as enum ('pending', 'approved', 'spam', 'rejected');
create type public.message_status as enum ('new', 'read', 'archived');

-- ── Helpers ─────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── Profiles (one row per auth user) ────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  slug          text not null unique,
  display_name  text not null check (char_length(display_name) between 1 and 80),
  bio           text check (bio is null or char_length(bio) <= 1000),
  avatar_url    text,
  website_url   text,
  role          public.user_role not null default 'reader',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint profiles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Role helpers (SECURITY DEFINER so policies can call them without recursion).
create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() = 'admin', false)
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_user_role() in ('admin', 'author'), false)
$$;

-- Create a profile automatically for every new auth user (role 'reader').
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base text;
begin
  base := regexp_replace(lower(split_part(coalesce(new.email, 'author'), '@', 1)), '[^a-z0-9]+', '-', 'g');
  base := trim(both '-' from base);
  if base = '' then base := 'author'; end if;

  insert into public.profiles (id, slug, display_name, role)
  values (
    new.id,
    base || '-' || substr(replace(new.id::text, '-', ''), 1, 6),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), initcap(replace(base, '-', ' '))),
    'reader'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Stop non-admins from changing their own role / active flag (privilege escalation guard).
-- The service role and SQL editor run with auth.uid() = null and are unaffected.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    new.id        := old.id;
    new.role      := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ── Taxonomy ────────────────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null check (char_length(name) between 1 and 60),
  description text check (description is null or char_length(description) <= 300),
  created_at  timestamptz not null default now(),
  constraint categories_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table public.tags (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null check (char_length(name) between 1 and 40),
  created_at timestamptz not null default now(),
  constraint tags_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

-- ── Posts ───────────────────────────────────────────────────────────
create table public.posts (
  id                    uuid primary key default gen_random_uuid(),
  author_id             uuid not null references public.profiles (id) on delete restrict,
  title                 text not null check (char_length(title) between 1 and 160),
  slug                  text not null unique,
  excerpt               text check (excerpt is null or char_length(excerpt) <= 320),
  body                  text not null default '',
  cover_image_url       text,
  cover_image_alt       text check (cover_image_alt is null or char_length(cover_image_alt) <= 200),
  status                public.post_status not null default 'draft',
  is_featured           boolean not null default false,
  -- Effective go-live time. For 'scheduled' posts it equals scheduled_at.
  -- A post is public when status in (published, scheduled) AND published_at <= now().
  published_at          timestamptz,
  scheduled_at          timestamptz,
  seo_title             text check (seo_title is null or char_length(seo_title) <= 70),
  meta_description      text check (meta_description is null or char_length(meta_description) <= 170),
  canonical_url         text,
  reading_time_minutes  integer not null default 1 check (reading_time_minutes >= 1),
  view_count            bigint not null default 0,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  search_vector         tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')),   'A') ||
    setweight(to_tsvector('english', coalesce(excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(body, '')),    'C')
  ) stored,
  constraint posts_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint posts_live_needs_date check (status = 'draft' or published_at is not null),
  constraint posts_scheduled_needs_date check (status <> 'scheduled' or scheduled_at is not null)
);

-- Bump updated_at only when content columns change (not when view_count increments).
create trigger posts_updated_at
  before update of title, slug, excerpt, body, cover_image_url, cover_image_alt, status,
                   is_featured, published_at, scheduled_at, seo_title, meta_description,
                   canonical_url, author_id
  on public.posts
  for each row execute function public.set_updated_at();

create table public.post_categories (
  post_id     uuid not null references public.posts (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  position    smallint not null default 0,   -- 0 = primary category
  primary key (post_id, category_id)
);

create table public.post_tags (
  post_id uuid not null references public.posts (id) on delete cascade,
  tag_id  uuid not null references public.tags (id) on delete cascade,
  primary key (post_id, tag_id)
);

-- Replace a post's categories and tags atomically (SECURITY INVOKER: RLS still applies).
create or replace function public.set_post_relations(
  p_post_id uuid, p_category_ids uuid[], p_tag_ids uuid[]
) returns void language plpgsql security invoker set search_path = public as $$
begin
  delete from public.post_categories where post_id = p_post_id;
  insert into public.post_categories (post_id, category_id, position)
  select p_post_id, c.id, (u.ord - 1)::smallint
  from unnest(coalesce(p_category_ids, '{}')) with ordinality as u(id, ord)
  join public.categories c on c.id = u.id;

  delete from public.post_tags where post_id = p_post_id;
  insert into public.post_tags (post_id, tag_id)
  select p_post_id, t.id
  from unnest(coalesce(p_tag_ids, '{}')) as u(id)
  join public.tags t on t.id = u.id
  on conflict do nothing;
end;
$$;

-- ── Reader interactions ─────────────────────────────────────────────
create table public.comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.posts (id) on delete cascade,
  author_name  text not null check (char_length(author_name) between 1 and 80),
  author_email text not null check (char_length(author_email) <= 254),
  body         text not null check (char_length(body) between 2 and 2000),
  status       public.comment_status not null default 'pending',
  ip_hash      text,
  created_at   timestamptz not null default now()
);

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 100),
  email      text not null check (char_length(email) <= 254),
  subject    text not null check (char_length(subject) between 1 and 150),
  message    text not null check (char_length(message) between 5 and 5000),
  status     public.message_status not null default 'new',
  ip_hash    text,
  created_at timestamptz not null default now()
);

create table public.subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             text not null check (char_length(email) <= 254),
  consent_at        timestamptz not null default now(),
  consent_text      text not null,
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  unsubscribed_at   timestamptz,
  ip_hash           text,
  created_at        timestamptz not null default now()
);
create unique index subscribers_email_unique on public.subscribers (lower(email));

-- ── Analytics, rate limiting, AI usage ──────────────────────────────
create table public.post_views (
  id        bigint generated always as identity primary key,
  post_id   uuid not null references public.posts (id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create table public.rate_limits (
  key          text primary key,
  window_start timestamptz not null default now(),
  count        integer not null default 0
);

create table public.ai_usage (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  tool         text not null,
  provider     text not null,
  model        text not null,
  input_chars  integer not null default 0,
  output_chars integer not null default 0,
  status       text not null check (status in ('ok', 'error')),
  created_at   timestamptz not null default now()
);

-- ── Indexes ─────────────────────────────────────────────────────────
create index posts_status_published_idx   on public.posts (status, published_at desc);
create index posts_author_idx             on public.posts (author_id);
create index posts_featured_idx           on public.posts (published_at desc) where is_featured;
create index posts_popular_idx            on public.posts (view_count desc);
create index posts_search_idx             on public.posts using gin (search_vector);
create index post_categories_category_idx on public.post_categories (category_id);
create index post_tags_tag_idx            on public.post_tags (tag_id);
create index comments_post_status_idx     on public.comments (post_id, status, created_at desc);
create index comments_status_idx          on public.comments (status, created_at desc);
create index contact_messages_created_idx on public.contact_messages (created_at desc);
create index post_views_post_time_idx     on public.post_views (post_id, viewed_at desc);
create index post_views_time_idx          on public.post_views (viewed_at desc);
create index ai_usage_user_time_idx       on public.ai_usage (user_id, created_at desc);

-- ── Server-only functions (service role) ────────────────────────────
-- Fixed-window rate limiter usable from serverless functions. Returns true when allowed.
create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update set
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds)
                        then now() else r.window_start end,
    count        = case when r.window_start < now() - make_interval(secs => p_window_seconds)
                        then 1 else r.count + 1 end
  returning r.count into v_count;

  -- Opportunistic cleanup of stale keys.
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_count <= p_limit;
end;
$$;

-- Count a view only for posts that are actually public.
create or replace function public.record_post_view(p_post_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if exists (
    select 1 from public.posts
    where id = p_post_id and status in ('published', 'scheduled') and published_at <= now()
  ) then
    insert into public.post_views (post_id) values (p_post_id);
    update public.posts set view_count = view_count + 1 where id = p_post_id;
  end if;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.record_post_view(uuid)                   from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
grant execute on function public.record_post_view(uuid)                   to service_role;

-- Ranked full-text search (SECURITY INVOKER → RLS limits results to public posts for visitors).
create or replace function public.search_posts(q text, page_limit integer, page_offset integer)
returns table (id uuid, rank real, total bigint)
language sql stable security invoker set search_path = public as $$
  with matches as (
    select p.id,
           ts_rank_cd(p.search_vector, websearch_to_tsquery('english', q)) as rank
    from public.posts p
    where p.search_vector @@ websearch_to_tsquery('english', q)
      and p.status in ('published', 'scheduled')
      and p.published_at <= now()
  )
  select m.id, m.rank, count(*) over () as total
  from matches m
  order by m.rank desc, m.id
  limit page_limit offset page_offset
$$;

-- ── Row Level Security ──────────────────────────────────────────────
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.tags             enable row level security;
alter table public.posts            enable row level security;
alter table public.post_categories  enable row level security;
alter table public.post_tags        enable row level security;
alter table public.comments         enable row level security;
alter table public.contact_messages enable row level security;
alter table public.subscribers      enable row level security;
alter table public.post_views       enable row level security;
alter table public.rate_limits      enable row level security;
alter table public.ai_usage         enable row level security;

-- Profiles: public sees active staff only; users see themselves; admins see all.
create policy profiles_read on public.profiles for select
  using (id = auth.uid() or public.is_admin() or (is_active and role in ('admin', 'author')));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Categories: public read; admins write.
create policy categories_read  on public.categories for select using (true);
create policy categories_write on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Tags: public read; any staff member can create; admins edit/delete.
create policy tags_read   on public.tags for select using (true);
create policy tags_insert on public.tags for insert to authenticated with check (public.is_staff());
create policy tags_update on public.tags for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy tags_delete on public.tags for delete to authenticated using (public.is_admin());

-- Posts
create policy posts_public_read on public.posts for select
  using (status in ('published', 'scheduled') and published_at is not null and published_at <= now());
create policy posts_staff_read on public.posts for select to authenticated
  using (public.is_staff() and (public.is_admin() or author_id = auth.uid()));
create policy posts_staff_insert on public.posts for insert to authenticated
  with check (public.is_staff() and (public.is_admin() or author_id = auth.uid()));
create policy posts_staff_update on public.posts for update to authenticated
  using (public.is_staff() and (public.is_admin() or author_id = auth.uid()))
  with check (public.is_staff() and (public.is_admin() or author_id = auth.uid()));
create policy posts_staff_delete on public.posts for delete to authenticated
  using (public.is_staff() and (public.is_admin() or author_id = auth.uid()));

-- Join tables inherit post visibility via the (RLS-filtered) subquery on posts.
create policy post_categories_read on public.post_categories for select
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy post_categories_write on public.post_categories for all to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and public.is_staff()
                 and (public.is_admin() or p.author_id = auth.uid())))
  with check (exists (select 1 from public.posts p where p.id = post_id and public.is_staff()
                 and (public.is_admin() or p.author_id = auth.uid())));

create policy post_tags_read on public.post_tags for select
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy post_tags_write on public.post_tags for all to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and public.is_staff()
                 and (public.is_admin() or p.author_id = auth.uid())))
  with check (exists (select 1 from public.posts p where p.id = post_id and public.is_staff()
                 and (public.is_admin() or p.author_id = auth.uid())));

-- Comments / contact / subscribers: inserts happen server-side (service role bypasses RLS).
-- Only admins can read or moderate them through a user session. No public access at all,
-- so e-mail addresses can never leak through the public API key.
create policy comments_admin_all on public.comments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy contact_admin_all on public.contact_messages for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy subscribers_admin_all on public.subscribers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Views: admins can read aggregate events; writes go through record_post_view().
create policy post_views_admin_read on public.post_views for select to authenticated
  using (public.is_admin());

-- AI usage: each staff member can see their own usage; admins see everything.
create policy ai_usage_read on public.ai_usage for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- rate_limits: no policies → inaccessible except to the service role.

-- ── Storage (cover & inline images) ─────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public buckets serve files by URL without a SELECT policy, so listing stays disabled.
create policy covers_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'covers' and public.is_staff());
create policy covers_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'covers' and (public.is_admin() or owner = auth.uid()));
create policy covers_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'covers' and (public.is_admin() or owner = auth.uid()));
