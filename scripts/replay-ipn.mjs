#!/usr/bin/env node
//
// Replay a stored PayPal notification at a deployment.
//
//   node scripts/replay-ipn.mjs --event <uuid> --to https://<preview>.vercel.app/api/paypal/ipn
//   node scripts/replay-ipn.mjs --txn <txn_id> --to http://localhost:3000/api/paypal/ipn
//   node scripts/replay-ipn.mjs --list
//
// Why this exists: the handler is idempotent, so a notification can safely be
// sent again. That is the way back from a message that arrived while the
// database was unhappy, or that PayPal gave up retrying, and it is how to
// re-examine a payment that behaved oddly without asking anyone to pay again.
//
// Reads SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY
// from the environment:
//
//   set -a; . ./.env.local; set +a; node scripts/replay-ipn.mjs --list
//
// It never prints a raw notification body. Those contain the payer's name and
// email address, and there is no reason for them to end up in a terminal
// scrollback or a screenshot.

const args = process.argv.slice(2);

function arg(name) {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1] ?? null;
}

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  console.error("Try:  set -a; . ./.env.local; set +a");
  process.exit(1);
}

async function query(path) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (!res.ok) {
    console.error(`Supabase returned ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  return res.json();
}

if (args.includes("--list") || args.length === 0) {
  // Deliberately does not select raw_body.
  const rows = await query(
    "paypal_ipn_events?select=id,received_at,txn_id,payment_status,verification_result,processing_result,notes" +
      "&order=received_at.desc&limit=25"
  );

  if (rows.length === 0) {
    console.log("No notifications recorded yet.");
  } else {
    console.log(`${rows.length} most recent notification(s):\n`);
    for (const r of rows) {
      console.log(`${r.received_at}  ${r.verification_result.padEnd(8)} ${String(r.processing_result ?? "-").padEnd(28)} txn=${r.txn_id ?? "-"}`);
      console.log(`  id: ${r.id}`);
      if (r.notes) console.log(`  ${r.notes}`);
      console.log();
    }
  }
  if (args.length === 0) console.log("Pass --event <id> --to <url> to replay one.");
  process.exit(0);
}

const target = arg("to");
if (!target) {
  console.error("Missing --to <url>, e.g. --to https://<preview>.vercel.app/api/paypal/ipn");
  process.exit(1);
}

// Guard against replaying at production by accident while testing.
if (/lonesomechairclub\.vercel\.app/.test(target) && !args.includes("--yes-production")) {
  console.error("That target is production. If you really mean it, add --yes-production.");
  process.exit(1);
}

const eventId = arg("event");
const txnId = arg("txn");
if (!eventId && !txnId) {
  console.error("Pass either --event <uuid> or --txn <txn_id>.");
  process.exit(1);
}

const filter = eventId
  ? `id=eq.${encodeURIComponent(eventId)}`
  : `txn_id=eq.${encodeURIComponent(txnId)}&order=received_at.desc&limit=1`;

const rows = await query(`paypal_ipn_events?select=id,raw_body,txn_id,payment_status&${filter}`);

if (rows.length === 0) {
  console.error("No matching notification found.");
  process.exit(1);
}

const event = rows[0];
if (!event.raw_body) {
  console.error(`Event ${event.id} has no raw body — it was pruned by the retention job.`);
  process.exit(1);
}

console.log(`Replaying event ${event.id} (txn ${event.txn_id ?? "-"}, ${event.payment_status ?? "-"})`);
console.log(`  -> ${target}`);
console.log(`  body: ${event.raw_body.length} bytes (not shown: contains payer details)`);

// Posted exactly as stored. The handler will verify it with PayPal again, and
// PayPal will confirm a genuine message however many times it is asked.
const res = await fetch(target, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: event.raw_body,
});

console.log(`\nHTTP ${res.status}`);
if (res.status === 200) {
  console.log("Accepted. Check the newest row in paypal_ipn_events for what it decided:");
  console.log("  node scripts/replay-ipn.mjs --list");
} else {
  console.log("Not accepted. A 5xx means the handler could not verify or could not write,");
  console.log("so nothing was applied and it is safe to try again.");
}
