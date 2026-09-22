import { NextRequest, NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createServerAuthClient } from "@/lib/supabaseServerAuth";

// Where the magic link lands. Establishes the session by setting auth cookies,
// then sends the person on to their profile.
//
// Supabase sends one of two shapes depending on the project's flow: a PKCE
// `code`, or a `token_hash` + `type`. Both are handled so this works either way.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/profile";

  // Supabase reports its own failures (expired or already-used link) here.
  const errorDescription = searchParams.get("error_description");
  if (errorDescription) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription)}`);
  }

  const supabase = await createServerAuthClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("That link is missing its login code.")}`);
}
