import "./globals.css";
import type { Metadata } from "next";

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
            <nav style={{ display: "flex", gap: 20, fontSize: 14 }}>
              <a href="/clubs" style={{ textDecoration: "none" }}>Clubs</a>
              <a href="/clubs" className="btn btn-ochre" style={{ padding: "9px 18px" }}>Reserve a seat</a>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer style={{ background: "var(--ink-deep)", color: "#B9C4B4", padding: "36px 0", marginTop: 60 }}>
          <div className="wrap" style={{ fontSize: 13 }}>
            <div style={{ fontFamily: "var(--serif)", color: "var(--cream)", fontSize: 17, marginBottom: 6 }}>
              Lonesome Chair Club
            </div>
            <p>A place we talk about art, films, books, and theatre. Held live on Google Meet.</p>
            <p style={{ marginTop: 12 }}>© {new Date().getFullYear()} Lonesome Chair Club</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
