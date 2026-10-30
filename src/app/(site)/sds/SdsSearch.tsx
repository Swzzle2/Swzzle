"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Item = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  category: string | null;
  line: string;
  url: string;
};

export function SdsSearch({ items }: { items: Item[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((i) =>
      [i.name, i.tagline, i.category, i.line].some((f) => f?.toLowerCase().includes(needle)),
    );
  }, [items, q]);

  return (
    <div>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products…"
        className="field max-w-md text-base"
        aria-label="Search safety data sheets"
      />
      <p className="mt-3 text-sm text-muted">
        {filtered.length} of {items.length}
      </p>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {filtered.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <Link href={`/products/${i.slug}`} className="font-semibold hover:text-accent">
                {i.name}
              </Link>
              <div className="text-sm text-muted">
                {[i.category, i.line === "both" ? "industrial + consumer" : i.line].filter(Boolean).join(" · ")}
              </div>
            </div>
            <a href={i.url} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">
              SDS (PDF)
            </a>
          </li>
        ))}
      </ul>
      {!filtered.length && <p className="mt-6 text-muted">No matches.</p>}
    </div>
  );
}
