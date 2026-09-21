import Link from "next/link";
import type { Metadata } from "next";
import ContactLink from "../components/ContactLink";
import BuyPassButton from "../components/BuyPassButton";
import { PASS_CATALOG, PASS_SIZES, SINGLE_SESSION_AMOUNT, dollars } from "@/lib/passes";

export const metadata: Metadata = {
  title: "Pricing — Lonesome Chair Club",
  description: "What a seat costs: single sessions, session passes, guided feedback, and private lessons.",
};

// Rendered from the same catalog /api/pass-checkout charges from, so the page
// cannot advertise one price while PayPal collects another.
const SINGLE_SESSION = dollars(SINGLE_SESSION_AMOUNT);

const PASSES = PASS_SIZES.map((size) => ({
  sessions: size,
  total: dollars(PASS_CATALOG[size].priceAmount),
  each: dollars(PASS_CATALOG[size].priceAmount) / size,
}));

const bodyColor = "#3A4B44";


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
                <BuyPassButton passSize={pass.sessions} />
              </div>
            ))}
          </div>

          <p style={{ color: bodyColor, fontSize: 15, marginTop: 20 }}>
            Passes are tied to your account, so you will be asked to log in first. Credits never expire mid-way
            through a booking: when you register for a session you can spend one credit instead of paying, and
            what is left shows on{" "}
            <Link href="/profile" style={{ textDecoration: "underline" }}>
              your profile
            </Link>
            . Any questions, <ContactLink />.
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
