-- The handle_new_user trigger only covers sign-ups after the init migration.
-- Give accounts that already existed in auth.users a (non-admin) profile too.
insert into public.profiles (id, email)
select id, email from auth.users where email is not null
on conflict (id) do nothing;
