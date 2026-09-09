"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser client for Supabase Auth. Separate from lib/supabaseClient.ts, which
// is a plain read-only anon client used for public club listings and holds no
// session. This one persists the session in cookies (not localStorage) so that
// route handlers and server components can read it too.
export function createAuthClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
