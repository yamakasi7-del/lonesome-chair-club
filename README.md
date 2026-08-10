# Lonesome Chair Club

English speaking club landing site with a real backend: club calendar, registration form,
Stripe payment, and a Google Meet link that only unlocks once payment is confirmed.

Stack: **Next.js** (frontend + API routes) · **Supabase** (Postgres database) · **Stripe** (payment) · **Vercel** (hosting) · **GitHub** (code).

## 1. Create accounts (you do this yourself — not something I can do for you)

- [supabase.com](https://supabase.com) — free tier is enough to start
- [stripe.com](https://stripe.com) — free to set up, takes a small fee per payment
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

## 3. Set up Stripe

1. In the Stripe dashboard, go to **Developers → API keys** and copy the **Secret key** → `STRIPE_SECRET_KEY`.
2. Deploy the site first (step 5), then come back to **Developers → Webhooks → Add endpoint**:
   - Endpoint URL: `https://your-site.vercel.app/api/webhook`
   - Event to send: `checkout.session.completed`
   - Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

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
   **Project Settings → Environment Variables**. Use your real Supabase and Stripe values —
   never commit `.env.local` to GitHub.
3. Deploy. Once it's live, go back and finish the Stripe webhook step above with the real URL.
4. Every future `git push` to `main` deploys automatically — no more drag-and-drop.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your real keys
npm run dev
```

Site runs at http://localhost:3000. For Stripe webhooks locally, use the
[Stripe CLI](https://stripe.com/docs/stripe-cli): `stripe listen --forward-to localhost:3000/api/webhook`.
