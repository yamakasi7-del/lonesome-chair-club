"use client";

import { useState } from "react";

// Sends the buyer to Stripe Checkout for a pass. Passes belong to an account,
// so a signed-out visitor is sent to log in first rather than shown an error.
export default function BuyPassButton({ passSize }: { passSize: number }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function buy() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/pass-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passSize }),
      });

      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/pricing")}`;
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout");

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={buy}
        disabled={loading}
        className="btn btn-ochre"
        style={{ display: "block", width: "100%", marginTop: 14, padding: "9px 14px", fontSize: 13 }}
      >
        {loading ? "Opening checkout…" : "Buy this pass"}
      </button>
      {error && <p style={{ fontSize: 13, color: "#993C1D", marginTop: 8 }}>{error}</p>}
    </>
  );
}
