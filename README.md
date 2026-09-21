# Lonesome Chair Club

English speaking club landing site with a real backend: club calendar, registration form,
PayPal payment, and a Google Meet link that only unlocks once payment is confirmed.

Stack: **Next.js** (frontend + API routes) · **Supabase** (Postgres database) · **PayPal** (payment) · **Vercel** (hosting) · **GitHub** (code).

## 1. Create accounts (you do this yourself — not something I can do for you)

- [supabase.com](https://supabase.com) — free tier is enough to start
- [paypal.com](https://paypal.com) — the account that will receive payments, plus
  [developer.paypal.com](https://developer.paypal.com) for sandbox testing
- [github.com](https://github.com) — if you don't have an account yet
- [vercel.com](https://vercel.com) — sign in with GitHub, this makes deployment automatic

## 2. Set up Supabase

1. Create a new Supabase project.
2. Go to **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and run it.
3. Optional: also run `supabase/seed-example.sql` to see the site working with placeholder sessions.
4. Go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — never put it in frontend code)

To edit club sessions later (topics, dates, Meet links), just use Supabase's own **Table Editor** —
no code changes needed. That's your admin panel for now.

## 3. Set up PayPal

Payment uses **PayPal Payments Standard** — the classic button flow. There are no API keys
and no app to register: the buyer is sent to PayPal with a set of form fields, and PayPal
tells this site the outcome server-to-server through an Instant Payment Notification (IPN).
That notification is the only thing that confirms a seat, so the browser is never trusted
about its own payment.

1. Put the email address of the PayPal account that receives payments into
   `PAYPAL_RECEIVER_EMAIL`. It is checked against every notification, so it must match
   exactly.
2. Leave `PAYPAL_MODE=sandbox` while testing. Only the exact value `live` charges real
   money, so a typo cannot take a real payment by accident.
3. There is no webhook URL to register anywhere. Each payment carries its own
   `notify_url`, pointing at `/api/paypal/ipn` on whichever deployment started it — so a
   preview deployment notifies itself and never production.
4. Before going live, work through `supabase/migration-007-paypal-ipn.sql` and the owner
   checklist: PayPal account settings (blocking eCheque, blocking duplicate invoice ids,
   UTF-8 encoding) materially affect how payments behave.

## 4. Push the code to GitHub

```bash
cd lonesome-chair-club
git init
git add .
git commit -m "Initial commit"
```

Then create a new empty repository on GitHub (no README/license — you already have files),
and follow the "push an existing repository" instructions it shows you, e.g.:

```bash
git remote add origin https://github.com/YOUR-USERNAME/lonesome-chair-club.git
git branch -M main
git push -u origin main
```

## 5. Deploy on Vercel

1. On [vercel.com](https://vercel.com), click **Add New → Project → Import Git Repository**, and pick this repo.
2. Before the first deploy, add the environment variables (from `.env.example`) in
   **Project Settings → Environment Variables**. Use your real Supabase and PayPal values —
   never commit `.env.local` to GitHub.
3. Deploy. `NEXT_PUBLIC_*` values are baked in at build time, so changing one needs a
   redeploy to take effect.
4. Every future `git push` to `main` deploys automatically — no more drag-and-drop.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your real keys
npm run dev
```

Site runs at http://localhost:3000.

PayPal cannot reach `localhost`, so notifications never arrive locally and a payment will
sit unconfirmed. To test the payment flow end to end you need a public URL — deploy a
Vercel preview and test against that, with sandbox credentials and a separate Supabase
project. See the owner checklist: sandbox payments must never write to the production
database.
