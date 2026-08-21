import { Client, Environment, OrdersController } from "@paypal/paypal-server-sdk";

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

// True only when both server-side keys are filled in. The register page reads
// the public client id instead — see RegisterForm.
export const paypalConfigured = Boolean(clientId && clientSecret);

// lib/stripe.ts builds its client at import time, which is fine because a
// missing key only ever breaks the API route that imports it, never a page.
// PayPal is built lazily for the same reason: with empty env vars this returns
// null and the route answers a clean 503 instead of throwing on import.
export function getOrdersController(): OrdersController | null {
  if (!clientId || !clientSecret) return null;

  const client = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: clientId,
      oAuthClientSecret: clientSecret,
    },
    // Sandbox unless PAYPAL_ENV is explicitly set to "production".
    environment: process.env.PAYPAL_ENV === "production" ? Environment.Production : Environment.Sandbox,
  });

  return new OrdersController(client);
}

// price_amount is stored in cents; PayPal wants a decimal string ("20.00")
// and an uppercase ISO currency code.
export function toPayPalAmount(priceAmount: number, currency: string) {
  return {
    currencyCode: currency.toUpperCase(),
    value: (priceAmount / 100).toFixed(2),
  };
}
