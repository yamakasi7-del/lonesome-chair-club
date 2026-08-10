import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// POST { registrationId }
// Looks up the registration + its club, creates a Stripe Checkout Session,
// stores the session id on the registration, and returns the checkout URL.
export async function POST(req: NextRequest) {
  try {
    const { registrationId } = await req.json();
    if (!registrationId) {
      return NextResponse.json({ error: "Missing registrationId" }, { status: 400 });
    }

    const { data: reg, error: regError } = await supabaseAdmin
      .from("registrations")
      .select("id, access_token, email, club_id, clubs ( title, category, price_amount, currency )")
      .eq("id", registrationId)
      .single();

    if (regError || !reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const club = Array.isArray(reg.clubs) ? reg.clubs[0] : reg.clubs;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: reg.email,
      line_items: [
        {
          price_data: {
            currency: club.currency,
            unit_amount: club.price_amount,
            product_data: {
              name: `${club.category}: ${club.title}`,
              description: "Lonesome Chair Club — English speaking session",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/success?token=${reg.access_token}`,
      cancel_url: `${siteUrl}/register/${reg.club_id}?canceled=1`,
      metadata: { registrationId: reg.id },
    });

    await supabaseAdmin
      .from("registrations")
      .update({ stripe_session_id: session.id })
      .eq("id", registrationId);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
