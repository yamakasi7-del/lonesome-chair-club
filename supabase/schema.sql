-- Run this once in Supabase: Project -> SQL Editor -> New query -> paste -> Run

create extension if not exists "pgcrypto";

-- One row per themed club session (e.g. "Books — August 14")
create table if not exists clubs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category text not null,              -- Books / Art History / Theatre / Film
  title text not null,                 -- specific topic, e.g. "Short stories that changed our minds"
  description text,
  session_date date not null,
  session_time text not null,          -- e.g. "19:00 GMT+3"
  price_amount integer not null,       -- in the smallest currency unit, e.g. cents
  currency text not null default 'usd',
  meet_link text not null,             -- Google Meet URL, only ever exposed after payment
  capacity integer default 6,
  is_published boolean default true,
  created_at timestamptz default now()
);

-- One row per person who registers for a club session
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references clubs(id) not null,
  name text not null,
  email text not null,
  paid boolean not null default false,
  stripe_session_id text,
  access_token uuid not null default gen_random_uuid(),  -- capability token used on the success page
  created_at timestamptz default now()
);

create index if not exists idx_registrations_club on registrations(club_id);
create index if not exists idx_registrations_token on registrations(access_token);
create index if not exists idx_registrations_stripe_session on registrations(stripe_session_id);

-- Row Level Security: the browser only ever reads published club listings directly.
-- Everything involving registrations or payment status goes through server-side
-- API routes using the service role key, so we keep these tables closed to anon.
alter table clubs enable row level security;
alter table registrations enable row level security;

create policy "Public can read published clubs"
  on clubs for select
  using (is_published = true);

-- No policies created for registrations -> anon key has zero access.
-- All reads/writes happen via the Next.js API routes (service role key).
