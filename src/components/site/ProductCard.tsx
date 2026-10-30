import Image from "next/image";
import Link from "next/link";
import type { ProductCard as Card } from "@/lib/catalog";
import { money } from "@/lib/format";
import { imageUrl } from "@/lib/storage";

export function ProductCard({ product, line }: { product: Card; line: "industrial" | "consumer" }) {
  const prices = product.variants
    .map((v) => (line === "industrial" ? v.mro_price : v.consumer_price))
    .filter((p): p is number => p !== null);
  const from = prices.length ? money(Math.min(...prices)) : null;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-brand border border-line bg-surface hover:border-accent"
    >
      <div className="relative aspect-square bg-surface-2">
        {product.image ? (
          <Image
            src={imageUrl(product.image.storage_path)}
            alt={product.image.alt || product.swzzle_name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-contain p-4"
          />
        ) : (
          <div className="display absolute inset-0 grid place-items-center text-5xl text-line">SWZ</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.category_name && <div className="eyebrow">{product.category_name}</div>}
        <h3 className="text-lg font-bold leading-tight group-hover:text-accent">{product.swzzle_name}</h3>
        {product.tagline && <p className="text-sm text-muted">{product.tagline}</p>}
        <div className="mt-auto pt-3 text-sm">
          {from ? (
            <span>
              from <strong>{from}</strong>
            </span>
          ) : (
            <span className="text-muted">Price on request</span>
          )}
          <span className="ml-2 text-muted">· {product.variants.length} size{product.variants.length === 1 ? "" : "s"}</span>
        </div>
      </div>
    </Link>
  );
}
