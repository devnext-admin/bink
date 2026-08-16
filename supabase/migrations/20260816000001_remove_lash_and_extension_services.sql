-- Remove lash, brow and extension services from the marketplace.
--
-- Bink no longer lists eyelash extensions, lash lifts, brow treatments, hair
-- extensions or nail extensions, including as demo examples. This drops the two
-- venues that existed only to sell them, the category that grouped them, and
-- the remaining extension services on venues we are keeping.
--
-- bookings, invoices and transactions reference venues WITHOUT on delete
-- cascade, so those rows have to go first or the venue delete raises a foreign
-- key violation. Everything else on venues does cascade.

do $$
declare
  gone uuid[];
  dead_services uuid[];
begin
  select array_agg(id) into gone
    from public.venues
   where slug in ('glow-lash-studio', 'brow-bar-co');

  if gone is not null then
    delete from public.invoices     where venue_id = any (gone);
    delete from public.transactions where venue_id = any (gone);
    delete from public.bookings     where venue_id = any (gone);
    delete from public.venues       where id       = any (gone);
  end if;

  -- Extension services that lived on venues we are keeping. booking_items
  -- points at services, so clear those rows before removing the service.
  select array_agg(id) into dead_services
    from public.services
   where name in ('Acrylic Full Set', 'Lash Application');

  if dead_services is not null then
    delete from public.booking_items where service_id = any (dead_services);
    delete from public.services      where id         = any (dead_services);
  end if;
end $$;

delete from public.categories where slug = 'brows-lashes';
