# Testing PayPal end to end

Payment is confirmed by a message PayPal sends to our server, not by the buyer's browser.
**PayPal cannot reach `localhost`**, so the flow cannot be tested on a laptop: a payment
made locally will never be confirmed and the booking will sit waiting forever. Everything
below needs a public URL, which means a Vercel preview deployment.

---

## Before you start

**Sandbox payments must never touch the production database.** A preview deployment reads
whatever Supabase credentials are in Vercel's Preview scope, and the service role key
bypasses row-level security. Set up a **separate Supabase project or branch** for testing
and use its keys in Preview. Do not copy the production ones across.

1. At [developer.paypal.com](https://developer.paypal.com) → Testing Tools → Sandbox
   Accounts, create a **business** account (the seller) and a **personal** account (the
   buyer). Note the business account's email address and the personal account's login.
2. In Vercel → Settings → Environment Variables, on the **Preview** scope only:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` — from the **test** Supabase project
   - `PAYPAL_MODE=sandbox`
   - `PAYPAL_RECEIVER_EMAIL` — the **sandbox business** account's address
   - `NEXT_PUBLIC_TELEGRAM_URL`
   - **Leave `NEXT_PUBLIC_SITE_URL` unset.** The checkout route then uses the preview
     deployment's own address, so notifications come back to the preview rather than to
     production.
3. Apply `supabase/migration-007-paypal-ipn.sql` to the test project and run the four
   verification queries at the bottom of it.
4. Push a branch and open the preview URL Vercel gives you.

To watch what arrives, either query the table directly or use:

```bash
set -a; . ./.env.local; set +a          # test project credentials
node scripts/replay-ipn.mjs --list
```

---

## The cases to cover

For each one, the question is the same: **what does `registrations.payment_status` say
afterwards, and did the Meet link appear when it should not have?**

### 1. A payment that works

Book a session on the preview, pay with the sandbox personal account.

- Booking goes `pending` → `paid`.
- The confirmation page swaps from "confirming your payment" to the Meet link on its own,
  usually within a few seconds.
- The log shows `VERIFIED` and `processing_result = paid`.

### 2. The wrong amount

This is the attack the checks exist for, and it is worth doing properly rather than
trusting the unit tests. Start a checkout, then before submitting, edit the `amount` field
in the browser's dev tools — the form is plain HTML, so this is exactly what someone
determined would do. Pay the altered amount.

- The money really does arrive, so this is a real sandbox payment.
- Booking goes to `payment_review`, **not** `paid`. **No Meet link.**
- Log note begins `NEEDS REVIEW:` and states what was paid against what was expected.

### 3. The wrong receiver

Same idea, editing the `business` field to another sandbox account's address.

- Booking goes to `payment_review`. **No Meet link.**
- This also proves `business` cannot vouch for itself: the check reads `receiver_email`,
  which comes from PayPal, not from the form.

### 4. The same notification twice

Take a successful payment from case 1 and send it again:

```bash
node scripts/replay-ipn.mjs --txn <txn_id> --to https://<preview>.vercel.app/api/paypal/ipn
```

- HTTP 200, `processing_result = duplicate`.
- Nothing changes. No second seat, no second pass, no altered amount.

### 5. A refund

Refund the case 1 payment from the sandbox business account (Activity → the transaction →
Refund).

- Booking goes to `refunded`, `paid` becomes false, **the Meet link disappears**, and the
  seat is free for someone else.
- The confirmation page, reloaded, explains the booking was refunded.

### 6. A partial refund

Refund **part** of a payment.

- Booking goes to `payment_review`, and access is **deliberately left in place** — a
  partial refund is a judgement call, not an automatic revocation.
- Log note begins `NEEDS REVIEW:` and gives both figures.

### 7. A pending payment (eCheque)

In the sandbox personal account, pay by eCheque.

- Booking goes to `payment_review`. **No Meet link.**
- When the eCheque clears (sandbox lets you force this from the business account), the
  next notification moves it to `paid`.
- If instead it is denied, the booking goes **back to `pending`** so the buyer can simply
  pay again from the site.

### 8. A message that is not from PayPal

```bash
curl -X POST https://<preview>.vercel.app/api/paypal/ipn \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'payment_status=Completed&txn_id=FAKE123&mc_gross=20.00&mc_currency=USD&receiver_email=you@example.com&custom=reg:<a-real-registration-id>'
```

- HTTP 200 (so it is not retried at us forever), `verification_result = INVALID`.
- **Nothing changes.** This is the single most important negative test: a forged Completed
  message with a correct amount and receiver still unlocks nothing, because PayPal did not
  confirm sending it.

### 9. A test message in live mode

Only meaningful once `PAYPAL_MODE=live`. A message carrying `test_ipn=1` is recorded and
ignored, changing nothing.

---

## Reading the results

Everything the site could not settle on its own is marked in the log:

```sql
select received_at, txn_id, payment_status, processing_result, notes
  from paypal_ipn_events
 where notes like 'NEEDS REVIEW:%'
 order by received_at desc;
```

And to see the full story of one booking, including a pending followed by a denial:

```sql
select received_at, payment_status, verification_result, processing_result, notes
  from paypal_ipn_events
 where registration_id = '<booking id>'
 order by received_at;
```

---

## Going live

Only after the cases above pass:

1. Work through the owner checklist — the PayPal account settings there (blocking eCheque,
   blocking duplicate invoice ids, UTF-8 encoding) change how payments behave.
2. Apply the migration to the production Supabase project.
3. Set `PAYPAL_MODE=live` and the **real** receiving address on the Production scope.
   Anything other than exactly `live` means sandbox, so a typo cannot take real money.
4. Redeploy — `NEXT_PUBLIC_*` values are baked in at build time.
5. Make one real payment of a small amount yourself, confirm the Meet link appears, then
   refund it and confirm the link disappears.
