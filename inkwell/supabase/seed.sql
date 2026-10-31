-- ════════════════════════════════════════════════════════════════════
-- Optional starter content. Safe to run more than once.
-- Run AFTER creating and promoting your first admin (see README).
-- ════════════════════════════════════════════════════════════════════

insert into public.categories (slug, name, description) values
  ('craft',      'Craft',      'On the practice of writing: habits, structure and revision.'),
  ('ideas',      'Ideas',      'Essays and observations worth chewing on.'),
  ('tools',      'Tools',      'Software, workflows and gear that earn their keep.'),
  ('field-notes','Field Notes','Short dispatches from research and everyday life.')
on conflict (slug) do nothing;

insert into public.tags (slug, name) values
  ('writing', 'Writing'), ('productivity', 'Productivity'), ('research', 'Research'), ('seo', 'SEO')
on conflict (slug) do nothing;

-- A welcome article, created only if an admin exists.
do $$
declare
  v_author uuid;
  v_post   uuid;
begin
  select id into v_author from public.profiles where role = 'admin' order by created_at limit 1;
  if v_author is null then
    raise notice 'No admin profile yet — skipping sample article. Promote an admin, then re-run this file.';
    return;
  end if;

  if exists (select 1 from public.posts where slug = 'welcome-to-your-new-blog') then
    return;
  end if;

  insert into public.posts (
    author_id, title, slug, excerpt, body, status, is_featured, published_at,
    meta_description, reading_time_minutes
  ) values (
    v_author,
    'Welcome to your new blog',
    'welcome-to-your-new-blog',
    'A short tour of what you can do from the dashboard — and how to replace this sample article with your own writing.',
    E'## Start here\n\nThis is a sample article so the homepage is not empty. Sign in at `/admin`, open **Posts**, and edit or delete it.\n\n## What you can do\n\n- Write in **Markdown** with headings, lists, quotes, links, images and code blocks.\n- Save drafts, schedule publication, or publish immediately.\n- Use the **AI Studio** to brainstorm topics, outline, draft, rewrite and optimise for search — you always review and edit before anything goes live.\n\n## A small code sample\n\n```ts\nconst greeting = "Hello, readers";\nconsole.log(greeting);\n```\n\n> Good writing is rewriting. Take the first draft as raw material.\n\n## Next steps\n\n1. Update your author profile.\n2. Create your categories.\n3. Publish your first real article.\n',
    'published', true, now(),
    'A quick tour of the dashboard, the editor and the AI tools in your new blog.', 1
  ) returning id into v_post;

  insert into public.post_categories (post_id, category_id, position)
  select v_post, id, 0 from public.categories where slug = 'field-notes';

  insert into public.post_tags (post_id, tag_id)
  select v_post, id from public.tags where slug in ('writing', 'productivity');
end $$;
