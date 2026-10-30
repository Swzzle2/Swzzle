import type { Metadata } from "next";
import { Suspense } from "react";
import { GridSkeleton, ProductGrid } from "@/components/site/ProductGrid";

export const metadata: Metadata = { title: "Industrial" };

export default function IndustrialPage() {
  return (
    <section className="container-swz py-12">
      <div className="eyebrow">MRO</div>
      <h1 className="display mt-2 text-5xl">Industrial</h1>
      <p className="mt-3 max-w-2xl text-muted">Facility, fleet and plant chemicals in working sizes.</p>
      <div className="mt-10">
        <Suspense fallback={<GridSkeleton />}>
          <ProductGrid line="industrial" />
        </Suspense>
      </div>
    </section>
  );
}
