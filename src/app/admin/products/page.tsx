import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { LINES, STATUSES, type Category } from "@/lib/types";

export const metadata = { title: "Products" };

const PAGE_SIZE = 100;

type Row = {
  id: string;
  slug: string;
  swzzle_name: string;
  line: string;
  status: string;
  athea_part_number: string | null;
  sds_path: string | null;
  updated_at: string;
  categories: { name: string } | null;
  product_variants: { count: number }[];
};

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = str("q").trim();
  const line = str("line");
  const status = str("status");
  const category = str("category");
  const page = Math.max(1, Number(str("page")) || 1);

  const { supabase } = await requireAdmin();

  let query = supabase
    .from("products")
    .select(
      "id, slug, swzzle_name, line, status, athea_part_number, sds_path, updated_at, categories(name), product_variants(count)",
      { count: "exact" },
    )
    .order("swzzle_name")
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) {
    // Commas and parens would break the or() filter syntax.
    const term = q.replace(/[,()]/g, " ");
    query = query.or(
      `swzzle_name.ilike.%${term}%,slug.ilike.%${term}%,athea_product_name.ilike.%${term}%,athea_part_number.ilike.%${term}%`,
    );
  }
  if ((LINES as readonly string[]).includes(line)) query = query.eq("line", line);
  if ((STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);
  if (category === "none") query = query.is("category_id", null);
  else if (category) query = query.eq("category_id", category);

  const [{ data, count, error }, { data: cats }] = await Promise.all([
    query,
    supabase.from("categories").select("*").order("sort_order").order("name"),
  ]);
  const rows = (data ?? []) as unknown as Row[];
  const categories = (cats ?? []) as Category[];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (n: number) => {
    const params = new URLSearchParams({ q, line, status, category, page: String(n) });
    for (const [k, v] of [...params]) if (!v) params.delete(k);
    return `/admin/products?${params}`;
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-4">
        <h1 className="text-2xl font-bold">Products</h1>
        <span className="text-sm text-muted">{total} total</span>
        <Link href="/admin/products/new" className="btn btn-sm ml-auto">+ New product</Link>
      </div>

      <form className="mb-4 flex flex-wrap gap-2" action="/admin/products">
        <input name="q" defaultValue={q} placeholder="Search name, slug, Athea name or part #" className="field max-w-sm" />
        <select name="line" defaultValue={line} className="field w-auto">
          <option value="">All lines</option>
          {LINES.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select name="status" defaultValue={status} className="field w-auto">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select name="category" defaultValue={category} className="field w-auto">
          <option value="">All categories</option>
          <option value="none">No category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="btn btn-ghost btn-sm">Filter</button>
        {(q || line || status || category) && (
          <Link href="/admin/products" className="self-center text-sm text-muted underline">Clear</Link>
        )}
      </form>

      {error && <p className="mb-4 text-danger">{error.message}</p>}

      <table className="grid-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Line</th>
            <th>Status</th>
            <th>Variants</th>
            <th>SDS</th>
            <th>Athea #</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={`/admin/products/${p.id}`} className="font-semibold hover:text-accent">{p.swzzle_name}</Link>
                <div className="font-mono text-xs text-muted">{p.slug}</div>
              </td>
              <td>{p.categories?.name ?? <span className="text-muted">-</span>}</td>
              <td>{p.line}</td>
              <td>
                <span className={p.status === "live" ? "text-ok" : p.status === "discontinued" ? "text-danger" : "text-muted"}>
                  {p.status}
                </span>
              </td>
              <td>{p.product_variants[0]?.count ?? 0}</td>
              <td>{p.sds_path ? "yes" : <span className="text-muted">no</span>}</td>
              <td className="font-mono text-xs">{p.athea_part_number ?? ""}</td>
              <td className="text-xs text-muted">{new Date(p.updated_at).toLocaleDateString()}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-muted">No products match.</td>
            </tr>
          )}
        </tbody>
      </table>

      {pages > 1 && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          {page > 1 && <Link href={pageHref(page - 1)} className="btn btn-ghost btn-sm">← Prev</Link>}
          <span className="text-muted">Page {page} of {pages}</span>
          {page < pages && <Link href={pageHref(page + 1)} className="btn btn-ghost btn-sm">Next →</Link>}
        </div>
      )}
    </>
  );
}
