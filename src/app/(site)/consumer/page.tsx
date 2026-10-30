import type { Metadata } from "next";
import { Suspense } from "react";
import { GridSkeleton, ProductGrid } from "@/components/site/ProductGrid";

export const metadata: Metadata = { title: "Consumer" };

export default function ConsumerPage() {
  return (
    <section className="container-swz py-12">
      <div className="eyebrow">Home and garage</div>
      <h1 className="display mt-2 text-5xl">Consumer</h1>
      <p className="mt-3 max-w-2xl text-muted">Pro-grade chemistry in sizes that fit under the sink.</p>
      <div className="mt-10">
        <Suspense fallback={<GridSkeleton />}>
          <ProductGrid line="consumer" />
        </Suspense>
      </div>
    </section>
  );
}
