import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HazardPictogram } from "@/components/site/HazardPictogram";
import { getLiveProduct } from "@/lib/catalog";
import { money } from "@/lib/format";
import { imageUrl, sdsUrl } from "@/lib/storage";

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<div className="container-swz py-12 text-muted">Loading…</div>}>
      <ProductDetail params={params} />
    </Suspense>
  );
}

async function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await getLiveProduct(slug);
  if (!found) notFound();
  const { product, variants, images } = found;

  const showMro = product.line !== "consumer";
  const showConsumer = product.line !== "industrial";
  const lineHref = product.line === "consumer" ? "/consumer" : "/industrial";

  return (
    <article className="container-swz grid gap-10 py-12 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="relative aspect-square overflow-hidden rounded-brand border border-line bg-surface">
          {images[0] ? (
            <Image
              src={imageUrl(images[0].storage_path)}
              alt={images[0].alt || product.swzzle_name}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-contain p-6"
            />
          ) : (
            <div className="display absolute inset-0 grid place-items-center text-8xl text-line">SWZ</div>
          )}
        </div>
        {images.length > 1 && (
          <div className="grid grid-cols-5 gap-2">
            {images.slice(1).map((img) => (
              <div key={img.id} className="relative aspect-square overflow-hidden rounded-brand border border-line bg-surface">
                <Image src={imageUrl(img.storage_path)} alt={img.alt || product.swzzle_name} fill sizes="10vw" className="object-contain p-1" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Link href={lineHref} className="eyebrow hover:underline">
          {product.category_name ?? (product.line === "consumer" ? "Consumer" : "Industrial")}
        </Link>
        <h1 className="display mt-2 text-4xl sm:text-5xl">{product.swzzle_name}</h1>
        {product.tagline && <p className="mt-3 text-lg text-muted">{product.tagline}</p>}

        {variants.length > 0 && (
          <table className="grid-table mt-8">
            <thead>
              <tr>
                <th>Size</th>
                <th>SKU</th>
                {showMro && <th>{showConsumer ? "MRO" : "Price"}</th>}
                {showConsumer && <th>{showMro ? "Retail" : "Price"}</th>}
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id}>
                  <td className="font-semibold">{v.size_label}</td>
                  <td className="font-mono text-muted">{v.sku}</td>
                  {showMro && <td>{money(v.mro_price) ?? <span className="text-muted">Call</span>}</td>}
                  {showConsumer && <td>{money(v.consumer_price) ?? <span className="text-muted">Call</span>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {product.description && (
          <div className="prose-swz mt-8 whitespace-pre-line">{product.description}</div>
        )}

        {product.hazard_pictograms.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-4">
            {product.hazard_pictograms.map((code) => (
              <HazardPictogram key={code} code={code} />
            ))}
          </div>
        )}

        {product.legal_copy && (
          <section className="mt-8 rounded-brand border border-line bg-surface p-4">
            <h2 className="eyebrow">Usage and safety</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted">{product.legal_copy}</p>
          </section>
        )}

        {product.sds_path && (
          <a href={sdsUrl(product.sds_path, product.swzzle_name)} className="btn btn-ghost mt-8" target="_blank" rel="noopener">
            Download SDS (PDF)
          </a>
        )}
      </div>
    </article>
  );
}
