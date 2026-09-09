import Link from "next/link";
import type { Metadata } from "next";
import ContactLink from "../components/ContactLink";

export const metadata: Metadata = {
  title: "Pricing — Lonesome Chair Club",
  description: "What a seat costs: single sessions, session passes, guided feedback, and private lessons.",
};

const SINGLE_SESSION = 20;

const PASSES = [
  { sessions: 4, total: 72, each: 18 },
  { sessions: 6, total: 102, each: 17 },
  { sessions: 10, total: 160, each: 16 },
];

const bodyColor = "#3A4B44";

// Passes have no checkout flow yet, so "Buy" opens Telegram with the pass
// already named — the fastest real path to paying for one today. Point this at
// a proper checkout route once passes can be bought on the site.
function buyPassHref(sessions: number, total: number) {
  const telegram = process.env.NEXT_PUBLIC_TELEGRAM_URL;
  if (!telegram) return undefined;
  const text = `Hi! I would like to buy the ${sessions}-session pass ($${total}).`;
  return `${telegram}${telegram.includes("?") ? "&" : "?"}text=${encodeURIComponent(text)}`;
}

function Price({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "var(--serif)", fontSize: 32, color: "var(--ink-deep)", margin: "4px 0 2px" }}>
      {children}
    </div>
  );
}

export default function PricingPage() {
  return (
    <>
      <section style={{ background: "var(--ink)", color: "var(--cream)", padding: "64px 0 52px" }}>
        <div className="wrap" style={{ maxWidth: 640 }}>
          <span className="eyebrow" style={{ color: "var(--sage)" }}>Pricing</span>
          <h1 style={{ fontSize: "clamp(28px,4.2vw,40px)", lineHeight: 1.15 }}>What a seat costs</h1>
          <div style={{ width: 60, height: 3, background: "var(--sage)", margin: "20px 0 18px" }} />
          <p style={{ color: "#E7E0CE", fontSize: 16 }}>
            Every session is an hour of live conversation on Google Meet, in a group of no more than six people.
            Materials are shared in advance and included in the price.
          </p>
        </div>
      </section>

      <section style={{ padding: "56px 0 24px" }}>
        <div className="wrap" style={{ maxWidth: 640 }}>
          <h2 style={{ fontSize: 24 }}>Single session</h2>
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <Price>${SINGLE_SESSION}</Price>
                <p style={{ fontSize: 14, color: "#4A4335" }}>One club, one seat. Pay as you go.</p>
              </div>
              <Link className="btn btn-ochre" href="/clubs" style={{ padding: "9px 18px", fontSize: 13 }}>
                See upcoming clubs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "32px 0 24px" }}>
        <div className="wrap" style={{ maxWidth: 640 }}>
          <h2 style={{ fontSize: 24 }}>Session passes</h2>
          <p style={{ color: bodyColor, fontSize: 16, marginTop: 12 }}>
            Booking several sessions at once brings the price of each one down.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
              gap: 18,
              marginTop: 20,
            }}
          >
            {PASSES.map((pass) => (
              <div key={pass.sessions} className="card">
                <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ochre-deep)" }}>
                  {pass.sessions} sessions
                </span>
                <Price>${pass.total}</Price>
                <p style={{ fontSize: 14, color: "#4A4335" }}>${pass.each} per session</p>
                <span className="tag" style={{ display: "inline-block", marginTop: 12 }}>
                  Save ${pass.sessions * SINGLE_SESSION - pass.total}
                </span>
                <a
                  className="btn btn-ochre"
                  href={buyPassHref(pass.sessions, pass.total)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "block", textAlign: "center", marginTop: 14, padding: "9px 14px", fontSize: 13 }}
                >
                  Buy this pass
                </a>
              </div>
            ))}
          </div>

          {/* Remove this note once passes can actually be bought on the site. */}
          <p
            style={{
              marginTop: 22,
              padding: "14px 16px",
              borderLeft: "3px solid var(--ochre)",
              background: "var(--cream)",
              color: "#4A4335",
              fontSize: 14.5,
            }}
          >
            <strong>Passes can&apos;t be checked out on the site yet.</strong> &ldquo;Buy this pass&rdquo;
            opens a message to us on Telegram with the pass already filled in, and we will arrange payment and
            set it up by hand. You can also just <Link href="/clubs" style={{ textDecoration: "underline" }}>register for individual sessions</Link>{" "}
            as they are announced, or <ContactLink /> with any question.
          </p>
        </div>
      </section>

      <section style={{ padding: "32px 0 24px" }}>
        <div className="wrap" style={{ maxWidth: 640 }}>
          <h2 style={{ fontSize: 24 }}>Guided feedback</h2>
          <div className="card" style={{ marginTop: 16 }}>
            <Price>+$10</Price>
            <p style={{ fontSize: 14, color: "#4A4335" }}>Per task.</p>
            <p style={{ fontSize: 15, color: "#4A4335", marginTop: 10 }}>
              An optional add-on to any session: send in a piece of written or spoken work and get detailed,
              personal feedback on it.
            </p>
          </div>
        </div>
      </section>

      <section style={{ padding: "32px 0 80px" }}>
        <div className="wrap" style={{ maxWidth: 640 }}>
          <h2 style={{ fontSize: 24 }}>Private lessons</h2>
          <div className="card" style={{ marginTop: 16 }}>
            <Price>$40</Price>
            <p style={{ fontSize: 14, color: "#4A4335" }}>Per hour, one-to-one.</p>
            <p style={{ fontSize: 15, color: "#4A4335", marginTop: 10 }}>
              One-on-one lessons built around what you want to work on. To ask about availability,{" "}
              <ContactLink />.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
