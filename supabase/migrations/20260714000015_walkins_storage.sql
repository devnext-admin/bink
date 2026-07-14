-- Walk-in bookings (created by the salon, no customer account) and the
-- storage bucket for salon photo uploads.

alter table public.bookings
  alter column user_id drop not null,
  add column walk_in_name text;

create policy "Venue team create walk-in bookings"
  on public.bookings for insert
  with check (
    user_id is null
    and (public.is_venue_manager (venue_id) or public.is_venue_staff (venue_id))
  );

-- Photo uploads: public bucket, any signed-in user can upload (they can only
-- attach photos to venues they manage through the venue_images RLS).
insert into storage.buckets (id, name, public)
values ('venue-photos', 'venue-photos', true)
on conflict (id) do nothing;

create policy "Venue photos are public"
  on storage.objects for select
  using (bucket_id = 'venue-photos');

create policy "Authenticated users upload venue photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'venue-photos');

create policy "Owners delete their venue photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'venue-photos' and owner = auth.uid ());
