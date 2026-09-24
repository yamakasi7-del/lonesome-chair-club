-- APPLIED 2026-09-24 to production.
--
-- Part 6: move payment from Stripe (and the short-lived PayPal Orders API) to
-- PayPal Payments Standard, confirmed server-side by Instant Payment
-- Notification (IPN). IPN replaces the Stripe webhook as the source of truth
-- for whether a seat has been paid for.
--
-- The whole file runs in one transaction, and every step is written so that a
-- second run is a no-op. If any statement fails, nothing is applied.
--
-- This replaced registrations.paid with a generated column, so any code that
-- WRITES paid stops working. The two writers were the Stripe webhook and the
-- PayPal capture route, both of which already could not run — no Stripe or
-- PayPal keys were ever set in Vercel — and redeem_pass_credit(), the one live
-- writer, is replaced at the bottom of this file in the same transaction.
--
-- Verified after applying, against production:
--   * paid rejects writes with 428C9 "column paid can only be updated to
--     DEFAULT", i.e. it really is generated
--   * all 4 existing registrations came across as pending, none as paid, and
--     paid agrees with payment_status on every row in both directions
--   * those 4 are labelled payment_provider 'unknown', not 'paypal', because
--     none of them was ever paid through anything
--   * pass_orders, paypal_ipn_events and the new columns on passes all exist

begin;

-- ---------------------------------------------------------------------------
-- 1. registrations: a real payment status, with paid derived from it
-- ---------------------------------------------------------------------------
-- paid was a boolean, which cannot express "PayPal says this is pending", "the
-- amount did not match, a human needs to look" or "this was refunded".
--
-- Rather than keep a boolean and a status in step with each other, paid becomes
-- a generated column computed from payment_status. There is then exactly one
-- source of truth, and it is impossible for the two to disagree. Everything
-- that reads paid today -- the profile page, the capacity count in
-- /api/register, the Meet-link check in /api/registration-status -- keeps
-- working untouched, and a refund hides the Meet link and frees the seat
-- automatically because paid becomes false on its own.

alter table registrations add column if not exists payment_status text;

-- Carry the old boolean across, then drop it. Guarded on the ORIGINAL column
-- still being present and not already generated, so re-running is harmless.
do $$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'registrations'
       and column_name = 'paid'
       and is_generated = 'NEVER'
  ) then
    update registrations
       set payment_status = case when paid then 'paid' else 'pending' end;

    alter table registrations drop column paid;
  end if;
end $$;

-- Covers a fresh database where there was no paid column to convert.
update registrations set payment_status = 'pending' where payment_status is null;

alter table registrations alter column payment_status set default 'pending';
alter table registrations alter column payment_status set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'registrations_payment_status_check') then
    alter table registrations
      add constraint registrations_payment_status_check
      check (payment_status in ('pending', 'paid', 'payment_review', 'refunded'));
  end if;
end $$;

-- paid is now read-only. PostgREST exposes it as a normal boolean to read and
-- rejects any attempt to write it, which is the point.
alter table registrations
  add column if not exists paid boolean
  generated always as (payment_status = 'paid') stored;

create index if not exists idx_registrations_payment_status on registrations(payment_status);

-- ---------------------------------------------------------------------------
-- 2. registrations: what PayPal told us about the payment
-- ---------------------------------------------------------------------------
-- paid_amount is numeric because it stores the decimal figure exactly as PayPal
-- reported it ("20.00"). It is a record of what happened, not something we do
-- arithmetic on: the IPN handler compares amounts in integer cents, never as
-- floats, before it trusts a payment.

alter table registrations add column if not exists paypal_txn_id text;
alter table registrations add column if not exists paid_amount numeric;
alter table registrations add column if not exists paid_currency text;
alter table registrations add column if not exists payer_email text;
alter table registrations add column if not exists paid_at timestamptz;

-- Added without a default first so that existing rows can be labelled honestly,
-- and only then given the 'paypal' default that new rows pick up.
alter table registrations add column if not exists payment_provider text;

update registrations
   set payment_provider = case
         when stripe_session_id is not null then 'stripe'
         else 'unknown'
       end
 where payment_provider is null;

alter table registrations alter column payment_provider set default 'paypal';
alter table registrations alter column payment_provider set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'registrations_payment_provider_check') then
    alter table registrations
      add constraint registrations_payment_provider_check
      check (payment_provider in ('paypal', 'stripe', 'pass_credit', 'unknown'));
  end if;
end $$;

-- A unique INDEX rather than a constraint, so "if not exists" works on a rerun.
-- This is the idempotency guard for the IPN handler: PayPal resends messages,
-- and a repeated txn_id must not be able to pay for a second seat. Nulls do not
-- collide, so unpaid rows are unaffected.
create unique index if not exists idx_registrations_paypal_txn on registrations(paypal_txn_id);

-- ---------------------------------------------------------------------------
-- 3. pass_orders: an intent to buy a pass, created before the buyer leaves
-- ---------------------------------------------------------------------------
-- Passes are bought with the same PayPal button flow, so they need the same
-- shape as a registration: a row that exists before payment, whose id travels
-- to PayPal in the "custom" field and comes back on the IPN.
--
-- Why a separate table rather than putting the id in custom directly: the
-- button form is plain HTML, so a determined buyer can edit any field in it
-- before submitting. Reading the price back from a row we wrote ourselves means
-- the amount PayPal reports is always checked against a figure the buyer never
-- had the chance to touch. The pass itself is only created once payment is
-- confirmed, so an abandoned checkout leaves no credits behind -- the same
-- property the Stripe flow had.

create table if not exists pass_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  pass_size integer not null check (pass_size in (4, 6, 10)),
  price_amount integer not null,          -- cents, snapshot of the catalogue price
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'payment_review', 'refunded')),
  paypal_txn_id text,
  paid_amount numeric,
  paid_currency text,
  payer_email text,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_pass_orders_user on pass_orders(user_id);
create index if not exists idx_pass_orders_status on pass_orders(status);
create unique index if not exists idx_pass_orders_paypal_txn on pass_orders(paypal_txn_id);

alter table pass_orders enable row level security;

-- No policies at all: the anon and authenticated keys get nothing. Every read
-- and write goes through a server route using the service role, matching the
-- posture of registrations and subscribers.

-- ---------------------------------------------------------------------------
-- 4. passes: refunds block the remaining credits, they do not erase them
-- ---------------------------------------------------------------------------
-- A refunded pass keeps its credits_remaining figure untouched, so there is
-- always a record of what was left at the moment of the refund. What changes is
-- that the pass stops being spendable, and it is flagged for a human to settle.
-- Sessions already attended or booked with a credit are deliberately left alone.

alter table passes add column if not exists status text not null default 'active';
alter table passes add column if not exists refunded_at timestamptz;
alter table passes add column if not exists needs_review boolean not null default false;
alter table passes add column if not exists review_note text;
alter table passes add column if not exists pass_order_id uuid references pass_orders(id);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'passes_status_check') then
    alter table passes
      add constraint passes_status_check
      check (status in ('active', 'refunded'));
  end if;
end $$;

-- One pass per order. This is what stops a resent IPN granting a second pass
-- for the same payment, exactly as stripe_session_id did for the Stripe flow.
create unique index if not exists idx_passes_pass_order on passes(pass_order_id);

-- ---------------------------------------------------------------------------
-- 5. paypal_ipn_events: every message PayPal sends us, whatever happens next
-- ---------------------------------------------------------------------------
-- Written before verification is even attempted, so a message that fails to
-- verify, or that arrives while the database is unhappy, still leaves a trace.
--
-- raw_body is the message exactly as received, byte for byte. It has to be kept
-- unaltered because verifying with PayPal means posting the same bytes back in
-- the same order, and because it is the only way to re-examine a disputed
-- payment later.
--
-- RETENTION. raw_body contains the payer's name, email address and country, so
-- it is intended to be kept for 90 days and then cleared, while the structured
-- columns below it are kept for the owner's tax records. The column is nullable
-- for exactly that reason: a pruned row keeps its txn_id, amount, status and
-- timestamp, and loses only the personal detail. NOTHING PRUNES IT YET -- the
-- job below is follow-up work, not part of this change:
--
--   update paypal_ipn_events
--      set raw_body = null,
--          notes = coalesce(notes || ' | ', '') || 'raw body pruned'
--    where raw_body is not null
--      and received_at < now() - interval '90 days';

create table if not exists paypal_ipn_events (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  raw_body text,                          -- null once pruned; see above
  txn_id text,
  payment_status text,                    -- PayPal's payment_status, verbatim
  verification_result text not null
    check (verification_result in ('VERIFIED', 'INVALID', 'ERROR')),
  registration_id uuid references registrations(id),
  pass_order_id uuid references pass_orders(id),
  processing_result text,                 -- what we decided to do about it
  notes text                              -- why, when the answer was "nothing"
);

create index if not exists idx_paypal_ipn_events_txn on paypal_ipn_events(txn_id);
create index if not exists idx_paypal_ipn_events_received on paypal_ipn_events(received_at desc);
create index if not exists idx_paypal_ipn_events_registration on paypal_ipn_events(registration_id);
create index if not exists idx_paypal_ipn_events_pass_order on paypal_ipn_events(pass_order_id);

alter table paypal_ipn_events enable row level security;

-- Again, no policies. This table holds payer names and email addresses; the
-- anon key ships inside the browser bundle, so it must never be readable with
-- it. Server routes use the service role, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- 6. redeem_pass_credit: same guarantees, new status column
-- ---------------------------------------------------------------------------
-- Replaces the version from migration-006. Two changes, both forced by the
-- above: it writes payment_status instead of paid (which is now generated and
-- cannot be written), and it refuses to spend credits from a refunded pass.
--
-- The concurrency reasoning from migration-006 is unchanged and still load
-- bearing: the "and credits_remaining > 0" on the UPDATE itself is the guard.
-- Under READ COMMITTED a second concurrent caller blocks on the row lock, then
-- re-checks that condition against the committed value, matches no row, and
-- fails cleanly rather than driving the balance negative. Both statements share
-- one transaction, so if the registration cannot be marked paid the credit is
-- given back automatically.

create or replace function redeem_pass_credit(p_user_id uuid, p_registration_id uuid)
returns table (pass_id uuid, credits_left integer)
language plpgsql
as $$
declare
  v_pass_id uuid;
  v_left integer;
begin
  update passes
     set credits_remaining = credits_remaining - 1
   where id = (
           select id
             from passes
            where user_id = p_user_id
              and credits_remaining > 0
              and status = 'active'
            order by created_at
            limit 1
         )
     and credits_remaining > 0
     and status = 'active'
  returning id, credits_remaining into v_pass_id, v_left;

  if v_pass_id is null then
    raise exception 'no_credits';
  end if;

  update registrations
     set payment_status = 'paid',
         payment_provider = 'pass_credit',
         paid_at = now()
   where id = p_registration_id
     and user_id = p_user_id
     and payment_status = 'pending';

  if not found then
    raise exception 'registration_not_redeemable';
  end if;

  return query select v_pass_id, v_left;
end;
$$;

revoke all on function redeem_pass_credit(uuid, uuid) from public, anon, authenticated;
grant execute on function redeem_pass_credit(uuid, uuid) to service_role;

commit;

-- ---------------------------------------------------------------------------
-- After running, check these four things
-- ---------------------------------------------------------------------------
-- 1. paid is generated, and agrees with payment_status:
--      select column_name, is_generated, generation_expression
--        from information_schema.columns
--       where table_name = 'registrations' and column_name = 'paid';
--
-- 2. No registration changed state during the migration:
--      select payment_status, paid, count(*)
--        from registrations group by 1, 2 order by 1;
--    Every row should be paid = true only where payment_status = 'paid'.
--
-- 3. Historical rows are labelled, not silently called PayPal:
--      select payment_provider, count(*) from registrations group by 1;
--
-- 4. The new tables are closed to the anon key. Both should return 0 policies:
--      select tablename, count(*) filter (where policyname is not null)
--        from pg_tables left join pg_policies using (schemaname, tablename)
--       where schemaname = 'public'
--         and tablename in ('pass_orders', 'paypal_ipn_events')
--       group by tablename;
