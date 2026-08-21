import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Postgres unique_violation — the email is already on the list.
const UNIQUE_VIOLATION = "23505";

// POST { email }
// Adds an email to the newsletter list. The subscribers table has RLS on and
// no policies, so this route (service role key) is the only way in.
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    const cleaned = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from("subscribers").insert({ email: cleaned });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return NextResponse.json({ alreadySubscribed: true });
      }
      throw error;
    }

    return NextResponse.json({ alreadySubscribed: false });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
