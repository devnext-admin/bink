-- Venue owners need customer names on their bookings/messages, and the app
-- shows reviewer/booker names across the product. Profiles carry only
-- non-sensitive display data (name, avatar, role), so let any signed-in user
-- read them.
create policy "Authenticated users can view profiles"
  on public.profiles for select
  to authenticated
  using (true);
