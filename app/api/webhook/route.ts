import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { PASS_CATALOG, isPassSize } from "@/lib/passes";
import Stripe from "stripe";

// Stripe calls this URL directly (not the browser), so it needs the raw
// request body to verify the signature. Configure this route's URL
// (https://your-site.vercel.app/api/webhook) in the Stripe dashboard,
// and put the signing secret it gives you into STRIPE_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    // Two kinds of checkout land here. The metadata comes back from Stripe's
    // own copy of the session, not from the browser, so it is safe to branch on.
    if (session.metadata?.kind === "pass") {
      const passSize = Number(session.metadata.passSize);
      const userId = session.metadata.userId;

      if (!isPassSize(passSize) || !userId) {
        // Nothing sensible to insert. Return 200 so Stripe stops retrying a
        // request that will never succeed, and leave a trace to look at.
        console.error("Pass checkout completed with unusable metadata", session.metadata);
        return NextResponse.json({ received: true, ignored: "bad pass metadata" });
      }

      const { error } = await supabaseAdmin.from("passes").insert({
        user_id: userId,
        pass_size: passSize,
        credits_remaining: passSize,
        price_paid_amount: PASS_CATALOG[passSize].priceAmount,
        stripe_session_id: session.id,
      });

      if (error) {
        // 23505 = unique violation on stripe_session_id, i.e. Stripe retried a
        // webhook we already handled. The pass exists; say so and stop.
        if (error.code === "23505") {
          return NextResponse.json({ received: true, duplicate: true });
        }
        console.error("Failed to create pass", error);
        return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
      }

      return NextResponse.json({ received: true });
    }

    const { error } = await supabaseAdmin
      .from("registrations")
      .update({ paid: true })
      .eq("stripe_session_id", session.id);

    if (error) {
      console.error("Failed to mark registration as paid", error);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
