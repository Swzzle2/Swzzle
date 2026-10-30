import type { Metadata } from "next";
import { Suspense } from "react";
import { listSds } from "@/lib/catalog";
import { sdsUrl } from "@/lib/storage";
import { SdsSearch } from "./SdsSearch";

export const metadata: Metadata = { title: "SDS library" };

export default function SdsPage() {
  return (
    <section className="container-swz py-12">
      <div className="eyebrow">Safety data sheets</div>
      <h1 className="display mt-2 text-5xl">SDS library</h1>
      <p className="mt-3 max-w-2xl text-muted">Every current Swzzle product with a safety data sheet. Search by name or category.</p>
      <div className="mt-10">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <SdsList />
        </Suspense>
      </div>
    </section>
  );
}

async function SdsList() {
  const rows = await listSds();
  const items = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.swzzle_name,
    tagline: r.tagline,
    category: r.category_name,
    line: r.line,
    url: sdsUrl(r.sds_path!, r.swzzle_name),
  }));
  return <SdsSearch items={items} />;
}
