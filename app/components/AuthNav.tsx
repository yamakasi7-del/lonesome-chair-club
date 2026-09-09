"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createAuthClient } from "@/lib/supabaseAuthClient";

// "Log in" or "My profile" in the header, depending on the session. Renders
// nothing until the session is known, so the server-rendered markup never
// disagrees with the browser and nobody sees the wrong link flash first.
export default function AuthNav() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createAuthClient();
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setSignedIn(Boolean(session));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (signedIn === null) return null;

  return (
    <Link href={signedIn ? "/profile" : "/login"} style={{ textDecoration: "none" }}>
      {signedIn ? "My profile" : "Log in"}
    </Link>
  );
}
