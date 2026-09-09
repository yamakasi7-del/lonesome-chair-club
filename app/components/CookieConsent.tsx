"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cookie-consent";

export default function CookieConsent() {
  // Starts hidden and only appears after the effect confirms no stored choice.
  // Rendering it on the server would flash the banner at people who already
  // answered, since localStorage isn't readable until we're in the browser.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Private mode or blocked site data: skip the banner rather than show
      // one whose answer we'd be unable to remember.
    }
  }, []);

  function choose(value: "accepted" | "declined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Nothing to do — hide it for this page view at least.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        background: "var(--ink)",
        color: "var(--cream)",
        borderTop: "1px solid rgba(248,243,231,.18)",
        padding: "16px 0",
      }}
    >
      <div
        className="wrap"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <p style={{ fontSize: 14, maxWidth: 560, color: "var(--cream)" }}>
          We use a small amount of browser storage to remember this choice, and our payment providers set their
          own cookies when you pay. Read our{" "}
          <Link href="/legal/cookie-policy" style={{ textDecoration: "underline", color: "var(--cream)" }}>
            Cookie Policy
          </Link>
          .
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => choose("declined")}
            className="btn btn-outline"
            style={{ borderColor: "#7E9AA8", color: "var(--cream)", padding: "9px 18px", fontSize: 13 }}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="btn btn-ochre"
            style={{ padding: "9px 18px", fontSize: 13 }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
