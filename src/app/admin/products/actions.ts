"use server";

import QRCode from "qrcode";
import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { SLUG_RE } from "@/lib/format";
import { GHS_CODES } from "@/lib/ghs";
import { IMAGES_BUCKET, SDS_BUCKET } from "@/lib/storage";
import { LINES, STATUSES, type ProductLine, type ProductStatus } from "@/lib/types";

export type VariantInput = {
  id?: string; // absent for new rows
  size_label: string;
  sku: string;
  mro_price: number | null;
  consumer_price: number | null;
};

export type ImageInput = {
  id?: string;
  storage_path: string;
  alt: string;
};

export type ProductInput = {
  id: string; // generated client-side for new products so uploads can use it as a folder
  isNew: boolean;
  slug: string;
  swzzle_name: string;
  tagline: string;
  description: string;
  category_id: string | null;
  line: ProductLine;
  status: ProductStatus;
  legal_copy: string;
  hazard_pictograms: string[];
  athea_product_name: string;
  athea_part_number: string;
  sds_path: string | null;
  variants: VariantInput[];
  images: ImageInput[];
};

export type SaveResult = { ok: true; id: string } | { ok: false; error: string };

const blankToNull = (s: string) => (s.trim() === "" ? null : s.trim());

function validate(p: ProductInput): string | null {
  if (!p.swzzle_name.trim()) return "Swzzle name is required.";
  if (!SLUG_RE.test(p.slug)) return "Slug must be lowercase letters, numbers and single hyphens.";
  if (!LINES.includes(p.line)) return "Invalid line.";
  if (!STATUSES.includes(p.status)) return "Invalid status.";
  if (p.hazard_pictograms.some((c) => !GHS_CODES.includes(c))) return "Unknown hazard pictogram.";
  const skus = new Set<string>();
  for (const [i, v] of p.variants.entries()) {
    if (!v.size_label.trim()) return `Variant ${i + 1}: size is required.`;
    if (!v.sku.trim()) return `Variant ${i + 1}: SKU is required.`;
    const sku = v.sku.trim().toUpperCase();
    if (skus.has(sku)) return `SKU ${sku} is listed twice.`;
    skus.add(sku);
    for (const price of [v.mro_price, v.consumer_price]) {
      if (price !== null && (!Number.isFinite(price) || price < 0)) return `Variant ${i + 1}: invalid price.`;
    }
  }
  return null;
}

function friendly(message: string) {
  if (message.includes("products_slug_key")) return "Another product already uses that slug.";
  if (message.includes("product_variants_sku_key")) return "One of those SKUs is already used by another product.";
  return message;
}

export async function saveProduct(input: ProductInput): Promise<SaveResult> {
  const { supabase } = await requireAdmin();
  const problem = validate(input);
  if (problem) return { ok: false, error: problem };

  const row = {
    id: input.id,
    slug: input.slug,
    swzzle_name: input.swzzle_name.trim(),
    tagline: blankToNull(input.tagline),
    description: blankToNull(input.description),
    category_id: input.category_id || null,
    line: input.line,
    status: input.status,
    legal_copy: blankToNull(input.legal_copy),
    hazard_pictograms: input.hazard_pictograms,
    athea_product_name: blankToNull(input.athea_product_name),
    athea_part_number: blankToNull(input.athea_part_number),
    sds_path: input.sds_path,
  };

  // Remember the old SDS so a replaced file can be removed from storage.
  let oldSds: string | null = null;
  if (input.isNew) {
    const { error } = await supabase.from("products").insert(row);
    if (error) return { ok: false, error: friendly(error.message) };
  } else {
    const { data: existing } = await supabase.from("products").select("sds_path").eq("id", input.id).single();
    oldSds = existing?.sds_path ?? null;
    const { error } = await supabase.from("products").update(row).eq("id", input.id);
    if (error) return { ok: false, error: friendly(error.message) };
  }

  // ---- variants: delete removed, update kept, insert new ----
  const { data: currentVariants, error: vErr } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", input.id);
  if (vErr) return { ok: false, error: vErr.message };

  const keepIds = new Set(input.variants.filter((v) => v.id).map((v) => v.id!));
  const removed = (currentVariants ?? []).map((v) => v.id).filter((id) => !keepIds.has(id));
  if (removed.length) {
    const { error } = await supabase.from("product_variants").delete().in("id", removed);
    if (error) return { ok: false, error: error.message };
  }

  for (const [i, v] of input.variants.entries()) {
    const values = {
      product_id: input.id,
      size_label: v.size_label.trim(),
      sku: v.sku.trim().toUpperCase(),
      mro_price: v.mro_price,
      consumer_price: v.consumer_price,
      sort_order: (i + 1) * 10,
    };
    const { error } = v.id
      ? await supabase.from("product_variants").update(values).eq("id", v.id)
      : await supabase.from("product_variants").insert(values);
    if (error) return { ok: false, error: friendly(error.message) };
  }

  // ---- images: same pattern; storage objects of removed images are deleted too ----
  const { data: currentImages } = await supabase
    .from("product_images")
    .select("id, storage_path")
    .eq("product_id", input.id);
  const keepImageIds = new Set(input.images.filter((i) => i.id).map((i) => i.id!));
  const removedImages = (currentImages ?? []).filter((i) => !keepImageIds.has(i.id));
  if (removedImages.length) {
    await supabase.from("product_images").delete().in("id", removedImages.map((i) => i.id));
    await supabase.storage.from(IMAGES_BUCKET).remove(removedImages.map((i) => i.storage_path));
  }
  for (const [i, img] of input.images.entries()) {
    const values = { product_id: input.id, storage_path: img.storage_path, alt: img.alt.trim(), sort_order: (i + 1) * 10 };
    const { error } = img.id
      ? await supabase.from("product_images").update(values).eq("id", img.id)
      : await supabase.from("product_images").insert(values);
    if (error) return { ok: false, error: error.message };
  }

  if (oldSds && oldSds !== input.sds_path) {
    await supabase.storage.from(SDS_BUCKET).remove([oldSds]);
  }

  refresh();
  return { ok: true, id: input.id };
}

export async function deleteProduct(id: string): Promise<SaveResult> {
  const { supabase } = await requireAdmin();
  const [{ data: product }, { data: images }] = await Promise.all([
    supabase.from("products").select("sds_path").eq("id", id).single(),
    supabase.from("product_images").select("storage_path").eq("product_id", id),
  ]);
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (images?.length) await supabase.storage.from(IMAGES_BUCKET).remove(images.map((i) => i.storage_path));
  if (product?.sds_path) await supabase.storage.from(SDS_BUCKET).remove([product.sds_path]);
  return { ok: true, id };
}

/** Returns a PNG (base64 data URL) of the variant's Snap QR, encoding the full production URL. */
export async function getSnapQr(variantId: string): Promise<{ ok: true; dataUrl: string; filename: string; url: string } | { ok: false; error: string }> {
  const { supabase } = await requireAdmin();
  const { data: v, error } = await supabase
    .from("product_variants")
    .select("snap_code, sku")
    .eq("id", variantId)
    .single();
  if (error || !v) return { ok: false, error: error?.message ?? "Variant not found." };

  const url = `${siteUrl()}/snap/${v.snap_code}`;
  const dataUrl = await QRCode.toDataURL(url, {
    type: "image/png",
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  return { ok: true, dataUrl, url, filename: `snap-${v.sku}-${v.snap_code}.png` };
}
