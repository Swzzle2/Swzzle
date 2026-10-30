"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProduct, saveProduct, type ProductInput } from "@/app/admin/products/actions";
import { HazardPictogram } from "@/components/site/HazardPictogram";
import { parsePrice, slugify } from "@/lib/format";
import { GHS } from "@/lib/ghs";
import { IMAGES_BUCKET, SDS_BUCKET, imageUrl, sdsUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import {
  LINES,
  STATUSES,
  type Category,
  type Product,
  type ProductImage,
  type ProductLine,
  type ProductStatus,
  type Variant,
} from "@/lib/types";
import { SnapQrButton } from "./SnapQrButton";

type VariantRow = {
  key: string;
  id?: string;
  size_label: string;
  sku: string;
  mro_price: string;
  consumer_price: string;
  snap_code?: string;
};

type ImageRow = { key: string; id?: string; storage_path: string; alt: string };

type Props = {
  categories: Category[];
  product?: Product;
  variants?: Variant[];
  images?: ProductImage[];
};

const priceText = (n: number | null) => (n === null ? "" : String(n));
const newKey = () => crypto.randomUUID();
const fileExt = (name: string) => (name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "");

export function ProductForm({ categories, product, variants = [], images = [] }: Props) {
  const router = useRouter();
  const isNew = !product;
  const [id] = useState(() => product?.id ?? crypto.randomUUID());

  const [name, setName] = useState(product?.swzzle_name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [tagline, setTagline] = useState(product?.tagline ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [line, setLine] = useState<ProductLine>(product?.line ?? "industrial");
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? "draft");
  const [legal, setLegal] = useState(product?.legal_copy ?? "");
  const [pictos, setPictos] = useState<string[]>(product?.hazard_pictograms ?? []);
  const [atheaName, setAtheaName] = useState(product?.athea_product_name ?? "");
  const [atheaPart, setAtheaPart] = useState(product?.athea_part_number ?? "");
  const [sdsPath, setSdsPath] = useState<string | null>(product?.sds_path ?? null);

  const [rows, setRows] = useState<VariantRow[]>(() =>
    variants.length
      ? variants.map((v) => ({
          key: v.id,
          id: v.id,
          size_label: v.size_label,
          sku: v.sku,
          mro_price: priceText(v.mro_price),
          consumer_price: priceText(v.consumer_price),
          snap_code: v.snap_code,
        }))
      : [{ key: newKey(), size_label: "", sku: "", mro_price: "", consumer_price: "" }],
  );
  const [imgs, setImgs] = useState<ImageRow[]>(() =>
    images.map((i) => ({ key: i.id, id: i.id, storage_path: i.storage_path, alt: i.alt })),
  );

  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const updateRow = (key: string, patch: Partial<VariantRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // ---------- uploads go straight to Storage from the browser ----------
  async function uploadImages(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const supabase = createClient();
    for (const file of Array.from(files)) {
      setUploading(`Uploading ${file.name}…`);
      const path = `${id}/${crypto.randomUUID()}.${fileExt(file.name)}`;
      const { error } = await supabase.storage.from(IMAGES_BUCKET).upload(path, file, { contentType: file.type });
      if (error) {
        setError(`${file.name}: ${error.message}`);
        continue;
      }
      setImgs((list) => [...list, { key: newKey(), storage_path: path, alt: name }]);
    }
    setUploading(null);
  }

  async function removeImage(row: ImageRow) {
    // Unsaved uploads are deleted now; saved ones are deleted from storage on Save.
    if (!row.id) await createClient().storage.from(IMAGES_BUCKET).remove([row.storage_path]);
    setImgs((list) => list.filter((i) => i.key !== row.key));
  }

  function moveImage(index: number, delta: number) {
    setImgs((list) => {
      const next = [...list];
      const target = index + delta;
      if (target < 0 || target >= next.length) return list;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function uploadSds(file: File | undefined) {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("SDS must be a PDF.");
      return;
    }
    setError(null);
    setUploading(`Uploading ${file.name}…`);
    const path = `${id}/sds-${Date.now()}.pdf`;
    const { error } = await createClient().storage.from(SDS_BUCKET).upload(path, file, { contentType: "application/pdf" });
    setUploading(null);
    if (error) {
      setError(`SDS: ${error.message}`);
      return;
    }
    // If an earlier unsaved upload is being replaced, clean it up.
    if (sdsPath && sdsPath !== product?.sds_path) await createClient().storage.from(SDS_BUCKET).remove([sdsPath]);
    setSdsPath(path);
  }

  // ---------- save ----------
  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const variantsOut = [];
    for (const [i, r] of rows.entries()) {
      if (!r.id && !r.size_label.trim() && !r.sku.trim() && !r.mro_price && !r.consumer_price) continue; // empty new row
      const mro = parsePrice(r.mro_price);
      const consumer = parsePrice(r.consumer_price);
      if (Number.isNaN(mro) || Number.isNaN(consumer)) {
        setError(`Variant ${i + 1}: prices must be numbers.`);
        return;
      }
      variantsOut.push({ id: r.id, size_label: r.size_label, sku: r.sku, mro_price: mro, consumer_price: consumer });
    }

    const input: ProductInput = {
      id,
      isNew,
      slug,
      swzzle_name: name,
      tagline,
      description,
      category_id: categoryId || null,
      line,
      status,
      legal_copy: legal,
      hazard_pictograms: pictos,
      athea_product_name: atheaName,
      athea_part_number: atheaPart,
      sds_path: sdsPath,
      variants: variantsOut,
      images: imgs.map((i) => ({ id: i.id, storage_path: i.storage_path, alt: i.alt })),
    };

    startSave(async () => {
      const res = await saveProduct(input);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (isNew) {
        router.replace(`/admin/products/${res.id}`);
      } else {
        // saveProduct() refreshes the page; the edit page keys this form on updated_at,
        // so it remounts with the saved rows (new variant ids and snap codes).
        setNotice("Saved.");
      }
    });
  }

  function onDelete() {
    if (!product) return;
    if (!confirm(`Delete "${product.swzzle_name}" and all its variants? Printed Snap codes for it will stop working.`)) return;
    startSave(async () => {
      const res = await deleteProduct(product.id);
      if (!res.ok) setError(res.error);
      else router.replace("/admin/products");
    });
  }

  return (
    <form onSubmit={onSave} className="flex flex-col gap-8 pb-24">
      {/* ---------- basics ---------- */}
      <section className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Swzzle name (public)</label>
          <input
            className="field"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
        </div>
        <div>
          <label className="label">Slug (URL: /products/{slug || "…"})</label>
          <input
            className="field font-mono"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase());
            }}
            onBlur={() => setSlug((s) => slugify(s))}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Tagline (one line, what it is)</label>
          <input className="field" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>
        <div>
          <label className="label">Category</label>
          <select className="field" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">None</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Line</label>
            <select className="field" value={line} onChange={(e) => setLine(e.target.value as ProductLine)}>
              {LINES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="field" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="label">Description</label>
          <textarea className="field min-h-32" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="label">Legal / usage copy (label text)</label>
          <textarea className="field min-h-24" value={legal} onChange={(e) => setLegal(e.target.value)} />
        </div>
      </section>

      {/* ---------- internal ---------- */}
      <section className="rounded-brand border border-dashed border-danger/60 p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-danger">Internal only, never shown publicly</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="label">Athea product name</label>
            <input className="field" value={atheaName} onChange={(e) => setAtheaName(e.target.value)} />
          </div>
          <div>
            <label className="label">Athea part number</label>
            <input className="field font-mono" value={atheaPart} onChange={(e) => setAtheaPart(e.target.value)} />
          </div>
        </div>
      </section>

      {/* ---------- variants ---------- */}
      <section>
        <h2 className="mb-2 text-lg font-bold">Variants</h2>
        <table className="grid-table">
          <thead>
            <tr>
              <th>Size</th>
              <th>SKU</th>
              <th>MRO price</th>
              <th>Consumer price</th>
              <th>Snap code</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>
                  <input className="field" placeholder="1 gal" value={r.size_label} onChange={(e) => updateRow(r.key, { size_label: e.target.value })} />
                </td>
                <td>
                  <input className="field font-mono" placeholder="SWZ-…" value={r.sku} onChange={(e) => updateRow(r.key, { sku: e.target.value.toUpperCase() })} />
                </td>
                <td>
                  <input className="field w-28" inputMode="decimal" value={r.mro_price} onChange={(e) => updateRow(r.key, { mro_price: e.target.value })} />
                </td>
                <td>
                  <input className="field w-28" inputMode="decimal" value={r.consumer_price} onChange={(e) => updateRow(r.key, { consumer_price: e.target.value })} />
                </td>
                <td className="font-mono">
                  {r.snap_code ?? <span className="text-xs text-muted">on save</span>}
                </td>
                <td className="whitespace-nowrap">
                  {r.id && <SnapQrButton variantId={r.id} />}{" "}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          className="btn btn-ghost btn-sm mt-3"
          onClick={() => setRows((rs) => [...rs, { key: newKey(), size_label: "", sku: "", mro_price: "", consumer_price: "" }])}
        >
          + Add variant
        </button>
      </section>

      {/* ---------- pictograms ---------- */}
      <section>
        <h2 className="mb-2 text-lg font-bold">Hazard pictograms</h2>
        <div className="flex flex-wrap gap-3">
          {GHS.map((g) => {
            const on = pictos.includes(g.code);
            return (
              <button
                key={g.code}
                type="button"
                onClick={() => setPictos((p) => (on ? p.filter((c) => c !== g.code) : [...p, g.code].sort()))}
                className={`rounded-brand border p-2 ${on ? "border-accent bg-accent/10" : "border-line opacity-50 hover:opacity-100"}`}
                aria-pressed={on}
              >
                <HazardPictogram code={g.code} size={44} />
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------- images ---------- */}
      <section>
        <h2 className="mb-2 text-lg font-bold">Images</h2>
        <p className="mb-3 text-sm text-muted">First image is the main one. JPG, PNG, WebP or AVIF, up to 10 MB.</p>
        <div className="flex flex-col gap-2">
          {imgs.map((img, i) => (
            <div key={img.key} className="flex items-center gap-3 rounded-brand border border-line p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(img.storage_path)} alt="" className="size-16 rounded bg-surface-2 object-contain" />
              <input
                className="field"
                placeholder="Alt text"
                value={img.alt}
                onChange={(e) => setImgs((list) => list.map((x) => (x.key === img.key ? { ...x, alt: e.target.value } : x)))}
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveImage(i, -1)} disabled={i === 0}>↑</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveImage(i, 1)} disabled={i === imgs.length - 1}>↓</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeImage(img)}>Remove</button>
            </div>
          ))}
        </div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="mt-3 text-sm"
          onChange={(e) => {
            uploadImages(e.target.files);
            e.target.value = "";
          }}
        />
      </section>

      {/* ---------- SDS ---------- */}
      <section>
        <h2 className="mb-2 text-lg font-bold">Safety data sheet</h2>
        {sdsPath ? (
          <p className="mb-2 text-sm">
            <a href={sdsUrl(sdsPath)} target="_blank" rel="noopener" className="text-accent underline">
              Current SDS (PDF)
            </a>{" "}
            <button type="button" className="ml-2 text-muted underline" onClick={() => setSdsPath(null)}>
              remove
            </button>
          </p>
        ) : (
          <p className="mb-2 text-sm text-muted">No SDS uploaded.</p>
        )}
        <input
          type="file"
          accept="application/pdf"
          className="text-sm"
          onChange={(e) => {
            uploadSds(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </section>

      {/* ---------- actions ---------- */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-3">
          <button className="btn" disabled={saving || !!uploading}>
            {saving ? "Saving…" : isNew ? "Create product" : "Save"}
          </button>
          {uploading && <span className="text-sm text-muted">{uploading}</span>}
          {error && <span className="text-sm text-danger">{error}</span>}
          {notice && <span className="text-sm text-ok">{notice}</span>}
          {!isNew && (
            <button type="button" className="ml-auto text-sm text-danger underline" onClick={onDelete} disabled={saving}>
              Delete product
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
