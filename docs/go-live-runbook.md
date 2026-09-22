# Going live: the real-payment walkthrough

For testing on production with a real, small payment instead of a sandbox environment.
Covers steps 2–6 of the plan. **Read the two warnings first — one of them changes step 3.**

---

## Warning 1: a hidden club cannot be booked

The plan says "hidden test club". That does not work, and it will look like a bug.

The registration page reads clubs with the **anon** key, and the only row-level policy on
`clubs` is `using (is_published = true)`. An unpublished club is therefore invisible to
that page, `getClub()` returns nothing, and `/register/<id>` answers **404**. The club
detail page and `/clubs` behave the same way.

Options:

- **Publish it for the length of the test** (recommended). The site has no users, and the
  window is minutes. Give it a title that is unmistakably not a real session — something
  like "Internal test — do not book" — and an odd date, so a stray visitor would not
  book it by accident.
- Leave it unpublished and drive the flow by hand instead: insert the registration with
  SQL, call `/api/checkout/paypal` with that id, and submit the returned fields to PayPal
  yourself. This tests the server but skips the page the buyer actually uses, which is
  most of the point.

Whichever you pick, **unpublish it before running the cleanup script** — the script
refuses to delete a published club.

## Warning 2: `PAYPAL_MODE` must be set explicitly

`PAYPAL_MODE` falls back to sandbox when unset. That is deliberate: a typo can never take
real money. But on production that fallback would silently send buyers to
`sandbox.paypal.com` and verify live notifications against the sandbox endpoint, which
answers INVALID — nothing charged, nothing confirmed, and it would look like an outage
rather than a missing variable.

So production now refuses to start a checkout unless `PAYPAL_MODE=live`. If you see
"Payment isn't available just now" on the registration form after deploying, check the
Vercel function log: it will say `PayPal checkout refused: PAYPAL_MODE must be set to
"live" on the production deployment`.

**Remember `NEXT_PUBLIC_*` values are baked in at build time.** Setting `PAYPAL_MODE` does
not need a rebuild (it is server-side), but changing `NEXT_PUBLIC_SITE_URL` does.

---

## Step 2 — Anna configures the live account

She needs to set, in the PayPal account:

- **IPN**: enabled, with a notification URL. Each payment sends its own `notify_url`, so
  the profile setting is a fallback — but IPN must be switched on for the account.
  URL: `https://lonesomechairclub.vercel.app/api/paypal/ipn`
- **Auto Return**: on, returning to `https://lonesomechairclub.vercel.app/success`
  (the per-payment return URL overrides this and carries the token).
- **Currency**: the account must accept **USD**, which is what every club price is in. If
  her account is GEL-based, PayPal will convert — check what she actually receives.
- **Block eCheque payments**.
- **Language encoding: UTF-8**.
- **Block duplicate invoice IDs**, if the account offers it.

### What to check afterwards

Nothing is observable from our side yet — these are account settings. The first real proof
comes in step 3. Before moving on, confirm `PAYPAL_RECEIVER_EMAIL` in Vercel is **exactly**
the address PayPal shows as the account's primary email. A mismatch does not fail loudly:
the payment succeeds, the money arrives, and the booking silently goes to
`payment_review` with a receiver mismatch. That is the single most likely thing to go
wrong in this whole exercise.

---

## Step 3 — one real payment

Create the test club (see Warning 1), then book and pay it as a buyer would.

### What to check, in order

**a. The checkout actually points at live PayPal.** Before paying, on the registration
page open dev tools → Network, submit the form, and look at the response from
`/api/checkout/paypal`. `action` must be `https://www.paypal.com/cgi-bin/webscr` — **not**
`sandbox.paypal.com`. If it says sandbox, stop: `PAYPAL_MODE` is not set.

**b. The confirmation page settles on its own.** After paying you land on
`/success?token=…`. It should move from "Almost there — confirming your payment" to the
Meet link **without touching anything**, usually within a few seconds.

**c. The booking.**

```sql
select id, payment_status, payment_provider, paypal_txn_id,
       paid_amount, paid_currency, payer_email, paid_at
  from registrations
 where club_id = '<test club id>';
```

Expected: `payment_status = 'paid'`, `payment_provider = 'paypal'`, `paypal_txn_id` set,
`paid_amount` equal to the club price, `paid_currency = 'USD'`, `payer_email` yours,
`paid_at` just now.

**d. The notification.**

```sql
select received_at, txn_id, payment_status, verification_result, processing_result, notes
  from paypal_ipn_events
 where registration_id = '<registration id>'
 order by received_at;
```

Expected: one row, `verification_result = 'VERIFIED'`, `processing_result = 'paid'`.

### Delay or failure?

| What you see | Meaning | Do |
|---|---|---|
| No row in `paypal_ipn_events` after 2–3 min | PayPal has not reached us at all | Check the URL is publicly reachable and IPN is on. PayPal retries for days, so it is recoverable |
| Row exists, `verification_result = 'ERROR'` | We could not reach PayPal to verify | **A delay, not a failure.** We answered 5xx on purpose, so PayPal will retry. Wait, then look again |
| Row exists, `verification_result = 'INVALID'` | PayPal does not recognise the message | Genuine failure. Usually the wrong verify endpoint, i.e. `PAYPAL_MODE` wrong |
| `processing_result = 'review:receiver_mismatch'` | Money went to a different address than configured | Genuine failure. Compare `PAYPAL_RECEIVER_EMAIL` with the account's primary email |
| `processing_result = 'review:amount_mismatch'` | Paid figure differs from the club price | Genuine failure — unless you deliberately altered it |
| `processing_result = 'not_configured'` | `PAYPAL_MODE` or the receiver email is wrong | Genuine failure. Fix the variable, then replay the notification |
| `processing_result = 'no_target'` | `custom` did not map to a booking | Genuine failure. Should not happen in this flow |

**Rule of thumb: `ERROR` means wait, `INVALID` and `review:*` mean look.**

If a notification was lost or arrived while something was misconfigured, replay it rather
than paying again:

```bash
set -a; . ./.env.local; set +a
node scripts/replay-ipn.mjs --list
node scripts/replay-ipn.mjs --event <id> --to https://lonesomechairclub.vercel.app/api/paypal/ipn --yes-production
```

---

## Step 4 — Anna refunds it

She issues a **full** refund from the PayPal account.

### What to check

```sql
select payment_status, paid, paypal_txn_id from registrations where id = '<registration id>';
```

Expected: `payment_status = 'refunded'`, and **`paid = false`** — it is a generated column,
so it follows automatically.

Then, the three things the refund is supposed to cause:

1. **Meet link withdrawn.** Reload `/success?token=…`. It should now read "This booking has
   been refunded, so the meeting link is no longer available." Confirm the link is not in
   the page source, not merely hidden.
2. **Seat freed.** The capacity count only counts paid bookings, so the club is bookable
   again.
3. **The notification.** A second row in `paypal_ipn_events`, `processing_result =
   'refunded'`, with `parent_txn_id` matching the original payment.

### Delay or failure?

A refund notification is usually immediate. If `payment_status` is still `paid` after a few
minutes, look at the newest event row:

- `review:partial_refund` — a partial refund was issued, not a full one. **Access is left
  in place on purpose**, and the note says so. Issue the rest, or settle by hand.
- `review:refund_parent_mismatch` — the refund points at a different transaction.
- `ignored:refund_for_unpaid_record` — the booking was not paid when the refund arrived.

---

## Step 5 — the money reaches the Georgian bank account

This is the step that matters most, and nothing in the code can tell you about it.

- Confirm the **payment** appeared in Anna's PayPal balance in step 3.
- Confirm the **refund** in step 4 took it back out — and note the **fee**. PayPal often
  keeps the fixed portion of its fee on a refund, so a small test payment can come back
  slightly short. That is normal and not a bug in this site.
- Then, separately from the test payment, confirm she can **withdraw** to her Georgian bank
  account. If the payment is refunded there may be nothing left to withdraw — so consider
  making a second small payment and **not** refunding that one, purely to test withdrawal.

**This is the original blocker from the checklist.** Until a withdrawal completes, the whole
approach is unproven, whatever the site does.

---

## Step 6 — cleanup

First unpublish the club (the script refuses a published one), then:

```bash
set -a; . ./.env.local; set +a
node scripts/cleanup-test-club.mjs --club <club-id>
```

That first run **deletes nothing**. It prints the club, every registration, and every
notification it would remove, and refuses if the club is still published or if a booking is
still marked paid. To go ahead, repeat with the club's own slug:

```bash
node scripts/cleanup-test-club.mjs --club <club-id> --confirm <slug>
```

It deletes notifications first, then registrations, then the club, and re-queries afterwards
to prove nothing is left. `pass_orders` and `passes` are not linked to a club and are never
touched.

### Keep or delete the notification rows?

Deleting them is tidy, but they are also the only record of a real payment and refund.
If the retention conversation with the accountant is still open, consider exporting them
first:

```sql
select received_at, txn_id, payment_status, verification_result, processing_result, notes
  from paypal_ipn_events order by received_at;
```

---

## After the walkthrough

- Set the real club prices and confirm `price_amount` is in **cents** (2000 = $20.00).
- Check `/clubs` shows only real sessions.
- Leave `PAYPAL_MODE=live` alone.
- The legal pages still name Stripe and are wrong until the copy changes are approved.
