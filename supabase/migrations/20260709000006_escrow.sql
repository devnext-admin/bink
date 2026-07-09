-- Escrow model: online payments are held by Bink and released to the salon
-- only after BOTH parties approve — the venue marks the service completed and
-- the customer confirms the visit. Refunds return held funds to the customer.

alter table public.transactions
  add column escrow_status text not null default 'released'
    check (escrow_status in ('held', 'released', 'refunded')),
  add column released_at timestamptz;

-- New online payments start life held in escrow
alter table public.transactions alter column escrow_status set default 'held';

alter table public.bookings
  add column customer_confirmed_at timestamptz;

-- Customers can set their confirmation via the existing owner-update policy
-- (bookings update policy already allows auth.uid() = user_id).

-- Release function: called after either party approves; releases when both
-- conditions hold. Security definer so venue-side completion can also flip
-- the transaction row.
create or replace function public.try_release_escrow(p_booking_id uuid)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  b record;
  released boolean := false;
begin
  select id, status, customer_confirmed_at into b
  from public.bookings where id = p_booking_id;

  if b.id is not null and b.status = 'completed' and b.customer_confirmed_at is not null then
    update public.transactions
    set escrow_status = 'released', released_at = now()
    where booking_id = p_booking_id and status = 'succeeded' and escrow_status = 'held';
    released := found;
  end if;
  return released;
end;
$$;
