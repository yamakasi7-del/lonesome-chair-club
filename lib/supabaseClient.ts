import { createClient } from "@supabase/supabase-js";

// Public, anon-key client. Only usable for what RLS allows anonymously —
// currently just reading published rows from the "clubs" table.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
