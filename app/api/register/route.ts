import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerAuthClient } from "@/lib/supabaseServerAuth";

// POST { clubId, name, email }
// Creates a "paid: false" registration row and returns its id + access_token.
// The access_token is a capability URL: whoever has it can check payment
// status and (once paid) see the Meet link for that one registration.
//
// If the request carries a valid Supabase session, the row is also stamped with
// that user's id so it shows up on their profile. Booking without an account
// still works exactly as before, leaving user_id null.
export async function POST(req: NextRequest) {
  try {
    const { clubId, name, email } = await req.json();

    if (!clubId || !name || !email) {
      return NextResponse.json({ error: "Missing clubId, name or email" }, { status: 400 });
    }

    const { data: club, error: clubError } = await supabaseAdmin
      .from("clubs")
      .select("id, capacity")
      .eq("id", clubId)
      .single();

    if (clubError || !club) {
      return NextResponse.json({ error: "Club not found" }, { status: 404 });
    }

    const { count } = await supabaseAdmin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("paid", true);

    if (club.capacity && (count ?? 0) >= club.capacity) {
      return NextResponse.json({ error: "This session is full" }, { status: 409 });
    }

    // getUser() re-validates the token with Supabase rather than trusting the
    // cookie, so a forged cookie can't attach someone else's bookings to an
    // account. A missing or invalid session is not an error here — it just
    // means this is a guest booking.
    let userId: string | null = null;
    try {
      const { data: userData } = await createServerAuthClient().auth.getUser();
      userId = userData.user?.id ?? null;
    } catch {
      userId = null;
    }

    const { data, error } = await supabaseAdmin
      .from("registrations")
      .insert({ club_id: clubId, name, email, user_id: userId })
      .select("id, access_token")
      .single();

    if (error) throw error;

    return NextResponse.json({ registrationId: data.id, accessToken: data.access_token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
