import { supabaseUrl } from "@/lib/env";

export const IMAGES_BUCKET = "product-images";
export const SDS_BUCKET = "sds";

// Both buckets are public, so URLs are built directly without a round trip.
export function publicFileUrl(bucket: string, path: string, downloadAs?: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const url = `${supabaseUrl()}/storage/v1/object/public/${bucket}/${encoded}`;
  return downloadAs ? `${url}?download=${encodeURIComponent(downloadAs)}` : url;
}

export const imageUrl = (path: string) => publicFileUrl(IMAGES_BUCKET, path);
export const sdsUrl = (path: string, productName?: string) =>
  publicFileUrl(SDS_BUCKET, path, productName ? `${productName} SDS.pdf` : undefined);
