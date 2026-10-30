"use client";

import Papa from "papaparse";
import Link from "next/link";
import { useState } from "react";
import {
  CSV_COLUMNS,
  buildImport,
  normalizeHeader,
  planImport,
  type CsvRecord,
  type ImportProduct,
  type Issue,
  type PlannedImport,
} from "@/lib/csv-import";
import { commitImportChunk, getImportContext, type ChunkResult } from "./actions";

const CHUNK_PRODUCTS = 25; // keeps each server action request well under the 1 MB body limit

type Parsed = {
  fileName: string;
  records: CsvRecord[];
  products: ImportProduct[];
  issues: Issue[];
  plan: PlannedImport;
  existing: Set<string>;
  unknownColumns: string[];
};

export function Importer() {
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<ChunkResult | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setParsed(null);
    setDone(null);
    setError(null);
    setBusy("Reading file…");

    const text = await file.text();
    const out = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeHeader,
    });
    if (out.errors.length) {
      const e = out.errors[0];
      setError(`CSV parse error${e.row !== undefined ? ` near row ${e.row + 2}` : ""}: ${e.message}`);
      setBusy(null);
      return;
    }

    const headers = out.meta.fields ?? [];
    const missing = ["sku"].filter((c) => !headers.includes(c));
    if (!headers.includes("slug") && !headers.includes("swzzle_name")) missing.push("slug or swzzle_name");
    if (missing.length) {
      setError(`Missing required column(s): ${missing.join(", ")}. See the template.`);
      setBusy(null);
      return;
    }

    // Papa drops line numbers with skipEmptyLines; record our own (approximate if the file has blank lines).
    const records: CsvRecord[] = out.data.map((r, i) => ({ ...r, __row: String(i + 2) }));
    const { products, issues } = buildImport(records);

    setBusy("Checking against the database…");
    try {
      const ctx = await getImportContext(
        products.map((p) => p.slug),
        products.flatMap((p) => p.variants.map((v) => v.sku)),
      );
      const plan = planImport(products, ctx);
      setParsed({
        fileName: file.name,
        records,
        products,
        issues: [...issues, ...plan.issues].sort((a, b) => (a.row ?? 0) - (b.row ?? 0)),
        plan,
        existing: new Set(ctx.existingSlugs),
        unknownColumns: headers.filter((h) => !(CSV_COLUMNS as readonly string[]).includes(h)),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setBusy(null);
  }

  async function commit() {
    if (!parsed) return;
    setError(null);

    // Send whole products per chunk so all rows of a product are validated together.
    const rowsBySlug = new Map(parsed.products.map((p) => [p.slug, new Set(p.rows)]));
    const slugs = parsed.products.map((p) => p.slug);
    const total: ChunkResult = { issues: [], createdProducts: 0, updatedProducts: 0, createdVariants: 0, updatedVariants: 0 };

    for (let i = 0; i < slugs.length; i += CHUNK_PRODUCTS) {
      setBusy(`Importing products ${i + 1}-${Math.min(i + CHUNK_PRODUCTS, slugs.length)} of ${slugs.length}…`);
      const wanted = new Set<number>();
      slugs.slice(i, i + CHUNK_PRODUCTS).forEach((s) => rowsBySlug.get(s)!.forEach((r) => wanted.add(r)));
      const chunk = parsed.records.filter((r) => wanted.has(Number(r.__row)));
      try {
        const res = await commitImportChunk(chunk);
        total.issues.push(...res.issues);
        total.createdProducts += res.createdProducts;
        total.updatedProducts += res.updatedProducts;
        total.createdVariants += res.createdVariants;
        total.updatedVariants += res.updatedVariants;
      } catch (e) {
        total.issues.push({ row: null, message: `Chunk starting at product ${i + 1}: ${e instanceof Error ? e.message : String(e)}` });
      }
    }
    setBusy(null);
    setDone(total);
    setParsed(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-sm" disabled={!!busy} />
        <a href="/admin/import/template" className="text-sm text-accent underline">
          Download template CSV
        </a>
      </div>

      {busy && <p className="text-muted">{busy}</p>}
      {error && <p className="text-danger">{error}</p>}

      {done && (
        <div className="rounded-brand border border-line bg-surface p-4">
          <h2 className="font-bold">Import finished</h2>
          <p className="mt-1 text-sm">
            Products: {done.createdProducts} created, {done.updatedProducts} matched for update. Variants: {done.createdVariants} created,{" "}
            {done.updatedVariants} updated.
          </p>
          <IssueList issues={done.issues} />
          <Link href="/admin/products" className="btn btn-sm mt-3">Go to products</Link>
        </div>
      )}

      {parsed && (
        <>
          <div className="rounded-brand border border-line bg-surface p-4 text-sm">
            <h2 className="mb-2 text-base font-bold">{parsed.fileName}</h2>
            <ul className="grid gap-1 sm:grid-cols-2">
              <li>{parsed.records.length} rows</li>
              <li>{parsed.products.length} products</li>
              <li>{parsed.plan.newProducts} new, {parsed.plan.updatedProducts} existing (blank cells leave existing values alone)</li>
              <li>{parsed.plan.newVariants} new variants, {parsed.plan.updatedVariants} existing</li>
              {parsed.plan.newCategories.length > 0 && (
                <li className="sm:col-span-2">New categories to create: {parsed.plan.newCategories.join(", ")}</li>
              )}
              {parsed.unknownColumns.length > 0 && (
                <li className="sm:col-span-2 text-muted">Ignored columns: {parsed.unknownColumns.join(", ")}</li>
              )}
            </ul>
          </div>

          <IssueList issues={parsed.issues} />

          <div className="flex items-center gap-4">
            <button className="btn" onClick={commit} disabled={parsed.issues.length > 0 || !!busy}>
              Commit import
            </button>
            {parsed.issues.length > 0 && <span className="text-sm text-danger">Fix the {parsed.issues.length} problem(s) and re-upload.</span>}
          </div>

          <div className="overflow-x-auto">
            <table className="grid-table">
              <thead>
                <tr>
                  <th />
                  <th>Slug</th>
                  <th>Name</th>
                  <th>Line</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Variants (SKU · size · MRO · consumer)</th>
                </tr>
              </thead>
              <tbody>
                {parsed.products.map((p) => (
                  <tr key={p.slug}>
                    <td className="text-xs">{parsed.existing.has(p.slug) ? <span className="text-muted">update</span> : <span className="text-ok">new</span>}</td>
                    <td className="font-mono text-xs">{p.slug}</td>
                    <td>{p.fields.swzzle_name ?? <span className="text-muted">(unchanged)</span>}</td>
                    <td>{p.fields.line ?? ""}</td>
                    <td>{p.fields.status ?? (parsed.existing.has(p.slug) ? "" : "draft")}</td>
                    <td>{p.fields.category ?? ""}</td>
                    <td className="font-mono text-xs">
                      {p.variants.map((v) => (
                        <div key={v.sku}>
                          {v.sku} · {v.size_label ?? "-"} · {v.mro_price ?? "-"} · {v.consumer_price ?? "-"}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function IssueList({ issues }: { issues: Issue[] }) {
  if (!issues.length) return null;
  return (
    <div className="max-h-80 overflow-y-auto rounded-brand border border-danger/50 p-3 text-sm">
      <h3 className="mb-1 font-bold text-danger">{issues.length} problem(s)</h3>
      <ul className="space-y-0.5">
        {issues.map((i, n) => (
          <li key={n}>
            {i.row !== null && <span className="font-mono text-muted">row {i.row}: </span>}
            {i.slug && <span className="font-mono">{i.slug}: </span>}
            {i.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
