-- APPLIED 2026-09-09. Not part of the accounts feature: a pre-existing hole.
--
-- The "Public can read published clubs" policy grants SELECT on the whole row,
-- and Postgres RLS filters rows, not columns. The anon key ships inside the
-- browser bundle, so anyone can currently read meet_link for every published
-- club without paying, which defeats the entire payment gate.
--
-- Column-level grants are the fix: keep the row policy, but stop handing out
-- meet_link. service_role is untouched, so /api/registration-status keeps
-- returning the link once a registration is paid.
--
-- app/profile/page.tsx was reworked alongside this: it fetches meet_link with
-- the service role, and only for registrations already marked paid.

revoke select on public.clubs from anon, authenticated;

grant select (
  id, slug, category, title, description, vocabulary,
  session_date, session_time, price_amount, currency,
  capacity, is_published, created_at
) on public.clubs to anon, authenticated;
