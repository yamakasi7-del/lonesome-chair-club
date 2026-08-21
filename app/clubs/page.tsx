import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 60; // refresh the list at most once a minute

type Club = {
  id: string;
  slug: string;
  category: string;
  title: string;
  description: string | null;
  session_date: string;
  session_time: string;
  price_amount: number;
  currency: string;
};

async function getClubs(): Promise<Club[]> {
  const { data, error } = await supabase
    .from("clubs")
    .select("id, slug, category, title, description, session_date, session_time, price_amount, currency")
    .eq("is_published", true)
    .order("session_date", { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }
  return data ?? [];
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
}

export default async function ClubsPage() {
  const clubs = await getClubs();

  return (
    <>
      <section style={{ background: "var(--sage)", padding: "56px 0 90px" }}>
        <div className="wrap">
          <span className="eyebrow" style={{ color: "var(--ink-deep)" }}>This month</span>
          <h1 style={{ fontSize: 34, marginBottom: 30, color: "var(--ink-deep)" }}>Upcoming clubs</h1>

          {clubs.length === 0 && (
            <p style={{ color: "var(--ink-deep)" }}>
              No sessions are open for registration right now — check back soon.
            </p>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 22 }}>
            {clubs.map((club) => (
              <div key={club.id} className="card">
                <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ochre-deep)" }}>
                  {club.category}
                </span>
                <h3 style={{ fontSize: 20, margin: "6px 0 8px" }}>
                  <Link href={`/clubs/${club.id}`} style={{ textDecoration: "none" }}>
                    {club.title}
                  </Link>
                </h3>
                {club.description && <p style={{ fontSize: 14, color: "#4A4335" }}>{club.description}</p>}
                <p style={{ fontSize: 13, color: "#4A4335", marginTop: 12 }}>
                  {new Date(club.session_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  {" · "}{club.session_time} · Google Meet · Up to 6 people
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
                  <span className="tag">{formatPrice(club.price_amount, club.currency)}</span>
                  <a className="btn btn-ochre" href={`/register/${club.id}`} style={{ padding: "9px 18px", fontSize: 13 }}>
                    Register
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: "var(--teal)", color: "var(--cream)", padding: "44px 0" }}>
        <div
          className="wrap"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}
        >
          <p style={{ fontSize: 16, color: "#E4EEE0" }}>
            Don't see a topic that fits? Message us on Telegram.
          </p>
          <a
            className="btn btn-outline"
            href={process.env.NEXT_PUBLIC_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ borderColor: "#B9C9B0", color: "var(--cream)", padding: "9px 18px", fontSize: 13 }}
          >
            Message on Telegram
          </a>
        </div>
      </section>
    </>
  );
}
