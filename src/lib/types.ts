export const LINES = ["industrial", "consumer", "both"] as const;
export const STATUSES = ["draft", "live", "discontinued"] as const;
export type ProductLine = (typeof LINES)[number];
export type ProductStatus = (typeof STATUSES)[number];

export type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

/** Full row. Admin only: contains the internal Athea fields. */
export type Product = {
  id: string;
  slug: string;
  swzzle_name: string;
  tagline: string | null;
  description: string | null;
  category_id: string | null;
  line: ProductLine;
  status: ProductStatus;
  legal_copy: string | null;
  hazard_pictograms: string[];
  athea_product_name: string | null;
  athea_part_number: string | null;
  sds_path: string | null;
  created_at: string;
  updated_at: string;
};

export type Variant = {
  id: string;
  product_id: string;
  size_label: string;
  sku: string;
  mro_price: number | null;
  consumer_price: number | null;
  snap_code: string;
  sort_order: number;
};

export type ProductImage = {
  id: string;
  product_id: string;
  storage_path: string;
  alt: string;
  sort_order: number;
};

/** Row of the public_products view. No Athea fields exist here by construction. */
export type PublicProduct = {
  id: string;
  slug: string;
  swzzle_name: string;
  tagline: string | null;
  description: string | null;
  line: ProductLine;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  legal_copy: string | null;
  hazard_pictograms: string[];
  sds_path: string | null;
  updated_at: string;
};

export type PublicVariant = Omit<Variant, "mro_price" | "consumer_price"> & {
  mro_price: number | null;
  consumer_price: number | null;
};

export type PublicImage = ProductImage;
