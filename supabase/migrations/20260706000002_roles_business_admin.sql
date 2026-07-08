-- Roles (customer / partner / admin), venue ownership + approval status,
-- and RLS so partners manage their own salons and admins manage everything.

alter table public.profiles
  add column role text not null default 'customer'
    check (role in ('customer', 'partner', 'admin'));

alter table public.venues
  add column owner_id uuid references auth.users (id) on delete set null,
  add column status text not null default 'approved'
    check (status in ('pending', 'approved', 'suspended'));

create index venues_owner_idx on public.venues (owner_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid () and role = 'admin');
$$;

create or replace function public.owns_venue(v uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.venues where id = v and owner_id = auth.uid ());
$$;

-- ---------------------------------------------------------------------------
-- Venues: public sees approved; owners and admins see/manage their own
-- ---------------------------------------------------------------------------
drop policy "Venues are public" on public.venues;

create policy "Approved venues are public"
  on public.venues for select
  using (status = 'approved' or owner_id = auth.uid () or public.is_admin ());

create policy "Partners can register venues"
  on public.venues for insert
  with check (owner_id = auth.uid ());

create policy "Owners and admins can update venues"
  on public.venues for update
  using (owner_id = auth.uid () or public.is_admin ());

create policy "Admins can delete venues"
  on public.venues for delete
  using (public.is_admin ());

-- ---------------------------------------------------------------------------
-- Services / staff / images / hours: managed by venue owner or admin
-- ---------------------------------------------------------------------------
create policy "Owners manage services (insert)"
  on public.services for insert
  with check (public.owns_venue (venue_id) or public.is_admin ());

create policy "Owners manage services (update)"
  on public.services for update
  using (public.owns_venue (venue_id) or public.is_admin ());

create policy "Owners manage services (delete)"
  on public.services for delete
  using (public.owns_venue (venue_id) or public.is_admin ());

create policy "Owners manage staff (insert)"
  on public.staff for insert
  with check (public.owns_venue (venue_id) or public.is_admin ());

create policy "Owners manage staff (update)"
  on public.staff for update
  using (public.owns_venue (venue_id) or public.is_admin ());

create policy "Owners manage staff (delete)"
  on public.staff for delete
  using (public.owns_venue (venue_id) or public.is_admin ());

create policy "Owners manage venue images (insert)"
  on public.venue_images for insert
  with check (public.owns_venue (venue_id) or public.is_admin ());

create policy "Owners manage venue images (delete)"
  on public.venue_images for delete
  using (public.owns_venue (venue_id) or public.is_admin ());

create policy "Owners manage opening hours (insert)"
  on public.opening_hours for insert
  with check (public.owns_venue (venue_id) or public.is_admin ());

create policy "Owners manage opening hours (update)"
  on public.opening_hours for update
  using (public.owns_venue (venue_id) or public.is_admin ());

-- ---------------------------------------------------------------------------
-- Bookings: venue owners see bookings at their venues; admins see all
-- ---------------------------------------------------------------------------
create policy "Venue owners can view venue bookings"
  on public.bookings for select
  using (public.owns_venue (venue_id));

create policy "Admins can view all bookings"
  on public.bookings for select
  using (public.is_admin ());

create policy "Venue owners can view venue booking items"
  on public.booking_items for select
  using (exists (
    select 1 from public.bookings b
    where b.id = booking_id and public.owns_venue (b.venue_id)
  ));

create policy "Admins can view all booking items"
  on public.booking_items for select
  using (public.is_admin ());

-- ---------------------------------------------------------------------------
-- Profiles: admins can view all users
-- ---------------------------------------------------------------------------
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin ());
