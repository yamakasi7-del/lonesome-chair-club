-- Part 2: link registrations to logged-in accounts.
-- Existing rows keep user_id null and go on working through their access_token,
-- so capability-token-only registrations are unaffected.

alter table registrations add column if not exists user_id uuid references auth.users(id);

create index if not exists idx_registrations_user on registrations(user_id);

-- registrations already has RLS on with no policies, so anon has zero access
-- and every server route uses the service role (which bypasses RLS).
-- This adds exactly one narrow read path: a logged-in person may read their
-- own rows. Writes stay server-only.
drop policy if exists "Users can read their own registrations" on registrations;

create policy "Users can read their own registrations"
  on registrations for select
  to authenticated
  using (user_id = (select auth.uid()));
