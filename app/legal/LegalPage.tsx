import Link from "next/link";

// Shared chrome for the four legal pages, so they stay visually consistent
// with each other and with the rest of the site.

export const LAST_UPDATED = "9 September 2026";

const bodyColor = "#3A4B44";

export function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: bodyColor, fontSize: 16, marginTop: 14 }}>{children}</p>;
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: 24, marginTop: 40 }}>{children}</h2>;
}

export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul style={{ color: bodyColor, fontSize: 16, marginTop: 14, paddingLeft: 22, display: "grid", gap: 8 }}>
      {children}
    </ul>
  );
}

// The site has no contact form — Telegram is the contact channel used
// everywhere else (registration form, clubs page), so legal pages point there
// too. Swap this for a real contact page if one is ever added.
export function ContactLink({ children = "message us on Telegram" }: { children?: React.ReactNode }) {
  return (
    <a
      href={process.env.NEXT_PUBLIC_TELEGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "underline" }}
    >
      {children}
    </a>
  );
}

export function InternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{ textDecoration: "underline" }}>
      {children}
    </Link>
  );
}

// Shown at the top of every legal page. These are good-practice templates,
// not legal advice, and they say so where a reader will actually see it.
export function TemplateNotice() {
  return (
    <p
      style={{
        marginTop: 26,
        padding: "14px 16px",
        borderLeft: "3px solid var(--ochre)",
        background: "var(--cream)",
        color: "#4A4335",
        fontSize: 14.5,
      }}
    >
      This page is a good-practice template and not legal advice. It has not been reviewed by a lawyer.
    </p>
  );
}

export default function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <section style={{ background: "var(--ink)", color: "var(--cream)", padding: "64px 0 52px" }}>
        <div className="wrap" style={{ maxWidth: 640 }}>
          <span className="eyebrow" style={{ color: "var(--sage)" }}>Legal</span>
          <h1 style={{ fontSize: "clamp(28px,4.2vw,40px)", lineHeight: 1.15 }}>{title}</h1>
          <div style={{ width: 60, height: 3, background: "var(--sage)", margin: "20px 0 18px" }} />
          <p style={{ fontSize: 13.5, color: "#B9C4B4" }}>Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section style={{ padding: "56px 0 80px" }}>
        <div className="wrap" style={{ maxWidth: 640 }}>
          {intro && <p style={{ color: bodyColor, fontSize: 16 }}>{intro}</p>}
          <TemplateNotice />
          {children}
        </div>
      </section>
    </>
  );
}
