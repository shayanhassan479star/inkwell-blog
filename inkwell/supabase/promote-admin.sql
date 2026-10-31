-- ════════════════════════════════════════════════════════════════════
-- Create your FIRST admin (one-time bootstrap, no hard-coded credentials)
--
-- 1. In the Supabase dashboard open Authentication → Users → "Add user"
--    (choose "Create new user", enter your e-mail + a strong password, tick
--    "Auto Confirm User"). Alternatively sign up via any flow you control.
-- 2. Replace the e-mail below with the address you just created.
-- 3. Run this script in the SQL editor.
--
-- Afterwards, admins can invite and promote other authors from /admin/users ("Authors & access").
-- ════════════════════════════════════════════════════════════════════

update public.profiles
   set role = 'admin',
       is_active = true,
       display_name = coalesce(nullif(display_name, ''), 'Site Owner')
 where id = (select id from auth.users where lower(email) = lower('ammarah7200@gmail.com'));

-- Verify: should return exactly one row with role = 'admin'.
select p.id, u.email, p.role, p.slug
  from public.profiles p
  join auth.users u on u.id = p.id
 where p.role = 'admin';
