-- Short delay requests on a booking.
--
-- Either side can ask to push an appointment back by up to 15 minutes: a salon
-- running behind, or a customer stuck in traffic. The other side accepts or
-- declines. Anything longer stays a reschedule, which is a different flow.
--
-- Authorization lives here rather than in the client. The two RPCs below are
-- security definer and work out the caller's side from auth.uid(), so a
-- customer cannot accept their own request and a venue cannot accept its own.
-- The 15 minute cap is a check constraint, not a UI rule, so a crafted request
-- cannot move an appointment further than the policy allows.

alter table public.bookings
  add column if not exists delay_minutes int,
  add column if not exists delay_by text,
  add column if not exists delay_at timestamptz;

alter table public.bookings drop constraint if exists booking_delay_minutes_range;
alter table public.bookings
  add constraint booking_delay_minutes_range
  check (delay_minutes is null or (delay_minutes >= 1 and delay_minutes <= 15));

alter table public.bookings drop constraint if exists booking_delay_by_side;
alter table public.bookings
  add constraint booking_delay_by_side
  check (delay_by is null or delay_by in ('customer', 'venue'));

-- Which side of a booking the caller is on, or null when they are neither.
create or replace function public.booking_side(p_booking uuid)
returns text
language sql
security definer
stable
as $$
  select case
    when b.user_id = auth.uid() then 'customer'
    when exists (
      select 1 from public.venues v
       where v.id = b.venue_id and v.owner_id = auth.uid()
    ) then 'venue'
    when exists (
      select 1 from public.staff s
       where s.venue_id = b.venue_id and s.user_id = auth.uid()
    ) then 'venue'
    else null
  end
  from public.bookings b
  where b.id = p_booking;
$$;

/**
 * Ask the other side to push this booking back by p_minutes (1 to 15).
 * The caller's side is derived from auth.uid(), never passed in.
 */
create or replace function public.request_booking_delay(p_booking uuid, p_minutes int)
returns void
language plpgsql
security definer
as $$
declare
  side text;
begin
  if p_minutes is null or p_minutes < 1 or p_minutes > 15 then
    raise exception 'A delay must be between 1 and 15 minutes';
  end if;

  side := public.booking_side(p_booking);
  if side is null then
    raise exception 'Not your booking';
  end if;

  update public.bookings
     set delay_minutes = p_minutes,
         delay_by      = side,
         delay_at      = now()
   where id = p_booking
     and status not in ('cancelled', 'completed');

  if not found then
    raise exception 'That booking is no longer open';
  end if;
end;
$$;

/**
 * Accept or decline a pending delay. Only the side that did NOT raise the
 * request may answer it. Accepting shifts both ends of the booking so the
 * duration is preserved.
 */
create or replace function public.respond_booking_delay(p_booking uuid, p_accept boolean)
returns void
language plpgsql
security definer
as $$
declare
  side    text;
  asked_by text;
  mins    int;
begin
  side := public.booking_side(p_booking);
  if side is null then
    raise exception 'Not your booking';
  end if;

  select delay_by, delay_minutes into asked_by, mins
    from public.bookings where id = p_booking;

  if asked_by is null then
    raise exception 'There is no delay request on that booking';
  end if;

  if asked_by = side then
    raise exception 'The other side has to answer this request';
  end if;

  if p_accept then
    update public.bookings
       set starts_at      = starts_at + make_interval(mins => mins),
           ends_at        = ends_at   + make_interval(mins => mins),
           delay_minutes  = null,
           delay_by       = null,
           delay_at       = null
     where id = p_booking;
  else
    update public.bookings
       set delay_minutes = null,
           delay_by      = null,
           delay_at      = null
     where id = p_booking;
  end if;
end;
$$;

revoke all on function public.request_booking_delay(uuid, int) from public;
revoke all on function public.respond_booking_delay(uuid, boolean) from public;
revoke all on function public.booking_side(uuid) from public;
grant execute on function public.request_booking_delay(uuid, int) to authenticated;
grant execute on function public.respond_booking_delay(uuid, boolean) to authenticated;
grant execute on function public.booking_side(uuid) to authenticated;
