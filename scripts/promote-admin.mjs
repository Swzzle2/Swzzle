// Marks a signed-up user as admin. Usage: npm run admin:promote -- you@example.com
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  // fall back to the real environment
}

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email) {
  console.error("Usage: npm run admin:promote -- you@example.com");
  process.exit(1);
}
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from("profiles")
  .update({ is_admin: true })
  .eq("email", email) // Supabase Auth stores emails lowercased
  .select("email");

// Set exitCode rather than calling process.exit() after a fetch: on Windows, exiting with
// open sockets trips a libuv assertion.
if (error) {
  console.error("Failed:", error.message);
  process.exitCode = 1;
} else if (!data?.length) {
  console.error(`No profile for ${email}. Sign up at /signup first, then re-run.`);
  process.exitCode = 1;
} else {
  console.log(`${data[0].email} is now an admin.`);
}
