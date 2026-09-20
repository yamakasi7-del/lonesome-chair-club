import { supabase } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";
import { isPayPalConfigured } from "@/lib/paypalStandard";
import RegisterForm from "./RegisterForm";

async function getClub(clubId: string) {
  const { data } = await supabase
    .from("clubs")
    .select("id, category, title, description, session_date, session_time, price_amount, currency")
    .eq("id", clubId)
    .single();
  return data;
}

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: { clubId: string };
  searchParams: { canceled?: string };
}) {
  const club = await getClub(params.clubId);
  if (!club) notFound();

  return (
    <section style={{ padding: "56px 0 90px" }}>
      <div className="wrap" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
        <div>
          <span className="eyebrow">{club.category}</span>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>{club.title}</h1>
          {club.description && <p style={{ color: "#4A4335", marginBottom: 16 }}>{club.description}</p>}
          <p style={{ fontSize: 14, color: "#4A4335" }}>
            {new Date(club.session_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {" · "}{club.session_time} · Google Meet · Up to 6 people
          </p>

          {searchParams.canceled && (
            <p style={{ marginTop: 16, fontSize: 14, color: "#875F3B" }}>
              Payment was canceled — you can try again below whenever you're ready.
            </p>
          )}
        </div>

        <div>
          {/* Read here rather than in the form: PAYPAL_RECEIVER_EMAIL is
              server-only, so the page passes down a yes/no instead of the
              address itself. */}
          <RegisterForm
            clubId={club.id}
            currency={club.currency}
            priceAmount={club.price_amount}
            paypalReady={isPayPalConfigured()}
          />
        </div>
      </div>
    </section>
  );
}
