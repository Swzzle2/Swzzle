import { requireAdmin } from "@/lib/auth";
import type { Category } from "@/lib/types";
import { CategoryRow, NewCategoryForm } from "./CategoryRow";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("categories")
    .select("*, products(count)")
    .order("sort_order")
    .order("name");
  const rows = (data ?? []) as (Category & { products: { count: number }[] })[];

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">Categories</h1>
      <NewCategoryForm />
      <table className="grid-table">
        <thead>
          <tr>
            <th colSpan={5}>Name · slug · sort order</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <CategoryRow key={`${c.id}-${c.name}-${c.slug}-${c.sort_order}`} category={c} productCount={c.products[0]?.count ?? 0} />
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={5} className="py-6 text-center text-muted">No categories yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
