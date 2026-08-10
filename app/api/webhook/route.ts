import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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
