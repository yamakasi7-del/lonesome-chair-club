// The matching rule for attaching guest bookings to an account, kept apart
// from the database call so it can be tested on its own.

export type ClaimableRow = { id: string; email: string | null };

/**
 * Which of these rows were booked with this email address.
 *
 * Deliberately NOT a SQL "ilike": PostgREST reads _ and % in a pattern as
 * wildcards, and an underscore is perfectly ordinary in an email address, so
 * jane_doe@example.com would also match janeXdoe@example.com and hand one
 * person another person's booking. Comparing here keeps it exact.
 *
 * Case and surrounding whitespace are the only things ignored. That matters in
 * practice: a real payment came back from PayPal with the payer address
 * capitalised differently from the address the booking was made with.
 */
export function selectClaimableIds(rows: ClaimableRow[], email: string): string[] {
  const wanted = email.trim().toLowerCase();
  if (!wanted) return [];

  return rows
    .filter((row) => (row.email ?? "").trim().toLowerCase() === wanted)
    .map((row) => row.id);
}
