import { supabaseAdmin } from "./supabaseAdmin";
import { selectClaimableIds } from "./guestBookingMatch";

// Attach bookings made without an account to the account that just signed in.
//
// Why this is needed: a magic link is opened from an email client, which tends
// to open whichever browser is the default rather than the one the person was
// using. The session lands there, so it is entirely normal to book in one
// browser and be signed in in another. Those bookings are stamped with no
// user_id, the profile page reads rows through a policy of
// user_id = auth.uid(), and they never show up -- even though the person paid.
//
// Why matching on email is safe here: this only ever runs straight after a
// successful sign-in, and signing in means Supabase has just proved the person
// controls that mailbox. Someone who can read the inbox is the person who made
// the booking with that address.
//
// Two rules keep it honest: only rows with user_id IS NULL are ever claimed, so
// a booking belonging to another account can never be taken; and the comparison
// is exact, ignoring only case and surrounding whitespace.

/**
 * Claim this account's guest bookings. Returns how many were attached.
 *
 * Never throws: a sign-in must not fail because this did. The worst outcome is
 * that the bookings stay unattached and the next sign-in tries again, which is
 * exactly the state we are already in today.
 */
export async function linkGuestBookings(userId: string, email: string | undefined): Promise<number> {
  if (!userId || !email) return 0;

  try {
    // Unclaimed rows only. Reading them first, rather than filtering in SQL,
    // is what allows the exact comparison described above.
    const { data: candidates, error: readError } = await supabaseAdmin
      .from("registrations")
      .select("id, email")
      .is("user_id", null)
      .limit(1000);

    if (readError) {
      console.error("Could not look for guest bookings to link", readError.code);
      return 0;
    }

    const ids = selectClaimableIds(candidates ?? [], email);
    if (ids.length === 0) return 0;

    // The null check is repeated on the write: between reading and writing,
    // another sign-in could have claimed the same row, and whoever got there
    // first keeps it.
    const { data: claimed, error: writeError } = await supabaseAdmin
      .from("registrations")
      .update({ user_id: userId })
      .in("id", ids)
      .is("user_id", null)
      .select("id");

    if (writeError) {
      console.error("Could not link guest bookings", writeError.code);
      return 0;
    }

    return claimed?.length ?? 0;
  } catch (err) {
    console.error("Linking guest bookings failed", err);
    return 0;
  }
}
