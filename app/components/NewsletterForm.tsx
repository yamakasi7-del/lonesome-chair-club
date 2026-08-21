"use client";

import { useState } from "react";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "done"; message: string } | { kind: "error"; message: string };

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ kind: "sending" });

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not subscribe");

      setState({
        kind: "done",
        message: data.alreadySubscribed ? "You're already on the list!" : "Thanks, you're subscribed!",
      });
      setEmail("");
    } catch (err: any) {
      setState({ kind: "error", message: err.message || "Something went wrong. Please try again." });
    }
  }

  // Once it's done there's nothing left to do here — swap the form for the
  // confirmation rather than leaving an input inviting a second submit.
  if (state.kind === "done") {
    return (
      <p style={{ fontSize: 14, color: "var(--sage)", margin: 0 }} role="status">
        {state.message}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 8, maxWidth: 340 }}>
      <label htmlFor="newsletter-email" style={{ fontSize: 13, color: "#B9C4B4" }}>
        Be the first to know about new clubs
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          disabled={state.kind === "sending"}
          style={{
            flex: "1 1 180px",
            minWidth: 0,
            padding: "9px 12px",
            borderRadius: 6,
            border: "1px solid #3D5B6B",
            background: "#12303D",
            color: "var(--cream)",
            fontSize: 14,
            fontFamily: "var(--sans)",
          }}
        />
        <button
          type="submit"
          className="btn btn-ochre"
          disabled={state.kind === "sending"}
          style={{ padding: "9px 18px", fontSize: 13 }}
        >
          {state.kind === "sending" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>

      {state.kind === "error" && (
        <p style={{ fontSize: 13, color: "#E9A88A", margin: 0 }} role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
