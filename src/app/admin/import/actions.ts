"use server";

import { requireAdmin } from "@/lib/auth";
import { buildImport, planImport, type CsvRecord, type ImportContext, type Issue } from "@/lib/csv-import";
import { slugify } from "@/lib/format";

type Db = Awaited<ReturnType<typeof requireAdmin>>["supabase"];

// Long in() lists overflow the request URL; look things up in batches.
async function inBatches<T>(values: string[], size: number, fetch: (batch: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < values.length; i += size) out.push(...(await fetch(values.slice(i, i + size))));
  return out;
}

async function loadContext(db: Db, slugs: string[], skus: string[]): Promise<ImportContext> {
  const products = await inBatches(slugs, 100, async (batch) => {
    const { data, error } = await db.from("products").select("id, slug").in("slug", batch);
    if (error) throw new Error(error.message);
    return data as { id: string; slug: string }[];
  });
  const variants = await inBatches(skus, 100, async (batch) => {
    const { data, error } = await db.from("product_variants").select("sku, products(slug)").in("sku", batch);
    if (error) throw new Error(error.message);
    return data as unknown as { sku: string; products: { slug: string } | null }[];
  });
  const { data: categories, error } = await db.from("categories").select("id, name, slug");
  if (error) throw new Error(error.message);

  return {
    existingSlugs: products.map((p) => p.slug),
    skuOwners: Object.fromEntries(variants.map((v) => [v.sku, v.products?.slug ?? ""])),
    categories: categories ?? [],
  };
}

/** Preview step: the browser parses the file and asks only which slugs/SKUs already exist. */
export async function getImportContext(slugs: string[], skus: string[]): Promise<ImportContext> {
  const { supabase } = await requireAdmin();
  return loadContext(supabase, slugs, skus);
}

export type ChunkResult = {
  issues: Issue[];
  createdProducts: number;
  updatedProducts: number;
  createdVariants: number;
  updatedVariants: number;
};

/**
 * Commit step: receives the raw CSV records for a handful of products and re-validates them
 * server-side with the same rules as the preview before writing anything.
 */
export async function commitImportChunk(records: CsvRecord[]): Promise<ChunkResult> {
  const { supabase: db } = await requireAdmin();
  const result: ChunkResult = { issues: [], createdProducts: 0, updatedProducts: 0, createdVariants: 0, updatedVariants: 0 };

  const { products, issues } = buildImport(records);
  const ctx = await loadContext(
    db,
    products.map((p) => p.slug),
    products.flatMap((p) => p.variants.map((v) => v.sku)),
  );
  const plan = planImport(products, ctx);
  if (issues.length || plan.issues.length) {
    result.issues = [...issues, ...plan.issues];
    return result;
  }

  // ---- categories ----
  if (plan.newCategories.length) {
    const { error } = await db
      .from("categories")
      .upsert(plan.newCategories.map((name) => ({ name, slug: slugify(name) })), { onConflict: "slug", ignoreDuplicates: true });
    if (error) return { ...result, issues: [{ row: null, message: `Creating categories: ${error.message}` }] };
  }
  const { data: cats } = await db.from("categories").select("id, name, slug");
  const categoryId = (name?: string) => {
    if (!name) return undefined;
    const c = (cats ?? []).find((c) => c.name.toLowerCase() === name.toLowerCase() || c.slug === slugify(name));
    return c?.id;
  };

  // ---- products ----
  const existing = new Set(ctx.existingSlugs);
  const productRow = (p: (typeof products)[number]) => {
    const { category, ...fields } = p.fields;
    const row: Record<string, unknown> = { ...fields };
    const cid = categoryId(category);
    if (cid) row.category_id = cid;
    return row;
  };

  const toInsert = products.filter((p) => !existing.has(p.slug));
  if (toInsert.length) {
    const { error } = await db.from("products").insert(toInsert.map((p) => ({ slug: p.slug, ...productRow(p) })));
    if (error) return { ...result, issues: [{ row: toInsert[0].rows[0], message: `Inserting products: ${error.message}` }] };
    result.createdProducts = toInsert.length;
  }

  const toUpdate = products.filter((p) => existing.has(p.slug));
  const updateErrors = await Promise.all(
    toUpdate.map(async (p): Promise<Issue | null> => {
      const row = productRow(p);
      if (!Object.keys(row).length) return null; // nothing but variants on these rows
      const { error } = await db.from("products").update(row).eq("slug", p.slug);
      return error ? { row: p.rows[0], slug: p.slug, message: error.message } : null;
    }),
  );
  result.updatedProducts = toUpdate.length;
  result.issues.push(...updateErrors.filter((e): e is Issue => e !== null));

  // ---- variants ----
  const { data: ids, error: idErr } = await db.from("products").select("id, slug").in("slug", products.map((p) => p.slug));
  if (idErr) return { ...result, issues: [...result.issues, { row: null, message: idErr.message }] };
  const idBySlug = new Map((ids ?? []).map((r) => [r.slug, r.id]));

  const newVariants = [];
  const variantUpdates = [];
  for (const p of products) {
    for (const v of p.variants) {
      const values: Record<string, unknown> = {};
      if (v.size_label !== undefined) values.size_label = v.size_label;
      if (v.mro_price !== undefined) values.mro_price = v.mro_price;
      if (v.consumer_price !== undefined) values.consumer_price = v.consumer_price;

      if (ctx.skuOwners[v.sku]) {
        if (Object.keys(values).length) variantUpdates.push({ v, slug: p.slug, values });
      } else {
        newVariants.push({ product_id: idBySlug.get(p.slug), sku: v.sku, sort_order: v.sort_order, ...values });
      }
    }
  }

  if (newVariants.length) {
    const { error } = await db.from("product_variants").insert(newVariants);
    if (error) result.issues.push({ row: null, message: `Inserting variants: ${error.message}` });
    else result.createdVariants = newVariants.length;
  }

  const variantErrors = await Promise.all(
    variantUpdates.map(async ({ v, slug, values }): Promise<Issue | null> => {
      const { error } = await db.from("product_variants").update(values).eq("sku", v.sku);
      return error ? { row: v.row, slug, message: error.message } : null;
    }),
  );
  const failedVariants = variantErrors.filter((e): e is Issue => e !== null);
  result.issues.push(...failedVariants);
  result.updatedVariants = variantUpdates.length - failedVariants.length;

  return result;
}
