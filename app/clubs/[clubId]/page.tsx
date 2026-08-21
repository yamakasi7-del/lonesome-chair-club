import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export const revalidate = 60;

async function getClub(clubId: string) {
  const { data } = await supabase
    .from("clubs")
    .select(
      "id, category, title, description, vocabulary, session_date, session_time, price_amount, currency, capacity"
    )
    .eq("id", clubId)
    .eq("is_published", true)
    .single();
  return data;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amount / 100);
}

export default async function ClubDetailPage({ params }: { params: { clubId: string } }) {
  const club = await getClub(params.clubId);
  if (!club) notFound();

  return (
    <section style={{ background: "var(--sage)", padding: "56px 0 90px" }}>
      <div className="wrap" style={{ color: "var(--ink-deep)" }}>
        <Link href="/clubs" style={{ fontSize: 13, textDecoration: "none", opacity: 0.85 }}>
          ← All upcoming clubs
        </Link>

        <div className="card" style={{ marginTop: 20, padding: "30px 30px" }}>
          <span className="eyebrow">{club.category}</span>
          <h1 style={{ fontSize: 30, marginBottom: 14 }}>{club.title}</h1>

          {club.description && <p style={{ color: "#4A4335", marginBottom: 18 }}>{club.description}</p>}

          <p style={{ fontSize: 14, color: "#4A4335" }}>
            {new Date(club.session_date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {" · "}
            {club.session_time} · Google Meet
          </p>
          <p style={{ fontSize: 14, color: "#4A4335", marginTop: 6 }}>
            Up to {club.capacity ?? 6} people · {formatPrice(club.price_amount, club.currency)} per seat
          </p>

          <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--paper-deep)" }}>
            <h2 style={{ fontSize: 20, marginBottom: 10 }}>Vocabulary for this session</h2>
            {club.vocabulary ? (
              <p style={{ fontSize: 15, color: "#4A4335", whiteSpace: "pre-line" }}>{club.vocabulary}</p>
            ) : (
              <p style={{ fontSize: 15, color: "#4A4335" }}>Vocabulary and materials will be added soon.</p>
            )}
          </div>

          <div style={{ marginTop: 28 }}>
            <Link className="btn btn-ochre" href={`/register/${club.id}`}>
              Reserve your seat
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
