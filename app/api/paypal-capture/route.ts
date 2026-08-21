import { NextRequest, NextResponse } from "next/server";
import { getOrdersController, toPayPalAmount } from "@/lib/paypal";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// POST { orderId }
// Captures an approved PayPal order and flips paid = true, the same state the
// Stripe webhook sets. Stripe can trust a signed webhook; here the browser is
// the one telling us an order was approved, so nothing in the request body is
// taken at face value: the registration id and the amount both come back from
// PayPal's own capture response, and the amount is re-checked against the
// club's price before the row is marked paid.
export async function POST(req: NextRequest) {
  try {
    const ordersController = getOrdersController();
    if (!ordersController) {
      return NextResponse.json({ error: "PayPal is not configured" }, { status: 503 });
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const { result } = await ordersController.captureOrder({ id: orderId, body: {} });

    if (result.status !== "COMPLETED") {
      return NextResponse.json({ error: "Payment was not completed" }, { status: 402 });
    }

    const purchaseUnit = result.purchaseUnits?.[0];
    const registrationId = purchaseUnit?.customId;
    const capture = purchaseUnit?.payments?.captures?.[0];

    if (!registrationId || capture?.status !== "COMPLETED") {
      return NextResponse.json({ error: "Payment was not completed" }, { status: 402 });
    }

    const { data: reg, error: regError } = await supabaseAdmin
      .from("registrations")
      .select("id, access_token, clubs ( price_amount, currency )")
      .eq("id", registrationId)
      .single();

    if (regError || !reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    const club = Array.isArray(reg.clubs) ? reg.clubs[0] : reg.clubs;
    const expected = toPayPalAmount(club.price_amount, club.currency);

    if (capture.amount?.value !== expected.value || capture.amount?.currencyCode !== expected.currencyCode) {
      console.error("PayPal capture amount did not match the club price", {
        registrationId,
        expected,
        got: capture.amount,
      });
      return NextResponse.json({ error: "Payment amount did not match" }, { status: 409 });
    }

    const { error: updateError } = await supabaseAdmin
      .from("registrations")
      .update({ paid: true })
      .eq("id", reg.id);

    if (updateError) {
      console.error("Failed to mark registration as paid", updateError);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    // Same capability token the Stripe flow lands on: /success?token=...
    return NextResponse.json({ token: reg.access_token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
