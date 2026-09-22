import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabaseServerAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const metadata: Metadata = {
  title: "My profile — Lonesome Chair Club",
};

type Club = {
  title: string;
  category: string;
  session_date: string;
  session_time: string;
};

export default async function ProfilePage() {
  const supabase = await createServerAuthClient();

  // getUser() validates the token with Supabase rather than trusting the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // No user_id filter here on purpose: the RLS policy added in
  // migration-003 restricts this to the caller's own rows, so the database
  // enforces it rather than this query remembering to.
  //
  // meet_link is deliberately absent from this select. It is not readable with
  // the anon key any more (migration-004), because a row-level policy cannot
  // hide a single column and the anon key ships in the browser. The link is
  // fetched below with the service role, and only for rows already paid.
  const { data: registrations, error } = await supabase
    .from("registrations")
    .select("id, paid, created_at, access_token, club_id, clubs ( title, category, session_date, session_time )")
    .order("created_at", { ascending: false });

  // One lookup for the paid rows only. Nothing here can widen what the person
  // sees: the row set already came back through RLS as their own.
  const paidClubIds = (registrations ?? []).filter((r) => r.paid).map((r) => r.club_id);
  const meetLinks = new Map<string, string | null>();

  if (paidClubIds.length > 0) {
    const { data: clubRows } = await supabaseAdmin
      .from("clubs")
      .select("id, meet_link")
      .in("id", paidClubIds);

    for (const row of clubRows ?? []) meetLinks.set(row.id, row.meet_link);
  }

  return (
    <section style={{ padding: "64px 0 90px" }}>
      <div className="wrap" style={{ maxWidth: 640 }}>
        <span className="eyebrow">Your account</span>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>My profile</h1>
        <p style={{ color: "#3A4B44", fontSize: 15 }}>Signed in as {user.email}</p>

        <h2 style={{ fontSize: 22, marginTop: 36 }}>Your sessions</h2>

        {error && (
          <p style={{ color: "#993C1D", fontSize: 15, marginTop: 14 }}>
            We couldn&apos;t load your bookings just now. Please refresh, or try again in a moment.
          </p>
        )}

        {!error && (!registrations || registrations.length === 0) && (
          <div style={{ marginTop: 14 }}>
            <p style={{ color: "#3A4B44", fontSize: 15 }}>
              You haven&apos;t booked a session with this account yet.
            </p>
            <Link className="btn btn-ochre" href="/clubs" style={{ marginTop: 16 }}>
              See upcoming clubs
            </Link>
          </div>
        )}

        <div style={{ display: "grid", gap: 16, marginTop: 18 }}>
          {(registrations ?? []).map((reg) => {
            const club = (Array.isArray(reg.clubs) ? reg.clubs[0] : reg.clubs) as Club | undefined;
            if (!club) return null;

            return (
              <div key={reg.id} className="card">
                <span
                  style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 13, color: "var(--ochre-deep)" }}
                >
                  {club.category}
                </span>
                <h3 style={{ fontSize: 19, margin: "6px 0 8px" }}>{club.title}</h3>
                <p style={{ fontSize: 14, color: "#4A4335" }}>
                  {new Date(club.session_date).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                  {" · "}
                  {club.session_time}
                </p>

                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span
                    className="tag"
                    style={
                      reg.paid
                        ? { background: "var(--sage)", color: "var(--ink-deep)" }
                        : { background: "var(--paper-deep)", color: "#875F3B" }
                    }
                  >
                    {reg.paid ? "Paid" : "Payment pending"}
                  </span>

                  {reg.paid && meetLinks.get(reg.club_id) ? (
                    <a
                      className="btn btn-ochre"
                      href={meetLinks.get(reg.club_id)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: "8px 16px", fontSize: 13 }}
                    >
                      Join on Google Meet
                    </a>
                  ) : (
                    <Link
                      href={`/success?token=${reg.access_token}`}
                      style={{ fontSize: 13.5, textDecoration: "underline" }}
                    >
                      Finish payment
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
