// The decision half of the IPN handler, kept free of I/O on purpose.
//
// Everything here is a pure function of (what PayPal said, what our record
// says). That means every branch that decides whether money unlocked a seat can
// be tested directly, without a database, a network or a PayPal account. The
// route in app/api/paypal/ipn does the talking; this decides what it means.
//
// Nothing in this file ever touches a Meet link. The handler has no reason to
// read one, so it never selects one, and it cannot leak one into a log.

import type { PayPalMode } from "./paypalStandard";

export type IpnFields = Record<string, string>;

// The body posted back to PayPal to have a message verified.
//
// This is string concatenation and nothing else, on purpose. The message must
// return exactly as it arrived: same fields, same order, same percent-encoding,
// same "+" for spaces. Parsing it into an object and rebuilding a query string
// would reorder and re-encode it, and PayPal answers INVALID for a genuine
// message that has been touched. The parsed copy used for decisions is made
// separately and never feeds back into this.
export function buildVerificationBody(rawBody: string): string {
  return `cmd=_notify-validate&${rawBody}`;
}

// What we already know about the thing being paid for, read from our own
// database — never from the message.
export type IpnTarget = {
  kind: "registration" | "pass_order";
  id: string;
  // The price we recorded when checkout started. The buyer never had a chance
  // to influence this figure.
  expectedAmountCents: number;
  currency: string;
  status: "pending" | "paid" | "payment_review" | "refunded";
  paypalTxnId: string | null;
  // What was actually taken, once a payment succeeded. Used to tell a full
  // refund from a partial one.
  paidAmountCents: number | null;
};

export type IpnContext = {
  mode: PayPalMode;
  receiverEmail: string;
  target: IpnTarget;
};

export type IpnOutcome =
  | {
      kind: "paid";
      txnId: string;
      amountCents: number;
      currency: string;
      payerEmail: string | null;
      note: string;
    }
  | { kind: "review"; reason: string; note: string; needsReview?: boolean }
  | { kind: "refunded"; parentTxnId: string; note: string }
  | { kind: "restored"; parentTxnId: string; note: string }
  // A payment that failed on PayPal's side. Puts the record back to pending so
  // the buyer can simply try again from the site.
  | { kind: "reverted"; reason: string; note: string }
  | { kind: "ignored"; reason: string; note: string; needsReview?: boolean };

// Statuses that mean "this payment attempt is over and no money moved".
const FAILED_STATUSES = new Set(["Denied", "Failed", "Expired", "Voided"]);

// PayPal sends money amounts as plain decimal strings ("20.00", "-20.00").
// Parsed into integer cents with string arithmetic: comparing prices as floats
// is how people end up letting a 19.999999 payment through.
//
// Anything that is not a plain decimal with at most two places returns null,
// which the caller treats as "do not trust this" rather than guessing. That
// deliberately includes comma decimal separators, which some account language
// settings can produce.
export function parseAmountToCents(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^-?\d{1,15}(\.\d{1,2})?$/.test(trimmed)) return null;

  const negative = trimmed.startsWith("-");
  const digits = negative ? trimmed.slice(1) : trimmed;
  const [whole, fraction = ""] = digits.split(".");
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2));

  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

// The receiving account, checked against receiver_email and primary_email only.
//
// "business" is deliberately NOT accepted. It is echoed back from the checkout
// form, which is plain HTML the buyer can edit before submitting, so treating
// it as proof of who was paid would defeat the check entirely. receiver_email
// is PayPal's own statement of which account received the money.
export function matchesReceiver(fields: IpnFields, configured: string): boolean {
  const wanted = configured.trim().toLowerCase();
  if (!wanted) return false;

  const candidates = [fields.receiver_email, fields.primary_email]
    .map((value) => value?.trim().toLowerCase())
    .filter((value): value is string => Boolean(value));

  if (candidates.length === 0) return false;
  return candidates.includes(wanted);
}

function review(reason: string, note: string, needsReview = false): IpnOutcome {
  return { kind: "review", reason, note, needsReview };
}

function ignored(reason: string, note: string, needsReview = false): IpnOutcome {
  return { kind: "ignored", reason, note, needsReview };
}

/**
 * Decide what an IPN message means for one record.
 *
 * Only ever called for a message PayPal has already confirmed as VERIFIED.
 * Verification proves the message is genuinely PayPal's; it says nothing about
 * whether the payment was for the right thing, to the right account, for the
 * right amount. That is what this does.
 */
export function decideIpnOutcome(fields: IpnFields, ctx: IpnContext): IpnOutcome {
  const { mode, receiverEmail, target } = ctx;

  const paymentStatus = (fields.payment_status ?? "").trim();
  const txnId = fields.txn_id?.trim() || null;
  const parentTxnId = fields.parent_txn_id?.trim() || null;

  // --- Mode sanity -------------------------------------------------------
  // A message flagged as a test must never move real money in live mode.
  // Logged and dropped, with no state change at all.
  if (fields.test_ipn === "1" && mode === "live") {
    return ignored(
      "test_ipn_in_live",
      "Message carried test_ipn=1 while PAYPAL_MODE is live. Ignored without changing anything."
    );
  }

  // The converse — a live message arriving at a sandbox deployment — is caught
  // two ways before reaching here, and a third below. Verification is posted to
  // the sandbox endpoint, which will not verify a live message; and sandbox and
  // live use different receiver addresses, so the receiver check fails. See the
  // receiver branch below, which reports exactly that case.

  // --- Who was paid ------------------------------------------------------
  const receiverOk = matchesReceiver(fields, receiverEmail);

  // --- Refunds, reversals and their cancellation -------------------------
  if (paymentStatus === "Refunded" || paymentStatus === "Reversed") {
    if (!parentTxnId) {
      return review("refund_without_parent", `${paymentStatus} message carried no parent_txn_id.`, true);
    }
    // The refund must point at the payment we actually recorded. Without this,
    // a refund of some unrelated transaction could revoke a paid seat.
    if (target.paypalTxnId && parentTxnId !== target.paypalTxnId) {
      return review(
        "refund_parent_mismatch",
        `${paymentStatus} parent_txn_id does not match the payment recorded against this record.`,
        true
      );
    }
    if (target.status !== "paid") {
      return ignored(
        "refund_for_unpaid_record",
        `${paymentStatus} arrived for a record with status ${target.status}. Nothing to withdraw.`,
        true
      );
    }

    const grossCents = parseAmountToCents(fields.mc_gross);
    if (grossCents === null) {
      return review("refund_unparsable_amount", `${paymentStatus} mc_gross could not be read as an amount.`, true);
    }
    // Refunds arrive as a negative gross. A positive one means we have
    // misunderstood the message, so do not act on it.
    if (grossCents >= 0) {
      return review("refund_not_negative", `${paymentStatus} mc_gross was not negative.`, true);
    }

    const refundedCents = -grossCents;
    const originalCents = target.paidAmountCents ?? target.expectedAmountCents;

    // A partial refund is a judgement call, not an automatic revocation: the
    // host may have refunded part of a session fee for a reason that should not
    // cost the buyer their seat. Flag it for a human instead of guessing.
    if (refundedCents < originalCents) {
      return review(
        "partial_refund",
        `Partial ${paymentStatus.toLowerCase()}: ${refundedCents} of ${originalCents} cents. Access left in place pending review.`,
        true
      );
    }
    if (refundedCents > originalCents) {
      return review(
        "over_refund",
        `${paymentStatus} of ${refundedCents} cents exceeds the ${originalCents} cents recorded as paid.`,
        true
      );
    }

    return {
      kind: "refunded",
      parentTxnId,
      note: `Full ${paymentStatus.toLowerCase()} of ${refundedCents} cents. Access withdrawn and the seat released.`,
    };
  }

  if (paymentStatus === "Canceled_Reversal") {
    if (!parentTxnId) {
      return review("restore_without_parent", "Canceled_Reversal carried no parent_txn_id.", true);
    }
    if (target.paypalTxnId && parentTxnId !== target.paypalTxnId) {
      return review(
        "restore_parent_mismatch",
        "Canceled_Reversal parent_txn_id does not match the payment recorded against this record.",
        true
      );
    }
    if (target.status !== "refunded") {
      return ignored(
        "restore_for_non_refunded",
        `Canceled_Reversal arrived for a record with status ${target.status}. Nothing to restore.`
      );
    }
    return {
      kind: "restored",
      parentTxnId,
      note: "Reversal cancelled in our favour. Access restored.",
    };
  }

  // --- A payment that is still on its way --------------------------------
  if (paymentStatus === "Pending") {
    // PayPal sends Pending and then Completed. Retries can arrive out of order,
    // so a late Pending must never pull a confirmed seat back.
    if (target.status === "paid") {
      return ignored(
        "late_pending_for_paid",
        "Pending arrived after this record was already paid. Ignored as an out-of-order delivery."
      );
    }
    const reason = fields.pending_reason?.trim() || "unspecified";
    return review(
      "pending",
      `PayPal reports the payment as pending (${reason}). Nothing unlocked until it completes.`
    );
  }

  // --- Completed ---------------------------------------------------------
  if (paymentStatus === "Completed") {
    // Every one of these must hold. Completed on its own unlocks nothing.
    if (!txnId) {
      return review("missing_txn_id", "Completed message carried no txn_id.", true);
    }
    if (!receiverOk) {
      return review(
        "receiver_mismatch",
        `Payment was not received by the configured account. This is also what a live message arriving at a ${mode} deployment looks like.`,
        true
      );
    }

    const grossCents = parseAmountToCents(fields.mc_gross);
    if (grossCents === null) {
      return review("unparsable_amount", "mc_gross could not be read as a plain decimal amount.", true);
    }
    if (grossCents !== target.expectedAmountCents) {
      return review(
        "amount_mismatch",
        `Paid ${grossCents} cents, expected ${target.expectedAmountCents}.`,
        true
      );
    }

    const currency = (fields.mc_currency ?? "").trim().toUpperCase();
    if (currency !== target.currency.trim().toUpperCase()) {
      return review(
        "currency_mismatch",
        `Paid in ${currency || "(none)"}, expected ${target.currency.toUpperCase()}.`,
        true
      );
    }

    // Everything checks out. Now: have we seen this payment before?
    if (target.status === "paid") {
      if (target.paypalTxnId === txnId) {
        // PayPal resends messages. This is the ordinary duplicate, and the
        // correct response is to do nothing and say so.
        return ignored("duplicate", "This payment has already been applied to this record.");
      }
      // A different transaction paying for something already paid for. Do not
      // touch the status — the buyer has their seat — but this needs refunding
      // by hand, so make it loud.
      return ignored(
        "second_payment_for_paid_record",
        `A second payment (${txnId}) arrived for a record already paid by ${target.paypalTxnId ?? "another method"}. Likely needs refunding.`,
        true
      );
    }

    if (target.status === "refunded") {
      return review(
        "payment_after_refund",
        `Payment ${txnId} arrived for a record that was already refunded.`,
        true
      );
    }

    return {
      kind: "paid",
      txnId,
      amountCents: grossCents,
      currency,
      payerEmail: fields.payer_email?.trim() || null,
      note: `Payment confirmed for ${grossCents} cents ${currency}.`,
    };
  }

  // --- A payment attempt that failed -------------------------------------
  // Denied, Failed, Expired, Voided. No money moved, and the attempt is over.
  //
  // Without this, an eCheque that goes Pending and then Denied would strand the
  // booking in payment_review forever: the checkout route refuses to start a
  // new checkout for anything that is not pending, so the buyer could not try
  // again without asking for help. Putting it back to pending makes the seat
  // bookable again from the site.
  if (FAILED_STATUSES.has(paymentStatus)) {
    // Never downgrade a seat that has been paid for. Between the Pending and
    // the Denied, the same person may well have paid another way -- a pass
    // credit is the likely one, and it sets payment_status to paid without any
    // PayPal transaction at all. Checking the status covers every route in.
    if (target.status === "paid") {
      return ignored(
        "failed_payment_for_paid_record",
        `PayPal reports ${paymentStatus} for an attempt on a booking that is already paid` +
          `${target.paypalTxnId ? ` (by PayPal payment ${target.paypalTxnId})` : " by another method, such as a pass credit"}` +
          `. Left paid.`,
        true
      );
    }
    if (target.status === "refunded") {
      return ignored(
        "failed_payment_for_refunded_record",
        `PayPal reports ${paymentStatus} for a booking that has been refunded. Left as refunded.`,
        true
      );
    }
    if (target.status === "pending") {
      return ignored(
        "failed_payment_already_pending",
        `PayPal reports ${paymentStatus}. The booking was already waiting to be paid, so nothing changed.`
      );
    }

    // payment_review, and nothing has been paid: hand the seat back.
    return {
      kind: "reverted",
      reason: paymentStatus,
      note:
        `PayPal reports ${paymentStatus}, so the payment attempt is over and no money moved. ` +
        `The booking is back to pending and can be paid again from the site.`,
    };
  }

  // --- Everything else ---------------------------------------------------
  // Processed, Created and anything PayPal adds later. Recorded, never acted on.
  return ignored(
    "unhandled_status",
    `payment_status "${paymentStatus || "(none)"}" is not acted on automatically. Left as ${target.status}.`
  );
}
