export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function money(value: number | string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? usd.format(n) : null;
}

/** Parses "12", "$12.50", "1,200.00". Blank means null. Returns NaN for junk. */
export function parsePrice(raw: string | null | undefined): number | null {
  const s = (raw ?? "").trim().replace(/[$,\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}
