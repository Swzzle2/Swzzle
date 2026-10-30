import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdmin } from "@/lib/auth";
import type { Category, Product, ProductImage, Variant } from "@/lib/types";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const [product, variants, images, categories] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("product_variants").select("*").eq("product_id", id).order("sort_order"),
    supabase.from("product_images").select("*").eq("product_id", id).order("sort_order"),
    supabase.from("categories").select("*").order("sort_order").order("name"),
  ]);
  if (!product.data) notFound();
  const p = product.data as Product;

  return (
    <>
      <div className="mb-6 flex items-baseline gap-4">
        <Link href="/admin/products" className="text-sm text-muted hover:text-fg">← Products</Link>
        <h1 className="text-2xl font-bold">{p.swzzle_name}</h1>
        {p.status === "live" && (
          <Link href={`/products/${p.slug}`} target="_blank" className="text-sm text-accent underline">
            View live page
          </Link>
        )}
      </div>
      <ProductForm
        key={p.updated_at}
        product={p}
        variants={(variants.data ?? []) as Variant[]}
        images={(images.data ?? []) as ProductImage[]}
        categories={(categories.data ?? []) as Category[]}
      />
    </>
  );
}
