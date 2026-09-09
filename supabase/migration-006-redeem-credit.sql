-- APPLIED 2026-09-09.
-- Part 5: spend one pass credit on a registration.
--
-- PostgREST can only set a literal, not an expression like
-- credits_remaining - 1, so a read-then-write from the API route would race:
-- two tabs could each read 1 and each write 0, spending one credit twice.
-- This does it in a single guarded UPDATE instead.
--
-- The guard is the "and credits_remaining > 0" on the UPDATE itself. Under
-- READ COMMITTED a second concurrent caller blocks on the row lock, then
-- re-checks that condition against the committed value and matches no row,
-- so it fails cleanly rather than driving the balance negative.
--
-- Both statements share one transaction: if the registration cannot be
-- marked paid, the credit is given back automatically.

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
            order by created_at
            limit 1
         )
     and credits_remaining > 0
  returning id, credits_remaining into v_pass_id, v_left;

  if v_pass_id is null then
    raise exception 'no_credits';
  end if;

  update registrations
     set paid = true
   where id = p_registration_id
     and user_id = p_user_id
     and paid = false;

  if not found then
    raise exception 'registration_not_redeemable';
  end if;

  return query select v_pass_id, v_left;
end;
$$;

revoke all on function redeem_pass_credit(uuid, uuid) from public, anon, authenticated;
grant execute on function redeem_pass_credit(uuid, uuid) to service_role;
