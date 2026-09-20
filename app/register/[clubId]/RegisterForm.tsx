"use client";

import { useEffect, useState } from "react";
import { createAuthClient } from "@/lib/supabaseAuthClient";
import { submitToPayPal } from "@/lib/paypalRedirect";

export default function RegisterForm({
  clubId,
  currency = "usd",
  priceAmount,
  paypalReady = false,
}: {
  clubId: string;
  currency?: string;
  priceAmount?: number;
  // Decided on the server, because the receiving PayPal account address is not
  // a public value and must not be inlined into the browser bundle.
  paypalReady?: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Credits the logged-in person can spend here. null while unknown, 0 when
  // signed out or out of credits — either way the form behaves as before.
  const [credits, setCredits] = useState<number | null>(null);
  const [useCredit, setUseCredit] = useState(false);

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

        // RLS limits this to the caller's own passes. A refunded pass keeps its
        // remaining credits on record but cannot be spent, so it is filtered
        // out here too — redeem_pass_credit() enforces the same rule in the
        // database, which is what actually guarantees it.
        const { data } = await supabase
          .from("passes")
          .select("credits_remaining")
          .eq("status", "active")
          .gt("credits_remaining", 0);
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
  const payingWithCredit = useCredit && hasCredits;
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

      // Paying with a credit never leaves the site.
      if (payingWithCredit) {
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

      const checkoutRes = await fetch("/api/checkout/paypal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkoutData.error || "Could not start checkout");

      // Leaves the page. The seat is not confirmed until PayPal notifies our
      // server over IPN, which is what /success waits for.
      submitToPayPal(checkoutData.action, checkoutData.fields);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const canSubmit = payingWithCredit || paypalReady;

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

      {error && (
        <p style={{ color: "#993C1D", fontSize: 14 }}>
          {error} — if this keeps happening, message us on{" "}
          <a href={process.env.NEXT_PUBLIC_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
            Telegram
          </a>{" "}
          and we'll sort it out.
        </p>
      )}

      {canSubmit ? (
        <button type="submit" className="btn btn-ochre" disabled={loading} style={{ marginTop: 6 }}>
          {payingWithCredit
            ? loading
              ? "Confirming your seat…"
              : "Use 1 credit and book"
            : loading
              ? "Redirecting to payment…"
              : "Continue to payment"}
        </button>
      ) : (
        <p style={{ fontSize: 14, color: "#875F3B", marginTop: 6 }}>
          Payment isn't available just now. Message us on{" "}
          <a href={process.env.NEXT_PUBLIC_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
            Telegram
          </a>{" "}
          and we'll reserve your seat for you.
        </p>
      )}

      {!payingWithCredit && paypalReady && (
        <p style={{ fontSize: 12.5, color: "#7A7666" }}>
          You'll be taken to PayPal to pay, and brought straight back here afterwards.
        </p>
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
