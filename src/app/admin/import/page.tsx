import { Importer } from "./Importer";

export const metadata = { title: "CSV import" };

export default function ImportPage() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">CSV import</h1>
      <p className="mb-6 max-w-3xl text-sm text-muted">
        One row per variant. Product columns can repeat on every row or be filled on the first row only. Products match on{" "}
        <code>slug</code> (derived from <code>swzzle_name</code> if blank) and variants on <code>sku</code>, so re-importing
        the same file updates rather than duplicates. Blank cells never overwrite existing values. Images and SDS PDFs are
        uploaded per product in the editor. See <code>docs/README.md</code> for every column.
      </p>
      <Importer />
    </>
  );
}
