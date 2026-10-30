import "server-only";
import { createPublicClient } from "@/lib/supabase/server";
import type { PublicImage, PublicProduct, PublicVariant } from "@/lib/types";

// Public reads go through the public_* views only. Those views have no Athea columns and only
// return live products, so nothing here can leak internal data even with select("*").

export type ProductCard = PublicProduct & {
  image: PublicImage | null;
  variants: PublicVariant[];
};

export async function listLiveProducts(line: "industrial" | "consumer"): Promise<ProductCard[]> {
  const db = await createPublicClient();
  const { data: products, error } = await db
    .from("public_products")
    .select("*")
    .in("line", [line, "both"])
    .order("category_name", { ascending: true, nullsFirst: false })
    .order("swzzle_name");
  if (error) throw new Error(error.message);
  if (!products?.length) return [];

  const ids = products.map((p) => p.id);
  const [variants, images] = await Promise.all([
    db.from("public_product_variants").select("*").in("product_id", ids).order("sort_order"),
    db.from("public_product_images").select("*").in("product_id", ids).order("sort_order"),
  ]);
  if (variants.error) throw new Error(variants.error.message);
  if (images.error) throw new Error(images.error.message);

  return (products as PublicProduct[]).map((p) => ({
    ...p,
    variants: (variants.data as PublicVariant[]).filter((v) => v.product_id === p.id),
    image: (images.data as PublicImage[]).find((i) => i.product_id === p.id) ?? null,
  }));
}

export async function getLiveProduct(slug: string) {
  const db = await createPublicClient();
  const { data: product, error } = await db.from("public_products").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  if (!product) return null;

  const [variants, images] = await Promise.all([
    db.from("public_product_variants").select("*").eq("product_id", product.id).order("sort_order"),
    db.from("public_product_images").select("*").eq("product_id", product.id).order("sort_order"),
  ]);
  if (variants.error) throw new Error(variants.error.message);
  if (images.error) throw new Error(images.error.message);

  return {
    product: product as PublicProduct,
    variants: variants.data as PublicVariant[],
    images: images.data as PublicImage[],
  };
}

export async function listSds() {
  const db = await createPublicClient();
  const { data, error } = await db
    .from("public_products")
    .select("id, slug, swzzle_name, tagline, line, category_name, sds_path, updated_at")
    .not("sds_path", "is", null)
    .order("swzzle_name");
  if (error) throw new Error(error.message);
  return data as Pick<
    PublicProduct,
    "id" | "slug" | "swzzle_name" | "tagline" | "line" | "category_name" | "sds_path" | "updated_at"
  >[];
}

export async function getBySnapCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!/^[0-9A-Z]{6,8}$/.test(normalized)) return null;

  const db = await createPublicClient();
  const { data: variant, error } = await db
    .from("public_product_variants")
    .select("*")
    .eq("snap_code", normalized)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!variant) return null;

  const [product, image] = await Promise.all([
    db.from("public_products").select("*").eq("id", variant.product_id).single(),
    db.from("public_product_images").select("*").eq("product_id", variant.product_id).order("sort_order").limit(1),
  ]);
  if (product.error) throw new Error(product.error.message);

  return {
    variant: variant as PublicVariant,
    product: product.data as PublicProduct,
    image: ((image.data ?? [])[0] as PublicImage | undefined) ?? null,
  };
}
