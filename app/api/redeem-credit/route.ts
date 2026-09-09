import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerAuthClient } from "@/lib/supabaseServerAuth";

// POST { registrationId }
// Pays for a registration with one credit from the caller's pass, instead of
// sending them to Stripe or PayPal. The decrement and the "paid" flag happen
// inside one guarded transaction in redeem_pass_credit(), so a credit can never
// be spent twice and never goes negative.
export async function POST(req: NextRequest) {
  try {
    const {
      data: { user },
    } = await createServerAuthClient().auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please log in to use a pass credit" }, { status: 401 });
    }

    const { registrationId } = await req.json();
    if (!registrationId) {
      return NextResponse.json({ error: "Missing registrationId" }, { status: 400 });
    }

    // user.id comes from the validated session, never from the request body,
    // so nobody can spend somebody else's credits.
    const { data, error } = await supabaseAdmin.rpc("redeem_pass_credit", {
      p_user_id: user.id,
      p_registration_id: registrationId,
    });

    if (error) {
      if (error.message.includes("no_credits")) {
        return NextResponse.json({ error: "You have no credits left on a pass" }, { status: 409 });
      }
      if (error.message.includes("registration_not_redeemable")) {
        return NextResponse.json(
          { error: "That booking can't be paid with a credit — it may already be paid." },
          { status: 409 }
        );
      }
      throw error;
    }

    const row = Array.isArray(data) ? data[0] : data;

    const { data: reg } = await supabaseAdmin
      .from("registrations")
      .select("access_token")
      .eq("id", registrationId)
      .single();

    return NextResponse.json({ creditsLeft: row?.credits_left ?? 0, token: reg?.access_token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
