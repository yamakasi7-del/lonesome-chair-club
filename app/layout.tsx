import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import NewsletterForm from "./components/NewsletterForm";
import CookieConsent from "./components/CookieConsent";

export const metadata: Metadata = {
  title: "Lonesome Chair Club — English Speaking Club",
  description: "A place we talk about art, films, books, and theatre — in English, live on Google Meet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header
          style={{
            borderBottom: "1px solid var(--paper-deep)",
            position: "sticky",
            top: 0,
            background: "rgba(245,239,225,.94)",
            backdropFilter: "blur(6px)",
            zIndex: 50,
          }}
        >
          <div
            className="wrap"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px" }}
          >
            <a href="/" style={{ fontFamily: "var(--serif)", fontSize: 19, fontWeight: 700, color: "var(--ink)", textDecoration: "none" }}>
              Lonesome <em style={{ color: "var(--ochre-deep)" }}>Chair</em> Club
            </a>
            <nav style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 14 }}>
              <a href="/clubs" style={{ textDecoration: "none" }}>Clubs</a>
              <a href="/about" style={{ textDecoration: "none" }}>About</a>
              <a href="/clubs" className="btn btn-ochre" style={{ padding: "9px 18px" }}>Reserve a seat</a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer style={{ background: "var(--ink-deep)", color: "#B9C4B4", padding: "36px 0" }}>
          <div className="wrap" style={{ fontSize: 13 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                gap: 32,
                alignItems: "start",
              }}
            >
              <div>
                <div style={{ fontFamily: "var(--serif)", color: "var(--cream)", fontSize: 17, marginBottom: 6 }}>
                  Lonesome Chair Club
                </div>
                <p>A place we talk about art, films, books, and theatre. Held live on Google Meet.</p>
                <a
                  href="#"
                  aria-label="Lonesome Chair Club on Instagram"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 14,
                    color: "#B9C4B4",
                    textDecoration: "none",
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
                  </svg>
                  Instagram
                </a>
              </div>

              <NewsletterForm />

              <nav aria-label="Legal">
                <div style={{ color: "var(--cream)", marginBottom: 10, fontWeight: 700 }}>Legal</div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 7 }}>
                  {[
                    ["/legal/privacy-policy", "Privacy Policy"],
                    ["/legal/cookie-policy", "Cookie Policy"],
                    ["/legal/refund-policy", "Refund Policy"],
                    ["/legal/terms-of-service", "Terms of Service"],
                  ].map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} style={{ textDecoration: "none" }}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            <p style={{ marginTop: 28 }}>© {new Date().getFullYear()} Lonesome Chair Club</p>
          </div>
        </footer>

        <CookieConsent />
      </body>
    </html>
  );
}
