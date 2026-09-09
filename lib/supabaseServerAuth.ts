import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side counterpart of lib/supabaseAuthClient.ts: reads the session from
// cookies, so RLS applies as the logged-in user. Use it in route handlers and
// server components — never with the service role key, which bypasses RLS.
export function createServerAuthClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components can't set cookies. Safe to ignore: the session
            // is refreshed by route handlers, which can.
          }
        },
      },
    }
  );
}
