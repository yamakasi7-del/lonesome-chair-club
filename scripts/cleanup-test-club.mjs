#!/usr/bin/env node
//
// Delete a test club and everything attached to it, after the live payment walkthrough.
//
//   node scripts/cleanup-test-club.mjs --club <club-id>            # shows what it would delete, deletes nothing
//   node scripts/cleanup-test-club.mjs --club <club-id> --confirm <slug>
//
// It never deletes anything on the first run. It prints exactly what it found,
// and only proceeds when you pass --confirm with the club's own slug, so a
// mistyped id cannot take a real club with it.
//
// It also refuses outright if the club looks like a real one: published, or
// with a paid registration that is not the one you name with --allow-paid.
//
//   set -a; . ./.env.local; set +a; node scripts/cleanup-test-club.mjs --club <id>

const args = process.argv.slice(2);
const arg = (n) => {
  const i = args.indexOf(`--${n}`);
  return i === -1 ? null : args[i + 1] ?? null;
};

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Try:  set -a; . ./.env.local; set +a");
  process.exit(1);
}

const clubId = arg("club");
if (!clubId) {
  console.error("Usage: node scripts/cleanup-test-club.mjs --club <club-id> [--confirm <slug>]");
  process.exit(1);
}

const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

async function rest(path, init = {}) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  if (!res.ok) {
    console.error(`\nSupabase returned ${res.status} for ${path}`);
    console.error(await res.text());
    process.exit(1);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ---------------------------------------------------------------------------
// 1. Find everything
// ---------------------------------------------------------------------------

const clubs = await rest(`clubs?select=id,slug,title,category,is_published,price_amount,currency&id=eq.${clubId}`);
if (clubs.length === 0) {
  console.error(`No club with id ${clubId}.`);
  process.exit(1);
}
const club = clubs[0];

const registrations = await rest(
  `registrations?select=id,name,email,payment_status,paypal_txn_id,paid_amount,created_at&club_id=eq.${clubId}`
);
const regIds = registrations.map((r) => r.id);

const events = regIds.length
  ? await rest(
      `paypal_ipn_events?select=id,received_at,txn_id,payment_status,verification_result,processing_result` +
        `&registration_id=in.(${regIds.join(",")})`
    )
  : [];

// Pass orders are not tied to a club, so they are never touched here. Listed
// only so it is obvious they were considered and deliberately left alone.
const orphanNote =
  "pass_orders and passes are not linked to a club and are NOT touched by this script.";

// ---------------------------------------------------------------------------
// 2. Say exactly what would go
// ---------------------------------------------------------------------------

console.log("\nClub");
console.log(`  ${club.category}: ${club.title}`);
console.log(`  id        ${club.id}`);
console.log(`  slug      ${club.slug}`);
console.log(`  price     ${(club.price_amount / 100).toFixed(2)} ${String(club.currency).toUpperCase()}`);
console.log(`  published ${club.is_published}`);

console.log(`\nRegistrations attached to it: ${registrations.length}`);
for (const r of registrations) {
  console.log(`  ${r.created_at}  ${r.payment_status.padEnd(15)} ${r.email}  txn=${r.paypal_txn_id ?? "-"}`);
}

console.log(`\nPayPal notifications for those registrations: ${events.length}`);
for (const e of events) {
  console.log(`  ${e.received_at}  ${e.verification_result.padEnd(8)} ${String(e.processing_result ?? "-").padEnd(26)} txn=${e.txn_id ?? "-"}`);
}

console.log(`\n${orphanNote}`);

// ---------------------------------------------------------------------------
// 3. Refuse anything that looks like a real club
// ---------------------------------------------------------------------------

const problems = [];

if (club.is_published) {
  problems.push(
    "The club is still published. Unpublish it first (is_published = false) so nobody can book it mid-delete."
  );
}

const paid = registrations.filter((r) => r.payment_status === "paid");
if (paid.length > 0 && !args.includes("--allow-paid")) {
  problems.push(
    `${paid.length} registration(s) are still marked paid. If that is the test payment, refund it first and let the ` +
      `refund notification land, or pass --allow-paid if you are certain.`
  );
}

if (problems.length > 0) {
  console.log("\nNot deleting anything:\n");
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 4. Confirm, then delete in dependency order
// ---------------------------------------------------------------------------

const confirm = arg("confirm");
if (confirm !== club.slug) {
  console.log(
    `\nNothing deleted. To go ahead, re-run with the club's own slug:\n\n` +
      `  node scripts/cleanup-test-club.mjs --club ${clubId} --confirm ${club.slug}\n`
  );
  process.exit(0);
}

console.log("\nDeleting…");

// Notifications first: they carry a foreign key to registrations.
if (events.length > 0) {
  await rest(`paypal_ipn_events?registration_id=in.(${regIds.join(",")})`, { method: "DELETE" });
  console.log(`  ${events.length} notification(s) deleted`);
}

if (regIds.length > 0) {
  await rest(`registrations?club_id=eq.${clubId}`, { method: "DELETE" });
  console.log(`  ${registrations.length} registration(s) deleted`);
}

await rest(`clubs?id=eq.${clubId}`, { method: "DELETE" });
console.log(`  club deleted`);

// ---------------------------------------------------------------------------
// 5. Prove it
// ---------------------------------------------------------------------------

const leftClubs = await rest(`clubs?select=id&id=eq.${clubId}`);
const leftRegs = await rest(`registrations?select=id&club_id=eq.${clubId}`);

console.log(
  `\nCheck: ${leftClubs.length} club row(s) and ${leftRegs.length} registration(s) remain for that id.` +
    (leftClubs.length === 0 && leftRegs.length === 0 ? " Clean." : " SOMETHING IS LEFT — look before assuming.")
);
