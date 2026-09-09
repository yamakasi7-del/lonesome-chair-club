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

        <footer style={{ background: "var(--ink-deep)", color: "#B9C4B4", padding: "36px 0 26px" }}>
          <div className="wrap" style={{ fontSize: 13 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                gap: 28,
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
                  className="social-link"
                  aria-label="Lonesome Chair Club on Instagram"
                  style={{ display: "inline-flex", alignItems: "center", gap: 10, marginTop: 16 }}
                >
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="url(#instagram-gradient)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                  >
                    {/* Instagram's brand gradient runs bottom-left to top-right:
                        warm yellow through orange and magenta into violet-blue. */}
                    <defs>
                      <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#FEDA75" />
                        <stop offset="25%" stopColor="#FA7E1E" />
                        <stop offset="50%" stopColor="#D62976" />
                        <stop offset="75%" stopColor="#962FBF" />
                        <stop offset="100%" stopColor="#4F5BD5" />
                      </linearGradient>
                    </defs>
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="1.2" fill="url(#instagram-gradient)" stroke="none" />
                  </svg>
                  Instagram
                </a>
              </div>

              <NewsletterForm />
            </div>

            {/* Legal row and copyright share one line on desktop and stack on
                narrow screens, so the footer keeps no empty column. */}
            <div
              style={{
                marginTop: 26,
                paddingTop: 18,
                borderTop: "1px solid rgba(248,243,231,.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px 24px",
                flexWrap: "wrap",
              }}
            >
              <nav
                aria-label="Legal"
                // Flex, because adjacent JSX elements carry no whitespace
                // between them and so offer no inline wrap opportunity — the
                // row would otherwise break inside a label instead.
                style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 9px" }}
              >
                {[
                  ["/legal/privacy-policy", "Privacy Policy"],
                  ["/legal/cookie-policy", "Cookie Policy"],
                  ["/legal/refund-policy", "Refund Policy"],
                  ["/legal/terms-of-service", "Terms of Service"],
                ].map(([href, label], i, all) => (
                  // Label + its trailing separator stay glued together, so a
                  // wrap never splits "Refund Policy" or starts a line with a
                  // stray middot.
                  <span key={href} style={{ whiteSpace: "nowrap" }}>
                    <Link href={href} className="footer-link">
                      {label}
                    </Link>
                    {i < all.length - 1 && (
                      <span aria-hidden="true" style={{ marginLeft: 9, opacity: 0.45 }}>
                        ·
                      </span>
                    )}
                  </span>
                ))}
              </nav>

              <p>© {new Date().getFullYear()} Lonesome Chair Club</p>
            </div>
          </div>
        </footer>

        <CookieConsent />
      </body>
    </html>
  );
}
