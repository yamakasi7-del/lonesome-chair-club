-- APPLIED 2026-09-09.
-- Part 4: multi-session passes bought up front and spent as credits.

create table if not exists passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  pass_size integer not null check (pass_size in (4, 6, 10)),
  credits_remaining integer not null check (credits_remaining >= 0),
  price_paid_amount integer not null,
  -- Unique so a retried Stripe webhook cannot grant a second pass for the
  -- same payment. Stripe retries on any non-2xx, so this matters.
  stripe_session_id text unique,
  created_at timestamptz default now()
);

create index if not exists idx_passes_user on passes(user_id);

alter table passes enable row level security;

drop policy if exists "Users can read their own passes" on passes;

create policy "Users can read their own passes"
  on passes for select
  to authenticated
  using (user_id = (select auth.uid()));

-- No insert/update/delete policies: every write goes through a server route
-- using the service role, which bypasses RLS.
