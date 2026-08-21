import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Lonesome Chair Club",
  description: "Meet Anna, the host of Lonesome Chair Club.",
};

export default function AboutPage() {
  return (
    <>
      <section style={{ background: "var(--ink)", color: "var(--cream)", padding: "80px 0 64px" }}>
        <div className="wrap" style={{ maxWidth: 640 }}>
          <span className="eyebrow" style={{ color: "var(--sage)" }}>About</span>
          <h1 style={{ fontSize: "clamp(30px,4.6vw,44px)", lineHeight: 1.15 }}>
            Hi! I'm Anna. Welcome to Lonesome Chair Club.
          </h1>
          <div style={{ width: 60, height: 3, background: "var(--sage)", margin: "22px 0 0" }} />
        </div>
      </section>

      <section style={{ padding: "72px 0 80px" }}>
        <div className="wrap" style={{ maxWidth: 640 }}>
          <p style={{ color: "#3A4B44", fontSize: 16 }}>
            I've always been passionate about language learning and positively allergic to textbooks. Alongside
            teaching English, which I've been doing for over a decade, I'm also a theatre coach and stage director.
          </p>
          <p style={{ color: "#3A4B44", fontSize: 16, marginTop: 16 }}>
            Language may be one of the greatest gifts we share as human beings. It is how we connect, exchange
            ideas, tell stories, and find the words for what genuinely matters to us. Speaking more than one
            language fluently opens the door to new worlds and all the wonders they have to offer.
          </p>
          <p style={{ color: "#3A4B44", fontSize: 16, marginTop: 16 }}>
            For a long time, I've dreamed of creating a place where like-minded people can come together to talk
            about art, film, music, theatre, and all the other things that make the world beautiful and exciting
            on a good day and bearable on a bad one.
          </p>

          <blockquote
            style={{
              margin: "34px 0 0",
              paddingLeft: 22,
              borderLeft: "3px solid var(--sage)",
              fontFamily: "var(--serif)",
              fontStyle: "italic",
              fontSize: 19,
              lineHeight: 1.5,
              color: "var(--ink)",
            }}
          >
            Someone once said that nobody can take your place: if you don't take it, it simply remains empty.
          </blockquote>

          <p style={{ color: "#3A4B44", fontSize: 16, marginTop: 34 }}>
            There is a chair waiting for you here—one that is yours and yours alone. I can't wait to meet you and
            hear your story.
          </p>
        </div>
      </section>
    </>
  );
}
