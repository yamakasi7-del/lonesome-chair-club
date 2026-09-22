import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side counterpart of lib/supabaseAuthClient.ts: reads the session from
// cookies, so RLS applies as the logged-in user. Use it in route handlers and
// server components — never with the service role key, which bypasses RLS.
//
// Async since Next 15, where cookies() returns a promise. The upgrade codemod
// offered an UnsafeUnwrappedCookies cast to keep this function synchronous;
// that is a deprecation shim which Next will remove, so it is awaited properly
// instead and the five call sites await this function.
export async function createServerAuthClient() {
  const cookieStore = await cookies();

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
