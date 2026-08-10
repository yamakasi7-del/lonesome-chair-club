"use client";

import { useEffect, useState } from "react";

type Status = {
  paid: boolean;
  name: string;
  club: { title: string; category: string; date: string; time: string; meetLink: string | null };
};

export default function StatusPanel({ token }: { token: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/registration-status?token=${token}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (cancelled) return;
        setStatus(data);

        // Stripe webhooks usually land in a second or two. Keep checking
        // for up to ~30s in case it's still catching up.
        if (!data.paid && attempts < 15) {
          setTimeout(() => setAttempts((a) => a + 1), 2000);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempts]);

  if (error) {
    return (
      <p style={{ color: "#993C1D" }}>
        We couldn't find that registration. If you just paid, message us on{" "}
        <a href={process.env.NEXT_PUBLIC_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">Telegram</a>{" "}
        with your confirmation and we'll sort it out.
      </p>
    );
  }

  if (!status) {
    return <p>Checking your payment…</p>;
  }

  if (!status.paid) {
    return (
      <div>
        <p>Almost there — confirming your payment. This usually takes a few seconds.</p>
        <p style={{ marginTop: 16, fontSize: 13.5, color: "#7A7666" }}>
          Taking longer than expected? Message us on{" "}
          <a href={process.env.NEXT_PUBLIC_TELEGRAM_URL} target="_blank" rel="noopener noreferrer">Telegram</a>{" "}
          and we'll confirm your seat manually.
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
