"use client";

import { useEffect, useState } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { createAuthClient } from "@/lib/supabaseAuthClient";

type PaymentMethod = "stripe" | "paypal";

// Inlined at build time. Empty when PayPal isn't set up yet, which is what
// keeps the SDK script from loading at all — see the note by the radios.
const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;

export default function RegisterForm({
  clubId,
  currency = "usd",
  priceAmount,
}: {
  clubId: string;
  currency?: string;
  priceAmount?: number;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("stripe");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Credits the logged-in person can spend here. null while unknown, 0 when
  // signed out or out of credits — either way the form behaves as before.
  const [credits, setCredits] = useState<number | null>(null);
  const [useCredit, setUseCredit] = useState(false);

  const paypalReady = Boolean(paypalClientId);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const supabase = createAuthClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          if (active) setCredits(0);
          return;
        }

        // RLS limits this to the caller's own passes.
        const { data } = await supabase.from("passes").select("credits_remaining").gt("credits_remaining", 0);
        const total = (data ?? []).reduce((sum, p) => sum + (p.credits_remaining ?? 0), 0);
        if (active) {
          setCredits(total);
          setUseCredit(total > 0);
        }
      } catch {
        if (active) setCredits(0);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const hasCredits = (credits ?? 0) > 0;
  const priceLabel =
    typeof priceAmount === "number"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(
          priceAmount / 100
        )
      : "the session fee";

  // Both payment paths start the same way: a paid:false row plus its token.
  async function createRegistration(): Promise<string> {
    const regRes = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId, name, email }),
    });
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(regData.error || "Registration failed");
    return regData.registrationId;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const registrationId = await createRegistration();

      // Paying with a credit skips Stripe and PayPal entirely.
      if (useCredit && hasCredits) {
        const redeemRes = await fetch("/api/redeem-credit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationId }),
        });
        const redeemData = await redeemRes.json();
        if (!redeemRes.ok) throw new Error(redeemData.error || "Could not use your credit");

        window.location.href = `/success?token=${redeemData.token}`;
        return;
      }

      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkoutData.error || "Could not start checkout");

      window.location.href = checkoutData.url;
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // The PayPal buttons sit outside the <form>, so the browser's own "required"
  // check never runs for them — validate by hand before opening an order.
  function assertDetails() {
    if (!name.trim() || !email.trim()) {
      throw new Error("Please fill in your name and email first");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14, maxWidth: 420 }}>
      <div>
        <label htmlFor="name" style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
          Full name
        </label>
        <input
          id="name"
          className="field"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
        />
      </div>
      <div>
        <label htmlFor="email" style={{ fontSize: 13, fontWeight: 700, display: "block", marginBottom: 6 }}>
          Email
        </label>
        <input
          id="email"
          type="email"
          className="field"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
        />
      </div>

      {hasCredits && (
        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, padding: 0 }}>How to pay</legend>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, cursor: "pointer" }}>
              <input
                type="radio"
                name="settle"
                checked={useCredit}
                onChange={() => {
                  setUseCredit(true);
                  setError(null);
                }}
              />
              Use 1 credit from my pass ({credits} remaining)
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, cursor: "pointer" }}>
              <input
                type="radio"
                name="settle"
                checked={!useCredit}
                onChange={() => {
                  setUseCredit(false);
                  setError(null);
                }}
              />
              Pay {priceLabel} for this session
            </label>
          </div>
        </fieldset>
      )}

      <fieldset
        style={{ border: "none", padding: 0, margin: 0 }}
        hidden={useCredit && hasCredits}
      >
        <legend style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, padding: 0 }}>Payment method</legend>
        <div style={{ display: "flex", gap: 18 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, cursor: "pointer" }}>
            <input
              type="radio"
              name="method"
              value="stripe"
              checked={method === "stripe"}
              onChange={() => {
                setMethod("stripe");
                setError(null);
              }}
            />
            Card (Stripe)
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, cursor: "pointer" }}>
            <input
              type="radio"
              name="method"
              value="paypal"
              checked={method === "paypal"}
              onChange={() => {
                setMethod("paypal");
                setError(null);
              }}
            />
            PayPal
          </label>
        </div>
      </fieldset>

      {error && (
        <p style={{ color: "#993C1D", fontSize: 14 }}>
          {error} — if this keeps happening, message us on{" "}
          <a href={process.env.NEXT_PUBLIC_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
            Telegram
          </a>{" "}
          and we'll sort it out.
        </p>
      )}

      {(useCredit && hasCredits) || method === "stripe" ? (
        <button type="submit" className="btn btn-ochre" disabled={loading} style={{ marginTop: 6 }}>
          {useCredit && hasCredits
            ? loading
              ? "Confirming your seat…"
              : "Use 1 credit and book"
            : loading
              ? "Redirecting to payment…"
              : "Continue to payment"}
        </button>
      ) : null}

      {!useCredit && method === "paypal" && !paypalReady && (
        <p style={{ fontSize: 14, color: "#875F3B", marginTop: 6 }}>
          PayPal isn't set up yet — please choose Card (Stripe), or message us on Telegram below.
        </p>
      )}

      {!useCredit && method === "paypal" && paypalReady && (
        <div style={{ marginTop: 6 }}>
          <PayPalScriptProvider
            options={{ clientId: paypalClientId!, currency: currency.toUpperCase(), intent: "capture" }}
          >
            <PayPalButtons
              style={{ layout: "vertical", color: "gold", shape: "rect", label: "paypal" }}
              disabled={loading}
              createOrder={async () => {
                setError(null);
                assertDetails();

                const registrationId = await createRegistration();

                const orderRes = await fetch("/api/paypal-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ registrationId }),
                });
                const orderData = await orderRes.json();
                if (!orderRes.ok) throw new Error(orderData.error || "Could not start PayPal checkout");

                return orderData.orderId;
              }}
              onApprove={async (data) => {
                setLoading(true);

                const captureRes = await fetch("/api/paypal-capture", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId: data.orderID }),
                });
                const captureData = await captureRes.json();
                if (!captureRes.ok) {
                  setLoading(false);
                  throw new Error(captureData.error || "Could not confirm your PayPal payment");
                }

                window.location.href = `/success?token=${captureData.token}`;
              }}
              onError={(err: any) => {
                setError(err?.message || "PayPal couldn't complete the payment. Please try again.");
                setLoading(false);
              }}
            />
          </PayPalScriptProvider>
        </div>
      )}

      <p style={{ fontSize: 12.5, color: "#7A7666" }}>
        Payment didn't go through? Message us on{" "}
        <a href={process.env.NEXT_PUBLIC_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
          Telegram
        </a>{" "}
        and we'll get you sorted manually.
      </p>
    </form>
  );
}
