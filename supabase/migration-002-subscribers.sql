-- Run this in Supabase (SQL Editor) to enable the footer newsletter signup.

create extension if not exists "pgcrypto";

-- One row per person who asked to hear about new clubs.
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

-- Same posture as registrations: RLS on, no policies at all, so the anon key
-- has zero access. The signup writes through /api/subscribe with the service
-- role key instead.
alter table subscribers enable row level security;
