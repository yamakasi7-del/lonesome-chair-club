import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createServerAuthClient } from "@/lib/supabaseServerAuth";
import { PASS_CATALOG, isPassSize } from "@/lib/passes";
import {
  buildCheckoutFields,
  encodeCustom,
  getCheckoutUrl,
  getReceiverEmail,
} from "@/lib/paypalStandard";

// POST { passSize }
// The Payments Standard counterpart of the old /api/pass-checkout.
//
// A pass_orders row is written here, before the buyer leaves, and its id is
// what travels to PayPal in "custom". That row is the record of what was meant
// to be bought and for how much: the button form is plain HTML and can be
// edited before it is submitted, so the amount PayPal reports is later checked
// against this figure rather than against anything the browser sent back.
//
// No pass is created here. Credits only exist once the IPN confirms the money
// arrived, so an abandoned checkout leaves nothing behind -- the same property
// the previous flow had, where a webhook created the pass.
export async function POST(req: NextRequest) {
  try {
    const receiverEmail = getReceiverEmail();
    if (!receiverEmail) {
      return NextResponse.json({ error: "PayPal is not configured" }, { status: 503 });
    }

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

    // Price comes from the catalogue, never from the request.
    const pass = PASS_CATALOG[passSize];

    const { data: order, error: orderError } = await supabaseAdmin
      .from("pass_orders")
      .insert({
        // From the validated session, so nobody can buy a pass onto someone
        // else's account.
        user_id: user.id,
        pass_size: pass.sessions,
        price_amount: pass.priceAmount,
        currency: pass.currency,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Could not open a pass order", orderError);
      return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

    const fields = buildCheckoutFields({
      receiverEmail,
      itemName: `${pass.sessions}-session pass`,
      itemNumber: `pass-${pass.sessions}`,
      amountCents: pass.priceAmount,
      currency: pass.currency,
      custom: encodeCustom({ kind: "pass_order", id: order.id }),
      invoice: order.id,
      siteUrl,
      returnPath: "/profile?pass=purchased",
      cancelPath: "/pricing?canceled=1",
    });

    return NextResponse.json({ action: getCheckoutUrl(), fields });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
