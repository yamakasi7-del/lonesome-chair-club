import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET /api/registration-status?token=...
// The token is an unguessable UUID (the registration's access_token), acting
// as a capability URL. Only reveals the Meet link once paid = true.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const { data: reg, error } = await supabaseAdmin
    .from("registrations")
    .select("paid, name, clubs ( title, category, session_date, session_time, meet_link )")
    .eq("access_token", token)
    .single();

  if (error || !reg) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const club = Array.isArray(reg.clubs) ? reg.clubs[0] : reg.clubs;

  return NextResponse.json({
    paid: reg.paid,
    name: reg.name,
    club: {
      title: club.title,
      category: club.category,
      date: club.session_date,
      time: club.session_time,
      meetLink: reg.paid ? club.meet_link : null,
    },
  });
}
