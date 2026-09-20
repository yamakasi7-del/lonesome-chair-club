// PayPal Payments Standard — the classic HTML button flow.
//
// There are no API keys here and no REST calls. The buyer's browser POSTs a set
// of form fields to PayPal, pays there, and PayPal tells our server the outcome
// separately over IPN (Instant Payment Notification). That server-to-server
// message is the only thing we trust; the browser never reports its own success.
//
// This replaces lib/paypal.ts, which used the REST Orders API and needed a
// client id and secret. Payments Standard works with a personal PayPal account,
// which is the reason for the change: Stripe is not available in Georgia.

export type PayPalMode = "sandbox" | "live";

// Sandbox unless PAYPAL_MODE is explicitly "live". Defaulting to sandbox means a
// missing or fat-fingered value can never take real money by accident — the
// same direction lib/paypal.ts erred in with PAYPAL_ENV.
export function getPayPalMode(): PayPalMode {
  return process.env.PAYPAL_MODE === "live" ? "live" : "sandbox";
}

// Where the buyer's browser is POSTed to pay.
export function getCheckoutUrl(mode: PayPalMode = getPayPalMode()): string {
  return mode === "live"
    ? "https://www.paypal.com/cgi-bin/webscr"
    : "https://www.sandbox.paypal.com/cgi-bin/webscr";
}

// Where we post an IPN message back to have it verified. Note this is a
// different host from the checkout URL: ipnpb.*, not www.*. PayPal requires
// verification to go here, and posting to www. can silently misbehave.
export function getIpnVerifyUrl(mode: PayPalMode = getPayPalMode()): string {
  return mode === "live"
    ? "https://ipnpb.paypal.com/cgi-bin/webscr"
    : "https://ipnpb.sandbox.paypal.com/cgi-bin/webscr";
}

// The PayPal account that receives the money. Server-only and deliberately not
// NEXT_PUBLIC: it is checked against what PayPal reports on every IPN, so it
// should not be something a page can be tricked into echoing.
export function getReceiverEmail(): string | null {
  const email = process.env.PAYPAL_RECEIVER_EMAIL?.trim();
  return email ? email : null;
}

export function isPayPalConfigured(): boolean {
  return getReceiverEmail() !== null;
}

// Prices are stored as integer cents. PayPal wants a decimal string, and this
// builds it with integer arithmetic rather than dividing by 100, so no rounding
// error can ever appear in the amount a buyer is charged.
export function formatAmount(cents: number): string {
  const whole = Math.trunc(Math.abs(cents));
  const sign = cents < 0 ? "-" : "";
  return `${sign}${Math.floor(whole / 100)}.${String(whole % 100).padStart(2, "0")}`;
}

// What travels to PayPal in "custom" and comes back on the IPN.
//
// The brief specified a bare registration id. These are prefixed instead,
// because passes go through the same button flow and the IPN handler would
// otherwise be holding a UUID with no way of telling which table it belongs to
// — and guessing wrong on a payment is not a good failure mode. The prefix also
// makes the IPN log readable at a glance.
export type CustomRef =
  | { kind: "registration"; id: string }
  | { kind: "pass_order"; id: string };

export function encodeCustom(ref: CustomRef): string {
  return ref.kind === "registration" ? `reg:${ref.id}` : `pass:${ref.id}`;
}

export function decodeCustom(value: string | null | undefined): CustomRef | null {
  if (!value) return null;
  const trimmed = value.trim();

  if (trimmed.startsWith("reg:")) {
    const id = trimmed.slice(4);
    return id ? { kind: "registration", id } : null;
  }
  if (trimmed.startsWith("pass:")) {
    const id = trimmed.slice(5);
    return id ? { kind: "pass_order", id } : null;
  }
  return null;
}

// The fields of the HTML form the browser POSTs to PayPal. Returned by the
// checkout routes and submitted client-side; see PayPalCheckoutForm.
export type PayPalFormFields = Record<string, string>;

export function buildCheckoutFields(input: {
  receiverEmail: string;
  itemName: string;
  itemNumber: string;
  amountCents: number;
  currency: string;
  custom: string;
  invoice: string;
  siteUrl: string;
  returnPath: string;
  cancelPath: string;
}): PayPalFormFields {
  const base = input.siteUrl.replace(/\/$/, "");

  return {
    cmd: "_xclick",
    business: input.receiverEmail,
    // PayPal truncates item_name at 127 characters; do it here so what the
    // buyer sees on the PayPal page is what we intended, not a hard cut.
    item_name: input.itemName.slice(0, 127),
    item_number: input.itemNumber,
    amount: formatAmount(input.amountCents),
    currency_code: input.currency.toUpperCase(),
    custom: input.custom,
    // PayPal can be set to refuse a second payment carrying an invoice id it
    // has already seen, which is what stops someone paying twice for one seat.
    // That behaviour is an account setting, not a default — see the owner
    // checklist. The IPN handler does not rely on it.
    invoice: input.invoice,
    notify_url: `${base}/api/paypal/ipn`,
    return: `${base}${input.returnPath}`,
    cancel_return: `${base}${input.cancelPath}`,
    no_shipping: "1",
    no_note: "1",
    charset: "utf-8",
    // Return the buyer with a plain GET and no payment variables appended, so
    // payer details never land in the address bar, browser history or the
    // Vercel access logs.
    rm: "1",
  };
}
