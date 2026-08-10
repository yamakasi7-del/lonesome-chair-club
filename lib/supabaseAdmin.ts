import { createClient } from "@supabase/supabase-js";

// Server-only client. Uses the service role key, which bypasses RLS.
// Only ever import this inside app/api/** route handlers — never in a
// client component, or the key would end up in the browser bundle.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
