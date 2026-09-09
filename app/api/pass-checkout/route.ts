import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { PASS_CATALOG, isPassSize } from "@/lib/passes";
import { createServerAuthClient } from "@/lib/supabaseServerAuth";

// POST { passSize }
// The pass counterpart of /api/checkout. Opens a Stripe Checkout Session for a
// 4, 6 or 10 session pass. Nothing is written to "passes" here — the row is
// created by the webhook once Stripe confirms the payment, so an abandoned
// checkout leaves no credits behind.
export async function POST(req: NextRequest) {
  try {
    // Passes belong to an account, so a session is required. getUser()
    // re-validates the token with Supabase rather than trusting the cookie.
    const {
      data: { user },
    } = await createServerAuthClient().auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please log in to buy a pass" }, { status: 401 });
    }

    const { passSize } = await req.json();
    if (!isPassSize(passSize)) {
      return NextResponse.json({ error: "Unknown pass size" }, { status: 400 });
    }

    const pass = PASS_CATALOG[passSize];
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: pass.currency,
            unit_amount: pass.priceAmount,
            product_data: {
              name: `${pass.sessions}-session pass`,
              description: "Lonesome Chair Club — credits for English speaking sessions",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/profile?pass=purchased`,
      cancel_url: `${siteUrl}/pricing?canceled=1`,
      // The webhook trusts these, not the browser: it reads back who bought
      // what straight from Stripe's copy of the session.
      metadata: {
        kind: "pass",
        passSize: String(pass.sessions),
        userId: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
