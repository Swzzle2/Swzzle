import { listLiveProducts } from "@/lib/catalog";
import { ProductCard } from "./ProductCard";

export async function ProductGrid({ line }: { line: "industrial" | "consumer" }) {
  const products = await listLiveProducts(line);
  if (!products.length) {
    return <p className="text-muted">No products yet. Check back soon.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} line={line} />
      ))}
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="aspect-[3/4] animate-pulse rounded-brand bg-surface" />
      ))}
    </div>
  );
}
