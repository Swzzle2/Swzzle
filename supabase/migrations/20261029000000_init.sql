-- Swzzle V2: catalog, admin role, public views, storage.

create extension if not exists pgcrypto with schema extensions;

create type public.product_line   as enum ('industrial', 'consumer', 'both');
create type public.product_status as enum ('draft', 'live', 'discontinued');

-- ---------- admins ----------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- ---------- catalog ----------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order int  not null default 0
);

create table public.products (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  swzzle_name        text not null,
  tagline            text,
  description        text,
  category_id        uuid references public.categories (id) on delete set null,
  line               public.product_line   not null default 'industrial',
  status             public.product_status not null default 'draft',
  legal_copy         text,
  hazard_pictograms  text[] not null default '{}'
    check (hazard_pictograms <@ array['GHS01','GHS02','GHS03','GHS04','GHS05','GHS06','GHS07','GHS08','GHS09']),
  athea_product_name text,   -- INTERNAL ONLY
  athea_part_number  text,   -- INTERNAL ONLY
  sds_path           text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on public.products (status, line);
create index on public.products (category_id);

create table public.product_variants (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  size_label     text not null,
  sku            text not null unique,
  mro_price      numeric(10,2) check (mro_price >= 0),
  consumer_price numeric(10,2) check (consumer_price >= 0),
  snap_code      text not null unique,
  sort_order     int  not null default 0
);
create index on public.product_variants (product_id);

create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt          text not null default '',
  sort_order   int  not null default 0
);
create index on public.product_images (product_id);

-- ---------- triggers ----------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create function public.generate_snap_code() returns text
language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  b bytea := extensions.gen_random_bytes(7);
  code text := '';
begin
  for i in 0..6 loop
    code := code || substr(alphabet, get_byte(b, i) % 31 + 1, 1);
  end loop;
  return code;
end $$;

create function public.set_snap_code() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.snap_code := old.snap_code;          -- printed labels never break
  else
    loop
      new.snap_code := public.generate_snap_code();
      exit when not exists (select 1 from public.product_variants where snap_code = new.snap_code);
    end loop;
  end if;
  return new;
end $$;

create trigger variants_snap_code before insert or update on public.product_variants
  for each row execute function public.set_snap_code();

-- ---------- RLS: base tables are admin-only ----------
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images   enable row level security;

revoke all on public.profiles, public.products, public.product_variants, public.product_images from anon;

create policy "own profile or admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "admin updates profiles" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "anyone reads categories" on public.categories for select using (true);
create policy "admin writes categories" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin all" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin all" on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- public surface: views with no Athea columns, live only ----------
-- These run with the owner's rights on purpose: the view is the access rule.
create view public.public_products with (security_barrier) as
  select p.id, p.slug, p.swzzle_name, p.tagline, p.description, p.line,
         p.category_id, c.name as category_name, c.slug as category_slug,
         p.legal_copy, p.hazard_pictograms, p.sds_path, p.updated_at
  from public.products p
  left join public.categories c on c.id = p.category_id
  where p.status = 'live';

create view public.public_product_variants with (security_barrier) as
  select v.id, v.product_id, v.size_label, v.sku, v.snap_code, v.sort_order,
         case when p.line in ('industrial','both') then v.mro_price end      as mro_price,
         case when p.line in ('consumer','both')   then v.consumer_price end as consumer_price
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where p.status = 'live';

create view public.public_product_images with (security_barrier) as
  select i.id, i.product_id, i.storage_path, i.alt, i.sort_order
  from public.product_images i
  join public.products p on p.id = i.product_id
  where p.status = 'live';

revoke all on public.public_products, public.public_product_variants, public.public_product_images
  from anon, authenticated;
grant select on public.public_products, public.public_product_variants, public.public_product_images
  to anon, authenticated;

-- ---------- storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-images', 'product-images', true, 10485760,
     array['image/jpeg','image/png','image/webp','image/avif']),
  ('sds', 'sds', true, 26214400, array['application/pdf'])
on conflict (id) do nothing;

create policy "admin reads catalog files" on storage.objects for select to authenticated
  using (bucket_id in ('product-images','sds') and public.is_admin());
create policy "admin uploads catalog files" on storage.objects for insert to authenticated
  with check (bucket_id in ('product-images','sds') and public.is_admin());
create policy "admin updates catalog files" on storage.objects for update to authenticated
  using (bucket_id in ('product-images','sds') and public.is_admin());
create policy "admin deletes catalog files" on storage.objects for delete to authenticated
  using (bucket_id in ('product-images','sds') and public.is_admin());
