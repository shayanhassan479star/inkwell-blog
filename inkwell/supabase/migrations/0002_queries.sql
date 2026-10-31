-- ════════════════════════════════════════════════════════════════════
-- Inkwell — query helpers used by the application (listing, related posts,
-- taxonomy counts, dashboard statistics).
-- All functions are SECURITY INVOKER unless stated, so Row Level Security
-- keeps drafts and scheduled posts hidden from visitors.
-- ════════════════════════════════════════════════════════════════════

-- Paginated ids of live posts, optionally filtered by category / tag / author.
create or replace function public.list_post_ids(
  p_category uuid default null,
  p_tag      uuid default null,
  p_author   uuid default null,
  p_limit    integer default 9,
  p_offset   integer default 0
) returns table (id uuid, total bigint)
language sql stable security invoker set search_path = public as $$
  select p.id, count(*) over () as total
  from public.posts p
  where p.status in ('published', 'scheduled')
    and p.published_at <= now()
    and (p_category is null or exists (select 1 from public.post_categories pc where pc.post_id = p.id and pc.category_id = p_category))
    and (p_tag      is null or exists (select 1 from public.post_tags pt       where pt.post_id = p.id and pt.tag_id = p_tag))
    and (p_author   is null or p.author_id = p_author)
  order by p.published_at desc, p.id
  limit greatest(p_limit, 1) offset greatest(p_offset, 0)
$$;

-- Related posts: ranked by shared tags (weight 2) and shared categories (weight 3).
create or replace function public.related_post_ids(p_post uuid, p_limit integer default 3)
returns table (id uuid, score integer)
language sql stable security invoker set search_path = public as $$
  select p.id,
         (3 * (select count(*) from public.post_categories a
               join public.post_categories b on b.category_id = a.category_id
               where a.post_id = p_post and b.post_id = p.id)
        + 2 * (select count(*) from public.post_tags a
               join public.post_tags b on b.tag_id = a.tag_id
               where a.post_id = p_post and b.post_id = p.id))::integer as score
  from public.posts p
  where p.id <> p_post
    and p.status in ('published', 'scheduled')
    and p.published_at <= now()
  order by score desc, p.published_at desc
  limit greatest(p_limit, 1)
$$;

create or replace function public.category_counts()
returns table (category_id uuid, post_count bigint)
language sql stable security invoker set search_path = public as $$
  select pc.category_id, count(*)
  from public.post_categories pc
  join public.posts p on p.id = pc.post_id
  where p.status in ('published', 'scheduled') and p.published_at <= now()
  group by pc.category_id
$$;

create or replace function public.tag_counts()
returns table (tag_id uuid, post_count bigint)
language sql stable security invoker set search_path = public as $$
  select pt.tag_id, count(*)
  from public.post_tags pt
  join public.posts p on p.id = pt.post_id
  where p.status in ('published', 'scheduled') and p.published_at <= now()
  group by pt.tag_id
$$;

-- Dashboard numbers. Under RLS admins count everything; authors count their own posts.
create or replace function public.dashboard_stats()
returns table (
  total_posts bigint, published_posts bigint, draft_posts bigint, scheduled_posts bigint,
  total_views bigint, pending_comments bigint, new_messages bigint, subscribers bigint
)
language sql stable security invoker set search_path = public as $$
  select
    (select count(*) from public.posts),
    (select count(*) from public.posts where status in ('published','scheduled') and published_at <= now()),
    (select count(*) from public.posts where status = 'draft'),
    (select count(*) from public.posts where status = 'scheduled' and published_at > now()),
    (select coalesce(sum(view_count), 0)::bigint from public.posts),
    (select count(*) from public.comments where status = 'pending'),
    (select count(*) from public.contact_messages where status = 'new'),
    (select count(*) from public.subscribers where unsubscribed_at is null)
$$;

-- Daily view counts for the last N days. SECURITY DEFINER because post_views is admin-only;
-- the function itself restricts non-admin staff to views of their own posts.
create or replace function public.views_by_day(p_days integer default 14)
returns table (day date, views bigint)
language plpgsql stable security definer set search_path = public as $$
declare
  v_days integer := least(greatest(p_days, 1), 90);
begin
  if not public.is_staff() then
    raise exception 'not authorised' using errcode = '42501';
  end if;
  return query
    select d::date, coalesce(count(v.id), 0)
    from generate_series(current_date - (v_days - 1), current_date, interval '1 day') as d
    left join public.post_views v
      on v.viewed_at >= d and v.viewed_at < d + interval '1 day'
     and (public.is_admin() or exists (
            select 1 from public.posts p where p.id = v.post_id and p.author_id = auth.uid()))
    group by d
    order by d;
end;
$$;

revoke all on function public.views_by_day(integer) from public, anon;
grant execute on function public.views_by_day(integer) to authenticated, service_role;
