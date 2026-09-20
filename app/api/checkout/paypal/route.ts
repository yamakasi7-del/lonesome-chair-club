import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildCheckoutFields,
  encodeCustom,
  getCheckoutUrl,
  getReceiverEmail,
} from "@/lib/paypalStandard";

// POST { registrationId }
// The Payments Standard counterpart of the old /api/checkout. It does not talk
// to PayPal at all: it returns the fields for an HTML form that the browser
// POSTs to PayPal itself.
//
// Everything that decides what is charged is read from the database here. The
// form the buyer's browser submits is plain HTML and can be edited before it is
// sent, so nothing in it can be trusted on the way back either — the IPN
// handler re-checks the amount against this same club price before a seat is
// ever marked paid.
export async function POST(req: NextRequest) {
  try {
    const receiverEmail = getReceiverEmail();
    if (!receiverEmail) {
      // Mirrors how lib/paypal.ts answered when it had no credentials: a clean
      // 503 the form can explain, rather than an exception at import time.
      return NextResponse.json({ error: "PayPal is not configured" }, { status: 503 });
    }

    const { registrationId } = await req.json();
    if (!registrationId) {
      return NextResponse.json({ error: "Missing registrationId" }, { status: 400 });
    }

    const { data: reg, error: regError } = await supabaseAdmin
      .from("registrations")
      .select(
        "id, access_token, club_id, payment_status, clubs ( title, category, price_amount, currency )"
      )
      .eq("id", registrationId)
      .single();

    if (regError || !reg) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 });
    }

    // Only a booking that is still waiting to be paid can start a checkout.
    // Without this, a second tab could send someone to PayPal to pay again for
    // a seat already settled — by card, by pass credit, or by an earlier
    // payment still under review.
    if (reg.payment_status !== "pending") {
      return NextResponse.json(
        { error: "This booking has already been paid for", paymentStatus: reg.payment_status },
        { status: 409 }
      );
    }

    const club = Array.isArray(reg.clubs) ? reg.clubs[0] : reg.clubs;

    // Falls back to the request origin so a Vercel preview deployment points its
    // notify_url and return URL at itself. NEXT_PUBLIC_SITE_URL is set on the
    // production environment only, precisely so sandbox payments made on a
    // preview can never notify production.
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

    const fields = buildCheckoutFields({
      receiverEmail,
      itemName: `${club.category}: ${club.title}`,
      itemNumber: reg.club_id,
      amountCents: club.price_amount,
      currency: club.currency,
      custom: encodeCustom({ kind: "registration", id: reg.id }),
      // One invoice id per registration, so PayPal can refuse a duplicate
      // payment for the same seat if the account is set up to do so.
      invoice: reg.id,
      siteUrl,
      // The same capability-token URL the card flow landed on.
      returnPath: `/success?token=${reg.access_token}`,
      cancelPath: `/register/${reg.club_id}?canceled=1`,
    });

    return NextResponse.json({ action: getCheckoutUrl(), fields });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
