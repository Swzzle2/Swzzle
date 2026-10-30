function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

// NEXT_PUBLIC_ vars must be read with literal property access so Next can inline them in the browser bundle.
export const supabaseUrl = () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
export const supabaseAnonKey = () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Snap QR codes encode this. Defaults to production so labels printed from a local admin still work.
export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://swzzle.com").replace(/\/+$/, "");
