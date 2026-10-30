import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { getBySnapCode } from "@/lib/catalog";
import { money } from "@/lib/format";
import { imageUrl } from "@/lib/storage";

export const metadata = { title: "Swzzle Snap" };

export default function SnapPage({ params }: PageProps<"/snap/[code]">) {
  return (
    <section className="container-swz max-w-2xl py-12">
      <div className="eyebrow">Swzzle Snap</div>
      <Suspense fallback={<p className="mt-4 text-muted">Looking up code…</p>}>
        <SnapResult params={params} />
      </Suspense>
    </section>
  );
}

async function SnapResult({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const found = await getBySnapCode(code);

  if (!found) {
    return (
      <div className="mt-4">
        <h1 className="display text-4xl">Code not active</h1>
        <p className="mt-3 text-muted">
          Snap code <span className="font-mono text-fg">{code.toUpperCase()}</span> isn&apos;t linked to a current
          product. It may have been discontinued.
        </p>
        <Link href="/" className="btn btn-ghost mt-6">Browse products</Link>
      </div>
    );
  }

  const { product, variant, image } = found;
  const price = product.line === "consumer" ? variant.consumer_price : variant.mro_price ?? variant.consumer_price;

  return (
    <div className="mt-4 rounded-brand border border-line bg-surface p-6">
      <div className="flex gap-5">
        <div className="relative size-28 shrink-0 overflow-hidden rounded-brand bg-surface-2">
          {image && (
            <Image src={imageUrl(image.storage_path)} alt={image.alt || product.swzzle_name} fill sizes="112px" className="object-contain p-2" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold leading-tight">{product.swzzle_name}</h1>
          <p className="mt-1 text-lg">{variant.size_label}</p>
          <p className="mt-1 font-mono text-sm text-muted">
            {variant.sku} · {variant.snap_code}
          </p>
          {money(price) && <p className="mt-2 font-semibold">{money(price)}</p>}
        </div>
      </div>
      <div className="mt-6 rounded-brand border border-accent/50 bg-accent/10 p-4 text-center font-semibold text-accent">
        Reorder coming soon.
      </div>
      <Link href={`/products/${product.slug}`} className="btn btn-ghost mt-4">
        Product details and SDS
      </Link>
    </div>
  );
}
