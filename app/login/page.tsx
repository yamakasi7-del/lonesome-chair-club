"use client";

import { useState } from "react";
import { createAuthClient } from "@/lib/supabaseAuthClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createAuthClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // window.location.origin rather than NEXT_PUBLIC_SITE_URL: the link
          // should come back to wherever the person actually is, and that env
          // var isn't set in production.
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Could not send the link. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ padding: "72px 0 100px" }}>
      <div className="wrap" style={{ maxWidth: 460 }}>
        <span className="eyebrow">Your account</span>
        <h1 style={{ fontSize: 30, marginBottom: 16 }}>Log in</h1>

        {sent ? (
          <div className="card">
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>Check your email</h2>
            <p style={{ fontSize: 15, color: "#4A4335" }}>
              We sent a link to <strong>{email}</strong>. Open it on this device and you will be logged in — no
              password needed.
            </p>
            <p style={{ fontSize: 13.5, color: "#7A7666", marginTop: 12 }}>
              The link expires after a while. If it doesn&apos;t arrive, check your spam folder or{" "}
              <button
                type="button"
                onClick={() => setSent(false)}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  font: "inherit",
                  color: "inherit",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                try another address
              </button>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            <p style={{ color: "#3A4B44", fontSize: 15 }}>
              Enter your email and we will send you a link that logs you in. There is no password to remember.
            </p>

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
                autoComplete="email"
              />
            </div>

            {error && <p style={{ color: "#993C1D", fontSize: 14 }}>{error}</p>}

            <button type="submit" className="btn btn-ochre" disabled={loading}>
              {loading ? "Sending…" : "Send magic link"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
