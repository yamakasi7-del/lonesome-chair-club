import { NextRequest, NextResponse } from "next/server";
import { CheckoutPaymentIntent } from "@paypal/paypal-server-sdk";
import { getOrdersController, toPayPalAmount } from "@/lib/paypal";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// POST { registrationId }
// The PayPal counterpart of /api/checkout: looks up the registration + its
// club and opens a PayPal order for that club's price. The registration id is
// stamped on the purchase unit as custom_id, which is how /api/paypal-capture
// finds its way back to the row without trusting anything from the browser.
export async function POST(req: NextRequest) {
  try {
    const ordersController = getOrdersController();
    if (!ordersController) {
      return NextResponse.json({ error: "PayPal is not configured" }, { status: 503 });
    }

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

    const { result } = await ordersController.createOrder({
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [
          {
            amount: toPayPalAmount(club.price_amount, club.currency),
            description: `${club.category}: ${club.title}`.slice(0, 127),
            customId: reg.id,
          },
        ],
      },
    });

    if (!result.id) {
      return NextResponse.json({ error: "Could not start PayPal checkout" }, { status: 502 });
    }

    return NextResponse.json({ orderId: result.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
