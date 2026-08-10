"use client";

import { useState } from "react";

export default function RegisterForm({ clubId }: { clubId: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const regRes = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId, name, email }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) throw new Error(regData.error || "Registration failed");

      const checkoutRes = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: regData.registrationId }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) throw new Error(checkoutData.error || "Could not start checkout");

      window.location.href = checkoutData.url;
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
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

      {error && (
        <p style={{ color: "#993C1D", fontSize: 14 }}>
          {error} — if this keeps happening, message us on{" "}
          <a href={process.env.NEXT_PUBLIC_TELEGRAM_URL} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>
            Telegram
          </a>{" "}
          and we'll sort it out.
        </p>
      )}

      <button type="submit" className="btn btn-ochre" disabled={loading} style={{ marginTop: 6 }}>
        {loading ? "Redirecting to payment…" : "Continue to payment"}
      </button>

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
