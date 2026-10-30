// Applies supabase/migrations (and supabase/seed.sql) to the database in SUPABASE_DB_URL.
// Usage: npm run db:push          migrations + seed
//        npm run db:push -- --dry-run
import { spawnSync } from "node:child_process";

try {
  process.loadEnvFile(".env.local");
} catch {
  // fall back to the real environment
}

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error("SUPABASE_DB_URL is not set. Add it to .env.local (Supabase > Connect > Session pooler URI).");
  process.exit(1);
}

const args = ["supabase", "db", "push", "--db-url", dbUrl, "--include-seed", "--yes", ...process.argv.slice(2)];
const result = spawnSync("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
