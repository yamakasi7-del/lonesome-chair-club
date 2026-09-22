import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  decodeCustom,
  getIpnVerifyUrl,
  getPayPalMode,
  getReceiverEmail,
  payPalConfigError,
  type PayPalMode,
} from "@/lib/paypalStandard";
import {
  buildVerificationBody,
  decideIpnOutcome,
  parseAmountToCents,
  type IpnFields,
  type IpnTarget,
} from "@/lib/paypalIpn";

// PayPal Instant Payment Notification. This is the only thing that can mark a
// seat as paid: PayPal posts here server-to-server, and the buyer's browser is
// never believed about its own payment.
//
// Needs the Node runtime for the raw body, and must never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERIFY_TIMEOUT_MS = 10_000;

type Verification = "VERIFIED" | "INVALID" | "ERROR";

/**
 * Ask PayPal whether it really sent this message.
 *
 * The body must go back exactly as it arrived — same fields, same order, same
 * encoding — with cmd=_notify-validate on the front. Re-serialising it (parsing
 * into an object and rebuilding the query string) is the classic way to break
 * this: it reorders fields and re-encodes characters, and PayPal answers
 * INVALID for a message that was perfectly genuine.
 */
async function verifyWithPayPal(rawBody: string, verifyUrl: string): Promise<Verification> {
  try {
    const res = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // PayPal asks for a descriptive agent and can be unfriendly without one.
        "User-Agent": "LonesomeChairClub-IPN/1.0 (+https://lonesomechairclub.vercel.app)",
      },
      body: buildVerificationBody(rawBody),
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!res.ok) return "ERROR";

    // Trailing whitespace only; the payload itself must be exactly VERIFIED.
    // "INVALID" and anything else are both treated as not verified.
    const text = (await res.text()).trim();
    if (text === "VERIFIED") return "VERIFIED";
    if (text === "INVALID") return "INVALID";
    return "ERROR";
  } catch {
    return "ERROR";
  }
}

// Loads the record this message refers to, mapped from "custom". Selects only
// what the decision needs — note there is no join to meet_link anywhere in this
// file, so it cannot end up in a log or an error.
async function loadRegistrationTarget(id: string): Promise<IpnTarget | null> {
  const { data, error } = await supabaseAdmin
    .from("registrations")
    .select("id, payment_status, paypal_txn_id, paid_amount, clubs ( price_amount, currency )")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  const club = Array.isArray(data.clubs) ? data.clubs[0] : data.clubs;
  if (!club) return null;

  return {
    kind: "registration",
    id: data.id,
    expectedAmountCents: club.price_amount,
    currency: club.currency,
    status: data.payment_status,
    paypalTxnId: data.paypal_txn_id,
    paidAmountCents:
      data.paid_amount === null || data.paid_amount === undefined
        ? null
        : parseAmountToCents(String(data.paid_amount)),
  };
}

async function loadPassOrderTarget(id: string): Promise<IpnTarget | null> {
  const { data, error } = await supabaseAdmin
    .from("pass_orders")
    .select("id, status, paypal_txn_id, paid_amount, price_amount, currency")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    kind: "pass_order",
    id: data.id,
    expectedAmountCents: data.price_amount,
    currency: data.currency,
    status: data.status,
    paypalTxnId: data.paypal_txn_id,
    paidAmountCents:
      data.paid_amount === null || data.paid_amount === undefined
        ? null
        : parseAmountToCents(String(data.paid_amount)),
  };
}

type FinishFn = (patch: Record<string, unknown>, status?: number) => Promise<NextResponse>;

/**
 * Apply an IPN to a pass purchase.
 *
 * The same decision function as bookings, so a pass gets exactly the same
 * protection: the amount is checked in integer cents against the price written
 * into pass_orders at checkout, the receiver must match, and a resent message
 * is a no-op.
 *
 * Granting is deliberately ordered pass-first, order-second. If the process
 * dies between the two, the buyer has the credits they paid for and a retried
 * IPN tidies the order up. The other way round would leave someone who has
 * paid with no credits, which is the worse failure.
 */
async function handlePassOrder(
  orderId: string,
  fields: IpnFields,
  ctx: { mode: PayPalMode; receiverEmail: string },
  base: Record<string, unknown>,
  finish: FinishFn
): Promise<NextResponse> {
  const target = await loadPassOrderTarget(orderId);
  if (!target) {
    return finish({ ...base, processing_result: "no_target", notes: "custom pointed at a pass order that does not exist." });
  }

  const outcome = decideIpnOutcome(fields, { ...ctx, target });
  const log = { ...base, pass_order_id: target.id };

  if (outcome.kind === "paid") {
    // 1. The credits. Unique pass_order_id means a resent message cannot grant
    //    a second pass, so 23505 here means "already granted" and is success.
    const { data: order } = await supabaseAdmin
      .from("pass_orders")
      .select("user_id, pass_size, price_amount")
      .eq("id", target.id)
      .single();

    if (!order) {
      return finish({ ...log, processing_result: "db_error", notes: "Could not read the pass order back." }, 500);
    }

    const { error: passError } = await supabaseAdmin.from("passes").insert({
      user_id: order.user_id,
      pass_size: order.pass_size,
      credits_remaining: order.pass_size,
      price_paid_amount: order.price_amount,
      pass_order_id: target.id,
    });

    if (passError && passError.code !== "23505") {
      console.error("IPN: failed to grant a pass", { orderId: target.id, code: passError.code });
      return finish({ ...log, processing_result: "db_error", notes: "Could not create the pass." }, 500);
    }

    // 2. The order. Conditional, so racing copies cannot both claim it.
    const { error: orderError } = await supabaseAdmin
      .from("pass_orders")
      .update({
        status: "paid",
        paypal_txn_id: outcome.txnId,
        paid_amount: outcome.amountCents / 100,
        paid_currency: outcome.currency,
        payer_email: outcome.payerEmail,
        paid_at: new Date().toISOString(),
      })
      .eq("id", target.id)
      .in("status", ["pending", "payment_review"]);

    if (orderError && orderError.code !== "23505") {
      console.error("IPN: pass granted but the order could not be marked paid", {
        orderId: target.id,
        code: orderError.code,
      });
      return finish(
        { ...log, processing_result: "db_error", notes: "Pass granted; the order could not be marked paid." },
        500
      );
    }

    return finish({
      ...log,
      processing_result: passError?.code === "23505" ? "duplicate" : "paid",
      notes: passError?.code === "23505" ? "Pass already granted for this order." : outcome.note,
    });
  }

  if (outcome.kind === "refunded") {
    // Agreed behaviour: the pass stops being spendable and is flagged, but its
    // remaining credits are left on record rather than deleted, and sessions
    // already booked with a credit are untouched.
    const { error: orderError } = await supabaseAdmin
      .from("pass_orders")
      .update({ status: "refunded" })
      .eq("id", target.id)
      .eq("status", "paid")
      .eq("paypal_txn_id", outcome.parentTxnId);

    const { error: passError } = await supabaseAdmin
      .from("passes")
      .update({
        status: "refunded",
        refunded_at: new Date().toISOString(),
        needs_review: true,
        review_note:
          "Pass refunded via PayPal. Remaining credits are blocked but not deleted; " +
          "sessions already booked with a credit are unaffected. Settle by hand.",
      })
      .eq("pass_order_id", target.id)
      .eq("status", "active");

    if (orderError || passError) {
      console.error("IPN: failed to record a pass refund", { orderId: target.id });
      return finish({ ...log, processing_result: "db_error", notes: "Could not apply the pass refund." }, 500);
    }

    return finish({
      ...log,
      processing_result: "refunded",
      notes: `NEEDS REVIEW: ${outcome.note} Remaining credits blocked, not deleted.`,
    });
  }

  if (outcome.kind === "restored") {
    const { error: orderError } = await supabaseAdmin
      .from("pass_orders")
      .update({ status: "paid" })
      .eq("id", target.id)
      .eq("status", "refunded")
      .eq("paypal_txn_id", outcome.parentTxnId);

    const { error: passError } = await supabaseAdmin
      .from("passes")
      .update({
        status: "active",
        refunded_at: null,
        needs_review: true,
        review_note: "Refund reversed in our favour; credits unblocked. Worth checking the balance is right.",
      })
      .eq("pass_order_id", target.id)
      .eq("status", "refunded");

    if (orderError || passError) {
      console.error("IPN: failed to restore a pass", { orderId: target.id });
      return finish({ ...log, processing_result: "db_error", notes: "Could not restore the pass." }, 500);
    }

    return finish({ ...log, processing_result: "restored", notes: `NEEDS REVIEW: ${outcome.note}` });
  }

  if (outcome.kind === "reverted") {
    const { error } = await supabaseAdmin
      .from("pass_orders")
      .update({ status: "pending" })
      .eq("id", target.id)
      .eq("status", "payment_review")
      .is("paypal_txn_id", null);

    if (error) {
      return finish({ ...log, processing_result: "db_error", notes: "Could not revert the pass order." }, 500);
    }
    return finish({
      ...log,
      processing_result: `reverted_to_pending:${outcome.reason}`,
      notes: outcome.note,
    });
  }

  if (outcome.kind === "review") {
    const { error } = await supabaseAdmin
      .from("pass_orders")
      .update({ status: "payment_review" })
      .eq("id", target.id)
      .in("status", ["pending", "payment_review"]);

    if (error) {
      return finish({ ...log, processing_result: "db_error", notes: "Could not flag the pass order." }, 500);
    }
    return finish({
      ...log,
      processing_result: `review:${outcome.reason}`,
      notes: outcome.needsReview ? `NEEDS REVIEW: ${outcome.note}` : outcome.note,
    });
  }

  return finish({
    ...log,
    processing_result: `ignored:${outcome.reason}`,
    notes: outcome.needsReview ? `NEEDS REVIEW: ${outcome.note}` : outcome.note,
  });
}

export async function POST(req: NextRequest) {
  // 1. The raw body, exactly as received, kept as a string and never rebuilt.
  const rawBody = await req.text();

  // 2. Logged before anything else is attempted, so a message survives even if
  //    verification throws or the process dies mid-handling. The row is opened
  //    as ERROR meaning "not yet established" and updated once we know more.
  let eventId: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from("paypal_ipn_events")
      .insert({
        raw_body: rawBody,
        verification_result: "ERROR",
        notes: "received; verification not yet attempted",
      })
      .select("id")
      .single();
    eventId = data?.id ?? null;
  } catch (err) {
    console.error("IPN: could not record the incoming message", err);
  }

  if (!eventId) {
    // We have not stored the message, so we must not silently swallow it.
    // A non-2xx makes PayPal retry, which is the only way to get it back.
    return new NextResponse(null, { status: 500 });
  }

  async function finish(
    patch: Record<string, unknown>,
    status: number = 200
  ): Promise<NextResponse> {
    try {
      await supabaseAdmin.from("paypal_ipn_events").update(patch).eq("id", eventId);
    } catch (err) {
      console.error("IPN: could not update the event log", err);
      return new NextResponse(null, { status: 500 });
    }
    // Empty body, as PayPal expects.
    return new NextResponse(null, { status });
  }

  const mode = getPayPalMode();
  const receiverEmail = getReceiverEmail();

  // 3. Verify. Only the exact string VERIFIED is accepted.
  const verification = await verifyWithPayPal(rawBody, getIpnVerifyUrl(mode));

  const fields: IpnFields = Object.fromEntries(new URLSearchParams(rawBody));
  const txnId = fields.txn_id?.trim() || null;
  const paymentStatus = fields.payment_status?.trim() || null;

  if (verification === "ERROR") {
    // We could not establish whether this is genuine. Returning non-2xx asks
    // PayPal to send it again rather than losing it. Safe because everything
    // below is idempotent. (Agreed departure from "always answer 200".)
    return finish(
      {
        verification_result: "ERROR",
        txn_id: txnId,
        payment_status: paymentStatus,
        processing_result: "verification_error",
        notes: "Could not reach PayPal to verify, or it answered unexpectedly. Asking for a retry.",
      },
      500
    );
  }

  if (verification === "INVALID") {
    // Someone posted something that PayPal does not recognise as its own.
    // Recorded and dropped; 200 so it is not retried at us forever.
    return finish({
      verification_result: "INVALID",
      txn_id: txnId,
      payment_status: paymentStatus,
      processing_result: "invalid",
      notes: "PayPal did not recognise this message. Nothing was changed.",
    });
  }

  // --- From here the message is genuinely PayPal's ------------------------
  const configError = payPalConfigError();
  if (configError || !receiverEmail) {
    return finish({
      verification_result: "VERIFIED",
      txn_id: txnId,
      payment_status: paymentStatus,
      processing_result: "not_configured",
      notes: `${configError ?? "PAYPAL_RECEIVER_EMAIL is not set"}, so this payment cannot be checked. Nothing was changed.`,
    });
  }

  const ref = decodeCustom(fields.custom);
  if (!ref) {
    return finish({
      verification_result: "VERIFIED",
      txn_id: txnId,
      payment_status: paymentStatus,
      processing_result: "no_target",
      notes: "custom did not carry a reference we recognise, so this payment matches no booking.",
    });
  }

  if (ref.kind === "pass_order") {
    return handlePassOrder(
      ref.id,
      fields,
      { mode, receiverEmail },
      { verification_result: "VERIFIED", txn_id: txnId, payment_status: paymentStatus },
      finish
    );
  }

  const target = await loadRegistrationTarget(ref.id);
  if (!target) {
    return finish({
      verification_result: "VERIFIED",
      txn_id: txnId,
      payment_status: paymentStatus,
      processing_result: "no_target",
      notes: "custom pointed at a booking that does not exist.",
    });
  }

  const outcome = decideIpnOutcome(fields, { mode, receiverEmail, target });

  const base = {
    verification_result: "VERIFIED" as const,
    txn_id: txnId,
    payment_status: paymentStatus,
    registration_id: target.id,
  };

  // 4. Apply. Every write is conditional on the status we expect to find, so
  //    two copies of the same message racing each other cannot both apply.
  if (outcome.kind === "paid") {
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .update({
        payment_status: "paid",
        payment_provider: "paypal",
        paypal_txn_id: outcome.txnId,
        paid_amount: outcome.amountCents / 100,
        paid_currency: outcome.currency,
        payer_email: outcome.payerEmail,
        paid_at: new Date().toISOString(),
      })
      .eq("id", target.id)
      .in("payment_status", ["pending", "payment_review"])
      .select("id");

    if (error) {
      // 23505: this txn_id is already recorded, i.e. a resent message that a
      // concurrent copy of this handler got to first. The payment is applied.
      if (error.code === "23505") {
        return finish({ ...base, processing_result: "duplicate", notes: "Already applied; nothing to do." });
      }
      console.error("IPN: failed to mark a booking paid", { txnId, code: error.code });
      return finish({ ...base, processing_result: "db_error", notes: "Could not apply the payment." }, 500);
    }

    if (!data || data.length === 0) {
      return finish({
        ...base,
        processing_result: "no_row_updated",
        notes: "Status changed underneath us; another copy of this message applied first.",
      });
    }

    return finish({ ...base, processing_result: "paid", notes: outcome.note });
  }

  if (outcome.kind === "refunded") {
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .update({ payment_status: "refunded" })
      .eq("id", target.id)
      .eq("payment_status", "paid")
      .eq("paypal_txn_id", outcome.parentTxnId)
      .select("id");

    if (error) {
      console.error("IPN: failed to record a refund", { txnId, code: error.code });
      return finish({ ...base, processing_result: "db_error", notes: "Could not apply the refund." }, 500);
    }
    if (!data || data.length === 0) {
      return finish({ ...base, processing_result: "no_row_updated", notes: "Already refunded, or no longer paid." });
    }
    return finish({ ...base, processing_result: "refunded", notes: outcome.note });
  }

  if (outcome.kind === "restored") {
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .update({ payment_status: "paid" })
      .eq("id", target.id)
      .eq("payment_status", "refunded")
      .eq("paypal_txn_id", outcome.parentTxnId)
      .select("id");

    if (error) {
      console.error("IPN: failed to restore a booking", { txnId, code: error.code });
      return finish({ ...base, processing_result: "db_error", notes: "Could not restore access." }, 500);
    }
    if (!data || data.length === 0) {
      return finish({ ...base, processing_result: "no_row_updated", notes: "No longer refunded; nothing restored." });
    }
    return finish({ ...base, processing_result: "restored", notes: outcome.note });
  }

  if (outcome.kind === "reverted") {
    // Conditional on still being in review with no payment recorded, so a pass
    // credit redeemed in the gap between deciding and writing cannot be undone
    // by this. The .is(null) is belt and braces on top of the status check.
    const { data, error } = await supabaseAdmin
      .from("registrations")
      .update({ payment_status: "pending" })
      .eq("id", target.id)
      .eq("payment_status", "payment_review")
      .is("paypal_txn_id", null)
      .select("id");

    if (error) {
      console.error("IPN: failed to hand a booking back to pending", { txnId, code: error.code });
      return finish({ ...base, processing_result: "db_error", notes: "Could not revert to pending." }, 500);
    }
    if (!data || data.length === 0) {
      return finish({
        ...base,
        processing_result: "no_row_updated",
        notes: "Not reverted: the booking was paid or changed while this was being handled.",
      });
    }
    return finish({
      ...base,
      processing_result: `reverted_to_pending:${outcome.reason}`,
      notes: outcome.note,
    });
  }

  if (outcome.kind === "review") {
    // Deliberately does not store paypal_txn_id: a payment that failed a check
    // must not consume the one unique slot, or a later genuine payment for the
    // same booking could never be applied.
    const { error } = await supabaseAdmin
      .from("registrations")
      .update({ payment_status: "payment_review" })
      .eq("id", target.id)
      .in("payment_status", ["pending", "payment_review"]);

    if (error) {
      console.error("IPN: failed to flag a booking for review", { txnId, code: error.code });
      return finish({ ...base, processing_result: "db_error", notes: "Could not flag for review." }, 500);
    }
    return finish({
      ...base,
      processing_result: `review:${outcome.reason}`,
      notes: outcome.needsReview ? `NEEDS REVIEW: ${outcome.note}` : outcome.note,
    });
  }

  // ignored: recorded, nothing changed.
  //
  // registrations has no needs_review column (only passes does), so anything
  // needing a human is marked in the log instead. That keeps it to one query:
  //   select * from paypal_ipn_events where notes like 'NEEDS REVIEW:%';
  return finish({
    ...base,
    processing_result: `ignored:${outcome.reason}`,
    notes: outcome.needsReview ? `NEEDS REVIEW: ${outcome.note}` : outcome.note,
  });
}
