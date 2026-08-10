export default function HomePage() {
  return (
    <>
      <section style={{ background: "var(--ink)", color: "var(--cream)", padding: "88px 0 72px" }}>
        <div className="wrap" style={{ maxWidth: 640 }}>
          <span className="eyebrow" style={{ color: "var(--sage)" }}>An English speaking club for the curious</span>
          <h1 style={{ fontSize: "clamp(38px,6vw,58px)", lineHeight: 1.05 }}>Lonesome Chair Club</h1>
          <div style={{ width: 60, height: 3, background: "var(--sage)", margin: "22px 0" }} />
          <p style={{ fontSize: 18, color: "#E7E0CE", maxWidth: 480 }}>
            A place we talk about art, films, books, and theatre — in English, with people who are genuinely listening.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 28, flexWrap: "wrap" }}>
            <a className="btn btn-outline" href="/clubs" style={{ borderColor: "#B9C9B0", color: "var(--cream)" }}>See upcoming clubs</a>
          </div>
          <p style={{ marginTop: 24, fontSize: 13, color: "#B9C4B4" }}>
            Held live on Google Meet · English levels from B1 to C2
          </p>
        </div>
      </section>

      <section style={{ padding: "72px 0" }}>
        <div className="wrap" style={{ maxWidth: 640 }}>
          <span className="eyebrow">Share ideas, have fun, practice English</span>
          <h2 style={{ fontSize: 32, marginBottom: 18 }}>
            A conversation where we can share ideas, have fun, and practice English
          </h2>
          <p style={{ color: "#3A4B44", fontSize: 16 }}>
            Lonesome Chair Club is a place for those who love talking about art in all its shapes and forms.
            Here, we exchange opinions, challenge ideas, and share the bits and pieces of art — be it a painting,
            a building, or a theatre production — that touched something deep inside us and refused to let go.
          </p>
          <p style={{ color: "#3A4B44", fontSize: 16, marginTop: 16 }}>
            Every evening is built around one topic, real conversation, and a cozy atmosphere, giving you enough
            space to relax and find the right words to express what you really want to say, with a little help
            and guidance from the host.
          </p>
        </div>
      </section>

      <section style={{ background: "var(--teal)", color: "var(--cream)", padding: "72px 0" }}>
        <div className="wrap">
          <span className="eyebrow" style={{ color: "var(--sage)" }}>Simple, on purpose</span>
          <h2 style={{ color: "var(--cream)", fontSize: 30, marginBottom: 36 }}>How it works</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 28 }}>
            {[
              ["I", "Choose a session", "Pick the themed club that pulls you in most."],
              ["II", "Register & pay", "Reserve your seat and pay securely on the site."],
              [
                "III",
                "Join on Google Meet",
                "We meet in groups of no more than six people for a full hour of real conversation in English. All club materials are shared in advance.",
              ],
            ].map(([num, title, body]) => (
              <div key={num}>
                <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 30, color: "var(--sage)" }}>{num}</span>
                <h3 style={{ color: "var(--cream)", fontSize: 18, margin: "8px 0" }}>{title}</h3>
                <p style={{ color: "#E4EEE0", fontSize: 14.5 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--ochre)", color: "var(--cream)", padding: "80px 0", textAlign: "center" }}>
        <div className="wrap">
          <h2 style={{ color: "var(--cream)", fontSize: 32, maxWidth: 460, margin: "0 auto 16px" }}>
            Save your seat
          </h2>
          <p style={{ maxWidth: 480, margin: "0 auto", color: "#F3E5D3" }}>
            Seats are limited — make sure to book in advance. Once you register, we'll send you the topic, the
            materials for the club, the date, and the Google Meet link.
          </p>
          <a className="btn" href="/clubs" style={{ background: "var(--ink)", color: "var(--cream)", marginTop: 28, display: "inline-block" }}>
            Reserve your chair
          </a>
        </div>
      </section>
    </>
  );
}
