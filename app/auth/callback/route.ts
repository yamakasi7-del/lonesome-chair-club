import { NextRequest, NextResponse } from "next/server";
import { type EmailOtpType, type User } from "@supabase/supabase-js";
import { createServerAuthClient } from "@/lib/supabaseServerAuth";
import { linkGuestBookings } from "@/lib/linkGuestBookings";

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

  // Signing in is the moment Supabase has just proved this person controls the
  // mailbox, which is what makes it safe to hand them bookings made with that
  // address while signed out. Deliberately not allowed to fail the sign-in:
  // linkGuestBookings swallows its own errors, and the next sign-in retries.
  async function finishSignIn(user: User | null) {
    if (user) await linkGuestBookings(user.id, user.email);
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return finishSignIn(data.user);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return finishSignIn(data.user);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("That link is missing its login code.")}`);
}
