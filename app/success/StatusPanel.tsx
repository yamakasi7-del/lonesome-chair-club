"use client";

import { useEffect, useState } from "react";

type PaymentStatus = "pending" | "paid" | "payment_review" | "refunded";

type Status = {
  paid: boolean;
  paymentStatus: PaymentStatus;
  name: string;
  club: { title: string; category: string; date: string; time: string; meetLink: string | null };
};

// PayPal sends the buyer back here as soon as they have paid, but the message
// that actually confirms the payment arrives separately, server to server. It
// is usually a second or two behind; it can occasionally be longer. So the page
// waits, rather than telling someone who has just paid that nothing happened.
const POLL_INTERVAL_MS = 2000;
const POLL_LIMIT_MS = 60000;

function TelegramLink() {
  return (
    <a href={process.env.NEXT_PUBLIC_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">
      Telegram
    </a>
  );
}

export default function StatusPanel({ token }: { token: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState(false);
  const [stillWaiting, setStillWaiting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    async function poll() {
      try {
        const res = await fetch(`/api/registration-status?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("not found");

        const data: Status = await res.json();
        if (cancelled) return;
        setStatus(data);

        // Paid and refunded are settled as far as this page is concerned.
        if (data.paymentStatus === "paid" || data.paymentStatus === "refunded") return;

        if (Date.now() - startedAt >= POLL_LIMIT_MS) {
          setStillWaiting(true);
          return;
        }

        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [token]);

  if (error) {
    return (
      <p style={{ color: "#993C1D" }}>
        We couldn't find that registration. If you just paid, message us on <TelegramLink />{" "}
        with your confirmation and we'll sort it out.
      </p>
    );
  }

  if (!status) {
    return <p>Checking your payment…</p>;
  }

  if (status.paymentStatus === "refunded") {
    return (
      <div>
        <p>This booking has been refunded, so the meeting link is no longer available.</p>
        <p style={{ marginTop: 16, fontSize: 13.5, color: "#7A7666" }}>
          If that isn't what you were expecting, message us on <TelegramLink /> and we'll look into it.
        </p>
      </div>
    );
  }

  if (status.paymentStatus === "payment_review") {
    return (
      <div>
        <p>We're checking this payment by hand before confirming your seat.</p>
        <p style={{ marginTop: 16, fontSize: 13.5, color: "#7A7666" }}>
          Nothing is lost — message us on <TelegramLink /> and we'll finish it off with you.
        </p>
      </div>
    );
  }

  if (!status.paid) {
    // Still pending. The first minute gets the reassuring message; after that,
    // something is genuinely slow and saying so is more honest than a spinner.
    return stillWaiting ? (
      <div>
        <p>We haven't had confirmation from PayPal yet. Your payment may still be going through.</p>
        <p style={{ marginTop: 16, fontSize: 13.5, color: "#7A7666" }}>
          Refreshing this page will show your seat as soon as it's confirmed. If nothing changes in a
          few minutes, message us on <TelegramLink /> and we'll confirm it for you.
        </p>
      </div>
    ) : (
      <div>
        <p>Almost there — confirming your payment. This usually takes a few seconds.</p>
        <p style={{ marginTop: 16, fontSize: 13.5, color: "#7A7666" }}>
          Taking longer than expected? Message us on <TelegramLink /> and we'll confirm your seat
          manually.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <span className="eyebrow" style={{ marginBottom: 6 }}>{status.club.category}</span>
      <h3 style={{ fontSize: 20, marginBottom: 8 }}>{status.club.title}</h3>
      <p style={{ fontSize: 14, color: "#4A4335", marginBottom: 20 }}>
        {new Date(status.club.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        {" · "}{status.club.time}
      </p>
      <a className="btn btn-ochre" href={status.club.meetLink ?? "#"} target="_blank" rel="noopener noreferrer">
        Join on Google Meet
      </a>
      <p style={{ marginTop: 14, fontSize: 13, color: "#7A7666" }}>
        We've saved your seat, {status.name}. This link goes live a few minutes before the session starts.
      </p>
    </div>
  );
}
