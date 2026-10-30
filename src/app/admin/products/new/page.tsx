import Link from "next/link";
import { ProductForm } from "@/components/admin/ProductForm";
import { requireAdmin } from "@/lib/auth";
import type { Category } from "@/lib/types";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("categories").select("*").order("sort_order").order("name");

  return (
    <>
      <div className="mb-6 flex items-baseline gap-4">
        <Link href="/admin/products" className="text-sm text-muted hover:text-fg">← Products</Link>
        <h1 className="text-2xl font-bold">New product</h1>
      </div>
      <ProductForm categories={(data ?? []) as Category[]} />
    </>
  );
}
