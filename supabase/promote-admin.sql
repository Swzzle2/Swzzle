-- Promote a signed-up user to admin. Paste into Supabase > SQL Editor,
-- change the email, run. Or use: npm run admin:promote -- you@example.com
update public.profiles
set is_admin = true
where lower(email) = lower('hello@swzzle.com');

select id, email, is_admin from public.profiles where is_admin;
