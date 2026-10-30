// CSV import rules, shared by the browser preview and the server commit.
// Format: one row per variant; product columns repeat on each row (or are left blank after the first).
// Products match on slug, variants on sku. Blank cells never overwrite existing data.

import { SLUG_RE, parsePrice, slugify } from "@/lib/format";
import { GHS_CODES } from "@/lib/ghs";
import { LINES, STATUSES, type ProductLine, type ProductStatus } from "@/lib/types";

export const CSV_COLUMNS = [
  "slug",
  "swzzle_name",
  "tagline",
  "description",
  "category",
  "line",
  "status",
  "legal_copy",
  "hazard_pictograms",
  "athea_product_name",
  "athea_part_number",
  "size_label",
  "sku",
  "mro_price",
  "consumer_price",
] as const;

export type ProductFields = {
  swzzle_name?: string;
  tagline?: string;
  description?: string;
  category?: string;
  line?: ProductLine;
  status?: ProductStatus;
  legal_copy?: string;
  hazard_pictograms?: string[];
  athea_product_name?: string;
  athea_part_number?: string;
};

export type ImportVariant = {
  row: number;
  sku: string;
  size_label?: string;
  mro_price?: number | null;
  consumer_price?: number | null;
  sort_order: number;
};

export type ImportProduct = {
  slug: string;
  rows: number[];
  fields: ProductFields;
  variants: ImportVariant[];
};

export type Issue = { row: number | null; slug?: string; message: string };

const TEXT_FIELDS = [
  "swzzle_name",
  "tagline",
  "description",
  "category",
  "legal_copy",
  "athea_product_name",
  "athea_part_number",
] as const;

export const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, "_");

/** "GHS05", "ghs5", "5" -> "GHS05". Null if not a GHS code. */
export function normalizePictogram(raw: string): string | null {
  const m = raw.trim().toUpperCase().match(/^(?:GHS)?0?([1-9])$/);
  if (!m) return null;
  const code = `GHS0${m[1]}`;
  return GHS_CODES.includes(code) ? code : null;
}

/** A parsed CSV record keyed by normalized header. __row is the 1-based line number in the file. */
export type CsvRecord = Record<string, string | undefined> & { __row?: string };

/** Turns parsed CSV records into grouped products plus row-level issues. */
export function buildImport(records: CsvRecord[]): { products: ImportProduct[]; issues: Issue[] } {
  const issues: Issue[] = [];
  const bySlug = new Map<string, ImportProduct>();
  const skuRows = new Map<string, number>();

  records.forEach((rec, i) => {
    const row = Number(rec.__row) || i + 2; // header is row 1
    const cell = (k: string) => (rec[k] ?? "").trim();

    if (CSV_COLUMNS.every((c) => !cell(c))) return; // blank line

    const slug = cell("slug") ? cell("slug").toLowerCase() : slugify(cell("swzzle_name"));
    if (!slug) {
      issues.push({ row, message: "Needs a slug or swzzle_name to identify the product." });
      return;
    }
    if (!SLUG_RE.test(slug)) {
      issues.push({ row, slug, message: `Invalid slug "${slug}". Use lowercase letters, numbers and single hyphens.` });
      return;
    }

    let product = bySlug.get(slug);
    if (!product) {
      product = { slug, rows: [], fields: {}, variants: [] };
      bySlug.set(slug, product);
    }
    product.rows.push(row);

    // ---- product fields: first non-blank value wins; a different non-blank value later is an error ----
    const setField = <K extends keyof ProductFields>(key: K, value: ProductFields[K]) => {
      const current = product!.fields[key];
      if (current === undefined) {
        product!.fields[key] = value;
      } else if (JSON.stringify(current) !== JSON.stringify(value)) {
        issues.push({ row, slug, message: `${key} differs from an earlier row for this product.` });
      }
    };

    for (const key of TEXT_FIELDS) if (cell(key)) setField(key, cell(key));

    const line = cell("line").toLowerCase();
    if (line) {
      if ((LINES as readonly string[]).includes(line)) setField("line", line as ProductLine);
      else issues.push({ row, slug, message: `line must be one of ${LINES.join(", ")}.` });
    }

    const status = cell("status").toLowerCase();
    if (status) {
      if ((STATUSES as readonly string[]).includes(status)) setField("status", status as ProductStatus);
      else issues.push({ row, slug, message: `status must be one of ${STATUSES.join(", ")}.` });
    }

    const pictoCell = cell("hazard_pictograms");
    if (pictoCell) {
      const parts = pictoCell.split(/[|;,\s]+/).filter(Boolean);
      const codes = parts.map(normalizePictogram);
      const bad = parts.filter((_, j) => !codes[j]);
      if (bad.length) issues.push({ row, slug, message: `Unknown hazard pictogram: ${bad.join(", ")}. Use GHS01 to GHS09.` });
      else setField("hazard_pictograms", [...new Set(codes as string[])].sort());
    }

    // ---- variant ----
    const sku = cell("sku").toUpperCase();
    const size = cell("size_label");
    const mro = parsePrice(cell("mro_price"));
    const consumer = parsePrice(cell("consumer_price"));

    if (!sku) {
      if (size || cell("mro_price") || cell("consumer_price")) {
        issues.push({ row, slug, message: "Variant columns filled but sku is blank." });
      }
      return; // product-only row
    }
    if (skuRows.has(sku)) {
      issues.push({ row, slug, message: `SKU ${sku} already appears on row ${skuRows.get(sku)}.` });
      return;
    }
    skuRows.set(sku, row);
    if (Number.isNaN(mro)) issues.push({ row, slug, message: `mro_price "${cell("mro_price")}" is not a number.` });
    if (Number.isNaN(consumer)) issues.push({ row, slug, message: `consumer_price "${cell("consumer_price")}" is not a number.` });

    const variant: ImportVariant = { row, sku, sort_order: (product.variants.length + 1) * 10 };
    if (size) variant.size_label = size;
    if (cell("mro_price") && !Number.isNaN(mro)) variant.mro_price = mro;
    if (cell("consumer_price") && !Number.isNaN(consumer)) variant.consumer_price = consumer;
    product.variants.push(variant);
  });

  return { products: [...bySlug.values()], issues };
}

/** Facts about the database needed to finish validation. */
export type ImportContext = {
  existingSlugs: string[];
  skuOwners: Record<string, string>; // sku -> slug of the product that owns it now
  categories: { id: string; name: string; slug: string }[];
};

export type PlannedImport = {
  issues: Issue[];
  newProducts: number;
  updatedProducts: number;
  newVariants: number;
  updatedVariants: number;
  newCategories: string[];
};

/** Second pass once we know what already exists. */
export function planImport(products: ImportProduct[], ctx: ImportContext): PlannedImport {
  const issues: Issue[] = [];
  const existing = new Set(ctx.existingSlugs);
  const catKeys = new Set(ctx.categories.flatMap((c) => [c.name.toLowerCase(), c.slug]));
  const newCategories = new Map<string, string>();
  let newProducts = 0;
  let newVariants = 0;
  let updatedVariants = 0;

  for (const p of products) {
    const isNew = !existing.has(p.slug);
    if (isNew) {
      newProducts++;
      if (!p.fields.swzzle_name) issues.push({ row: p.rows[0], slug: p.slug, message: "New product needs swzzle_name." });
      if (!p.fields.line) issues.push({ row: p.rows[0], slug: p.slug, message: "New product needs line (industrial, consumer or both)." });
    }
    const cat = p.fields.category;
    if (cat && !catKeys.has(cat.toLowerCase()) && !catKeys.has(slugify(cat))) newCategories.set(slugify(cat), cat);

    for (const v of p.variants) {
      const owner = ctx.skuOwners[v.sku];
      if (owner && owner !== p.slug) {
        issues.push({ row: v.row, slug: p.slug, message: `SKU ${v.sku} already belongs to product "${owner}".` });
      } else if (owner) {
        updatedVariants++;
      } else {
        newVariants++;
        if (!v.size_label) issues.push({ row: v.row, slug: p.slug, message: `New variant ${v.sku} needs size_label.` });
      }
    }
  }

  return {
    issues,
    newProducts,
    updatedProducts: products.length - newProducts,
    newVariants,
    updatedVariants,
    newCategories: [...newCategories.values()],
  };
}
