# Swzzle V2

Storefront framework and product admin for swzzle.com. Private-label industrial cleaning chemicals (made by Athea Laboratories, sold under the Swzzle name) plus a consumer line.

**Stack:** Next.js 16 (App Router, TypeScript, Tailwind v4) on Vercel, with Supabase for Postgres, Auth and Storage. The runtime dependencies are `@supabase/supabase-js`, `@supabase/ssr`, `qrcode` and `papaparse`.

---

## Run locally

1. **Node 20.9 or newer.** Then run `npm install`.
2. **Fill in `.env.local`.** It's gitignored. `.env.example` lists every variable:

   | Variable | Where it comes from | Used by |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Project Settings > API | everything |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page, anon / publishable key | everything |
   | `SUPABASE_SERVICE_ROLE_KEY` | same page, service_role key | `npm run admin:promote` only |
   | `SUPABASE_DB_URL` | Supabase > Connect > Session pooler URI, with your DB password | `npm run db:push` only |
   | `NEXT_PUBLIC_SITE_URL` | optional, defaults to `https://swzzle.com` | URL encoded in Snap QR codes |

   If your DB password has special characters, percent-encode them in `SUPABASE_DB_URL` (for example `@` becomes `%40`).
3. **Create the schema and seed data:** `npm run db:push`. This applies `supabase/migrations/*` and `supabase/seed.sql`, and it's safe to run again. Add `-- --dry-run` to preview first.
4. **Start the app:** `npm run dev`, then open http://localhost:3000.

Other scripts:
- `npm run build`: production build
- `npm run lint`
- `npm run typecheck`: run `npx next typegen` first if `PageProps` types are missing

### Supabase dashboard settings (one time)

Go to **Authentication > URL Configuration**:
- Set Site URL to `https://swzzle.com`.
- Add these Redirect URLs: `http://localhost:3000/auth/callback` and `https://swzzle.com/auth/callback`.

**Email confirmations:**
- If they're on (the Supabase default), sign-up sends a link that lands on `/auth/callback` and signs you in.
- If they're off, sign-up signs you in immediately.

### Vercel

Set the same variables in the Vercel project, all except `SUPABASE_DB_URL`. Vercel needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `SUPABASE_SERVICE_ROLE_KEY` isn't used by the deployed app, so leave it out of Vercel unless something later needs it.

Before the first push, check that the project's Framework Preset is **Next.js**. It may still be set from an earlier Astro build.

---

## Admin access

**How admin is decided:** a `public.profiles` row is created for every user by a trigger on `auth.users`. It has an `is_admin` boolean that defaults to `false`.
- The Postgres function `public.is_admin()` reads it, and every write policy uses that function.
- Users can't change their own flag, because no RLS policy lets a non-admin update profiles.

I chose a table over Supabase `app_metadata` for three reasons:
- It takes effect immediately, without waiting for a token refresh.
- It's easy to see and change in SQL.
- It leaves room for customer profiles later.

**Promote your account:**
1. Sign up at `/signup`.
2. Then do one of these:
   - Run `npm run admin:promote -- you@example.com` (needs `SUPABASE_SERVICE_ROLE_KEY`).
   - Or paste `supabase/promote-admin.sql` into the Supabase SQL Editor, change the email and run it.
3. Sign in at `/login`. You'll land on `/admin/products`.

**How `/admin` is protected (three layers):**
1. `src/proxy.ts` (Next 16's replacement for `middleware.ts`) refreshes the session and redirects anyone who isn't an admin to `/login`.
2. The admin layout checks again on the server.
3. RLS refuses every write and every base-table read for non-admins, so even a bug in the first two layers can't expose data.

---

## Data model

The full schema is in `supabase/migrations/20261029000000_init.sql`.

| Table | Notes |
|---|---|
| `categories` | name, slug, sort_order. Anyone can read; only admins write. |
| `products` | `slug` is unique and drives `/products/[slug]`. `line` is industrial / consumer / both. `status` is draft / live / discontinued. `hazard_pictograms` holds GHS codes `GHS01` to `GHS09`. `athea_product_name` and `athea_part_number` are **internal only**. `sds_path` is the object path in the `sds` bucket. |
| `product_variants` | `sku` is unique. `mro_price` and `consumer_price` can each be empty. `snap_code` is auto-generated. |
| `product_images` | storage_path in the `product-images` bucket, alt, sort_order. The first image is the main one. |
| `profiles` | `is_admin`; see above. |

### Keeping Athea data private

`anon` has no privileges at all on `products`, `product_variants`, `product_images` or `profiles`. The public site reads only these three views:
- `public_products`
- `public_product_variants`
- `public_product_images`

Those views:
- don't contain the Athea columns,
- return live products only,
- blank out the price for the other line. For example, a consumer-only product's `mro_price` reads as null.

The views run with their owner's rights on purpose, because the view is the access rule. Supabase's security checker will flag them as "security definer views", and that's expected.

The public pages use a Supabase client that never carries a session (`createPublicClient` in `src/lib/supabase/server.ts`), and only `src/lib/catalog.ts` queries through it.

### Storage

| Bucket | Public | Limit | Path |
|---|---|---|---|
| `product-images` | yes | 10 MB, jpg/png/webp/avif | `<product id>/<random>.<ext>` |
| `sds` | yes | 25 MB, PDF | `<product id>/sds-<timestamp>.pdf` |

Anyone can fetch a file by its URL. Only admins can list, upload, replace or delete. The admin uploads files straight from the browser to Storage, which avoids the 1 MB request limit on server actions. Replaced or removed files are deleted from Storage when you save.

Because the buckets are public, an SDS for a draft product can be downloaded by anyone who knows its exact URL. The URL contains the product's random ID, so it can't be guessed in practice. SDS documents are public by nature anyway.

---

## Snap codes

- **Generated automatically.** Every variant gets a code from a database trigger when it's inserted.
- **The code itself** is 7 characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ`. That alphabet has no 0/O, 1/I/L, so codes can't be misread on a label, and it gives about 27 billion combinations. The trigger retries if a code is already taken.
- **Never changes.** Updates can't change a code, so a printed label keeps working even if the size, SKU or price changes. Deleting the variant (or its product) does retire the code.
- **Scanning.** `swzzle.com/snap/<code>` resolves the code (lowercase works too). It shows the product, size, SKU and "Reorder coming soon". Codes for products that aren't live show "Code not active".
- **QR codes for labels.** In the product editor, every saved variant has a **Download Snap QR** button. It calls the `getSnapQr` server action, which returns a 1024 px PNG with medium error correction. The QR encodes `NEXT_PUBLIC_SITE_URL/snap/<code>` (default `https://swzzle.com`), so labels printed from a local admin still point at production.

---

## CSV import

Go to `/admin/import`. The template is `docs/products-template.csv`, also downloadable from that page.

**The process:**
1. **Upload** a CSV. It's parsed in the browser.
2. **Preview.** Every row is validated, then checked against the database: which products and variants are new, which will be updated, which categories will be created, and any problems with row numbers. You can't commit while there are problems.
3. **Commit.** Products are sent in chunks of 25, and the server re-validates each chunk with the same rules before writing. A 400-product file is about 16 requests.

### Format

There's one row per **variant**. Product columns can repeat on every row of that product, or be filled on its first row only and left blank after. Column headers are case-insensitive, and spaces or hyphens become underscores.

| Column | Required | Notes |
|---|---|---|
| `slug` | no* | Identifies the product. If blank, it's derived from `swzzle_name`. Lowercase letters, numbers and single hyphens. |
| `swzzle_name` | new products | Public name. *Either `slug` or `swzzle_name` is needed on every row. |
| `tagline` | no | One line. |
| `description` | no | Quote it if it contains commas or line breaks. |
| `category` | no | Category name. Matched by name or slug; unknown categories are created on commit. |
| `line` | new products | `industrial`, `consumer` or `both`. |
| `status` | no | `draft` (default for new), `live` or `discontinued`. |
| `legal_copy` | no | Label usage and legal text. |
| `hazard_pictograms` | no | `GHS05\|GHS07`. Accepts `\|`, `;`, `,` or spaces as separators, and `GHS5` or `5` as shorthand. |
| `athea_product_name` | no | Internal. |
| `athea_part_number` | no | Internal. |
| `size_label` | new variants | For example `1 gal`, `5 gal pail`, `case of 4`. |
| `sku` | yes, for a variant | Unique. Uppercased automatically. A row with no SKU only updates product fields. |
| `mro_price` | no | `34`, `34.00` or `$1,200.00`. |
| `consumer_price` | no | Same format. |

### Rules

- **Re-importing is safe.** Products match on `slug` and variants on `sku`, so running the same file again updates instead of duplicating.
- **Blank cells never overwrite existing values.** To clear a field, edit the product in the admin.
- **A SKU that already belongs to a different product is an error.** The importer won't move variants between products.
- **Two rows for the same product with different non-blank values** for the same field is an error.
- **Snap codes are never in the CSV.** The database generates them.
- **Images and SDS PDFs aren't part of the CSV.** Upload them per product in the editor.
- **Each chunk is written independently.** If something fails partway through (for example a network drop), fix the cause and re-import the whole file. Rows that already landed will just match and update.

---

## Pages

| Route | What it does |
|---|---|
| `/` | Landing shell |
| `/industrial` | Live products with line industrial or both. Prices are MRO prices. |
| `/consumer` | Live products with line consumer or both. Prices are consumer prices. |
| `/products/[slug]` | Images, variants with the prices for the product's line, description, GHS pictograms, usage and safety text, SDS download |
| `/sds` | Searchable list of every live product with an SDS |
| `/snap/[code]` | Snap landing page |
| `/about` | Placeholder |
| `/login`, `/signup` | Auth |
| `/admin/products` | List with search (name, slug, Athea name and part #), filters by line, status and category, 100 per page |
| `/admin/products/new`, `/admin/products/[id]` | Product editor |
| `/admin/categories` | Category CRUD |
| `/admin/import` | CSV importer |

---

## Brand

The design tokens are at the top of `src/app/globals.css`:
- The accent color is `--accent: #ff6a00`. Change it in that one place.
- Fonts are Archivo (body), Archivo Black (`.display` headings) and JetBrains Mono (SKUs and codes), loaded through `next/font`.
- The footer tagline is "stirring up business as usual."

The GHS pictograms are placeholder diamonds that show the hazard number. For the official artwork, add `public/ghs/GHS01.svg` through `GHS09.svg` and update `src/components/site/HazardPictogram.tsx`.

---

## Decisions and defaults

These are calls I made where the spec left it open:

- **Products have a `slug` column.** The spec didn't list one, but `/products/[slug]` needs it.
- **Cache Components (`cacheComponents: true`) is on.** It's the create-next-app default, and Next says it becomes mandatory in the next major version. Pages render a static shell, and live data streams in inside `<Suspense>` boundaries. Nothing is cached, so admin changes show on the public site immediately.
- **Product pages don't have per-product `<title>` metadata yet.** It's easy to add later with `generateMetadata`.
- **Landing page copy is placeholder.**
- **`/snap` shows the price for the product's line.** It shows the MRO price, falling back to the consumer price for products in both lines.
- **Variant order** follows row order in the editor and in the CSV.

---

## Deliberately left for later

- **Cart and checkout.** No pricing logic beyond display, and no Stripe. The `.env.local` Stripe and Resend variables are blank and unused.
- **Orders and customers.** The `profiles` table is the place to hang customer data. Customer RLS (users reading their own orders) would sit next to the admin policies.
- **Snap 'n Stock inventory.** Snap codes are already stable, unique per variant and resolve at `/snap/[code]`. That page is where reorder and stock actions will go, keyed by `snap_code`.
- **Per-product SEO metadata, sitemap, and real GHS artwork.**
