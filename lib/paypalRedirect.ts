import type { PayPalFormFields } from "./paypalStandard";

// Payments Standard sends the buyer to PayPal by POSTing a form, not by
// following a redirect URL, so there is no link to set window.location to. This
// builds that form from the fields the checkout route returned and submits it.
//
// The fields come from the server, which read the price out of the database. A
// determined buyer can still edit them in the browser before this submits —
// that is inherent to the flow, and it is why the IPN handler re-checks the
// amount, the currency and the receiving account before anything is marked paid.
export function submitToPayPal(action: string, fields: PayPalFormFields): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  // Matches charset=utf-8 in the fields, so a club title with an em dash or a
  // curly apostrophe reaches PayPal as written and comes back on the IPN the
  // same way.
  form.acceptCharset = "utf-8";
  form.style.display = "none";

  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
}
