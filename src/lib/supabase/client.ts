import { createBrowserClient } from "@supabase/ssr";

/** Browser client for admin uploads straight to Storage (avoids the server action body limit). */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
