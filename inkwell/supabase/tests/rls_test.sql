-- RLS / function smoke tests. Run against a scratch database that has the migration applied
-- (and, for plain Postgres, the Supabase stubs). Every check raises an exception on failure.
-- Usage: psql -v ON_ERROR_STOP=1 -d <db> -f supabase/tests/rls_test.sql
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'admin@example.com'),
  ('00000000-0000-0000-0000-0000000000a2', 'author@example.com'),
  ('00000000-0000-0000-0000-0000000000a3', 'reader@example.com');
update public.profiles set role = 'admin'  where id = '00000000-0000-0000-0000-0000000000a1';
update public.profiles set role = 'author' where id = '00000000-0000-0000-0000-0000000000a2';

insert into public.posts (author_id, title, slug, body, status, published_at, scheduled_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'Live post',      'live-post',      'hello world about gardening', 'published', now() - interval '1 day', null),
  ('00000000-0000-0000-0000-0000000000a1', 'Draft post',     'draft-post',     'secret', 'draft', null, null),
  ('00000000-0000-0000-0000-0000000000a1', 'Future post',    'future-post',    'later',  'scheduled', now() + interval '1 day', now() + interval '1 day'),
  ('00000000-0000-0000-0000-0000000000a1', 'Due scheduled',  'due-scheduled',  'now live', 'scheduled', now() - interval '1 minute', now() - interval '1 minute'),
  ('00000000-0000-0000-0000-0000000000a2', 'Author draft',   'author-draft',   'mine',   'draft', null, null);
insert into public.comments (post_id, author_name, author_email, body)
  select id, 'x', 'x@example.com', 'hi there' from public.posts where slug = 'live-post';
insert into public.contact_messages (name, email, subject, message) values ('a','a@example.com','s','hello there');
insert into public.subscribers (email, consent_text) values ('s@example.com', 'ok');

create or replace function pg_temp.assert(cond boolean, msg text) returns void language plpgsql as $$
begin if not coalesce(cond, false) then raise exception 'FAILED: %', msg; end if; end $$;
grant execute on function pg_temp.assert(boolean, text) to public;

-- ── anonymous visitor ───────────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select pg_temp.assert((select count(*) from public.posts) = 2, 'anon sees exactly the 2 live posts');
select pg_temp.assert(not exists (select 1 from public.posts where slug in ('draft-post','future-post','author-draft')), 'anon cannot see drafts or future-scheduled');
select pg_temp.assert((select count(*) from public.comments) = 0, 'anon cannot read comments');
select pg_temp.assert((select count(*) from public.contact_messages) = 0, 'anon cannot read contact messages');
select pg_temp.assert((select count(*) from public.subscribers) = 0, 'anon cannot read subscribers');
select pg_temp.assert((select count(*) from public.rate_limits) = 0, 'anon cannot read rate limits');
select pg_temp.assert((select count(*) from public.profiles) = 2, 'anon sees staff profiles only (not readers)');
select pg_temp.assert((select count(*) from public.search_posts('gardening', 10, 0)) = 1, 'search finds live post');
select pg_temp.assert((select count(*) from public.search_posts('secret', 10, 0)) = 0, 'search never finds drafts');
do $$ begin
  begin insert into public.posts (author_id, title, slug, body) values ('00000000-0000-0000-0000-0000000000a1','x','x','x');
        raise exception 'FAILED: anon insert post'; exception when insufficient_privilege or others then
        if sqlerrm like 'FAILED%' then raise; end if; end;
  begin perform public.check_rate_limit('k', 1, 60); raise exception 'FAILED: anon rate limit exec';
        exception when insufficient_privilege then null; end;
  begin perform public.record_post_view(gen_random_uuid()); raise exception 'FAILED: anon view exec';
        exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ── reader (no dashboard access) ────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a3', true);
select pg_temp.assert(public.is_staff() = false, 'reader is not staff');
select pg_temp.assert((select count(*) from public.posts) = 2, 'reader sees only live posts');
do $$ begin
  begin insert into public.posts (author_id, title, slug, body) values ('00000000-0000-0000-0000-0000000000a3','x','x','x');
        raise exception 'FAILED: reader insert post'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end;
end $$;
-- reader tries to promote themselves
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a3';
select pg_temp.assert((select role from public.profiles where id = '00000000-0000-0000-0000-0000000000a3') = 'reader', 'reader cannot self-promote');
reset role;

-- ── author ──────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
select pg_temp.assert(public.is_staff(), 'author is staff');
select pg_temp.assert((select count(*) from public.posts) = 3, 'author sees live posts + own draft');
update public.posts set title = 'hacked' where slug = 'live-post';
select pg_temp.assert((select title from public.posts where slug = 'live-post') = 'Live post', 'author cannot edit another author''s post');
update public.posts set title = 'Author draft v2' where slug = 'author-draft';
select pg_temp.assert((select title from public.posts where slug = 'author-draft') = 'Author draft v2', 'author edits own post');
delete from public.posts where slug = 'live-post';
select pg_temp.assert(exists (select 1 from public.posts where slug = 'live-post'), 'author cannot delete another author''s post');
do $$ begin
  begin insert into public.posts (author_id, title, slug, body) values ('00000000-0000-0000-0000-0000000000a1','spoof','spoof','x');
        raise exception 'FAILED: author spoofing author_id'; exception when others then if sqlerrm like 'FAILED%' then raise; end if; end;
  begin insert into public.categories (slug, name) values ('c','C'); raise exception 'FAILED: author created category';
        exception when others then if sqlerrm like 'FAILED%' then raise; end if; end;
end $$;
select pg_temp.assert((select count(*) from public.comments) = 0, 'author cannot read comments');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a2';
select pg_temp.assert((select role from public.profiles where id = '00000000-0000-0000-0000-0000000000a2') = 'author', 'author cannot self-promote');
reset role;

-- ── admin ───────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select pg_temp.assert((select count(*) from public.posts) = 5, 'admin sees all posts');
select pg_temp.assert((select count(*) from public.comments) = 1, 'admin reads comments');
select pg_temp.assert((select count(*) from public.contact_messages) = 1, 'admin reads messages');
select pg_temp.assert((select count(*) from public.subscribers) = 1, 'admin reads subscribers');
insert into public.categories (slug, name) values ('c','C');
update public.profiles set role = 'author' where id = '00000000-0000-0000-0000-0000000000a3';
select pg_temp.assert((select role from public.profiles where id = '00000000-0000-0000-0000-0000000000a3') = 'author', 'admin can change roles');
reset role;

-- ── service role functions ──────────────────────────────────────────
set local role service_role;
select pg_temp.assert(public.check_rate_limit('t1', 2, 60) and public.check_rate_limit('t1', 2, 60) and not public.check_rate_limit('t1', 2, 60), 'rate limiter blocks the 3rd call');
select public.record_post_view((select id from public.posts where slug = 'live-post'));
select public.record_post_view((select id from public.posts where slug = 'draft-post'));
select pg_temp.assert((select view_count from public.posts where slug = 'live-post') = 1, 'view counted for live post');
select pg_temp.assert((select view_count from public.posts where slug = 'draft-post') = 0, 'view NOT counted for draft');
reset role;


-- ── query helpers (0002) ────────────────────────────────────────────
insert into public.categories (id, slug, name) values ('00000000-0000-0000-0000-00000000c001','news','News') on conflict do nothing;
insert into public.post_categories (post_id, category_id)
  select id, '00000000-0000-0000-0000-00000000c001' from public.posts where slug in ('live-post','due-scheduled','draft-post');
set local role anon;
select pg_temp.assert((select count(*) from public.list_post_ids(null,null,null,10,0)) = 2, 'list_post_ids returns live posts only');
select pg_temp.assert((select count(*) from public.list_post_ids('00000000-0000-0000-0000-00000000c001',null,null,10,0)) = 2, 'category filter hides the draft');
select pg_temp.assert((select max(total) from public.list_post_ids(null,null,null,1,0)) = 2, 'total reflects all matches, not the page');
select pg_temp.assert((select post_count from public.category_counts() where category_id = '00000000-0000-0000-0000-00000000c001') = 2, 'category_counts ignores drafts');
select pg_temp.assert((select count(*) from public.related_post_ids((select id from public.posts where slug='live-post'), 5)) = 1, 'related excludes self and drafts');
do $$ begin
  begin perform * from public.views_by_day(7); raise exception 'FAILED: anon views_by_day';
        exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select pg_temp.assert((select total_posts from public.dashboard_stats()) = 5, 'admin dashboard counts every post');
select pg_temp.assert((select count(*) from public.views_by_day(7)) = 7, 'views_by_day returns one row per day');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
set local role authenticated;
select pg_temp.assert((select total_posts from public.dashboard_stats()) = 3, 'author dashboard counts live + own posts');
reset role;

select 'ALL RLS TESTS PASSED' as result;
rollback;
