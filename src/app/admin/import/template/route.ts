import { readFile } from "node:fs/promises";
import path from "node:path";

// Serves docs/products-template.csv so there's one copy of the template. /admin is proxy-protected.
export async function GET() {
  const csv = await readFile(path.join(process.cwd(), "docs", "products-template.csv"), "utf8");
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="swzzle-products-template.csv"',
    },
  });
}
