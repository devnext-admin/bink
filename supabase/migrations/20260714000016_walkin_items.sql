-- Venue team can attach items to walk-in bookings they created.

create policy "Venue team create walk-in booking items"
  on public.booking_items for insert
  with check (
    exists (
      select 1 from public.bookings b
      where b.id = booking_items.booking_id
        and b.user_id is null
        and (public.is_venue_manager (b.venue_id) or public.is_venue_staff (b.venue_id))
    )
  );
