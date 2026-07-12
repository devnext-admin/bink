-- Team member accounts, venue roles (manager/member), per-staff services,
-- salon booking policies (cancellation + deposit), and the RLS needed for
-- staff dashboards and admin emulation.

-- ---------------------------------------------------------------------------
-- Staff become sign-in-able accounts with a venue role
-- ---------------------------------------------------------------------------
alter table public.staff
  add column email text,
  add column user_id uuid references auth.users (id) on delete set null,
  add column venue_role text not null default 'member'
    check (venue_role in ('manager', 'member')),
  add column invite_status text not null default 'none'
    check (invite_status in ('none', 'invited', 'joined'));

create index staff_user_idx on public.staff (user_id);

-- Services a team member can provide
create table public.staff_services (
  staff_id uuid not null references public.staff (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  primary key (staff_id, service_id)
);

alter table public.staff_services enable row level security;

create policy "Staff services are public"
  on public.staff_services for select using (true);

-- ---------------------------------------------------------------------------
-- Venue booking policies
-- ---------------------------------------------------------------------------
alter table public.venues
  add column cancellation_policy text not null default '',
  add column cancellation_fee_pct int not null default 0
    check (cancellation_fee_pct between 0 and 100),
  add column deposit_cents int not null default 0 check (deposit_cents >= 0);

alter table public.bookings
  add column deposit_cents int not null default 0 check (deposit_cents >= 0);

-- ---------------------------------------------------------------------------
-- Helpers: is the caller on this venue's team / a manager of it?
-- ---------------------------------------------------------------------------
create or replace function public.is_venue_staff(v uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff s where s.venue_id = v and s.user_id = auth.uid ()
  );
$$;

create or replace function public.is_venue_manager(v uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.owns_venue (v) or public.is_admin () or exists (
    select 1 from public.staff s
    where s.venue_id = v and s.user_id = auth.uid () and s.venue_role = 'manager'
  );
$$;

-- ---------------------------------------------------------------------------
-- Staff access: bookings, booking items, messages, transactions
-- ---------------------------------------------------------------------------
create policy "Staff see venue bookings"
  on public.bookings for select
  using (public.is_venue_staff (venue_id));

create policy "Staff update venue bookings"
  on public.bookings for update
  using (public.is_venue_manager (venue_id)
    or exists (
      select 1 from public.staff s
      where s.id = bookings.staff_id and s.user_id = auth.uid ()
    ));

create policy "Admins update bookings"
  on public.bookings for update
  using (public.is_admin ());

create policy "Staff see venue booking items"
  on public.booking_items for select
  using (exists (
    select 1 from public.bookings b
    where b.id = booking_id and public.is_venue_staff (b.venue_id)
  ));

create policy "Staff read venue messages"
  on public.messages for select
  using (public.is_venue_staff (venue_id) or public.is_admin ());

create policy "Staff send venue messages"
  on public.messages for insert
  with check (sender = 'venue' and (public.is_venue_staff (venue_id) or public.is_admin ()));

create policy "Staff update venue message flags"
  on public.messages for update
  using (public.is_venue_staff (venue_id) or public.is_admin ());

create policy "Staff view venue transactions"
  on public.transactions for select
  using (public.is_venue_manager (venue_id));

create policy "Admins update transactions"
  on public.transactions for update
  using (public.is_admin ());

-- Managers get the same venue-management rights as owners
create policy "Managers update venues"
  on public.venues for update
  using (public.is_venue_manager (id));

create policy "Managers manage services"
  on public.services for all
  using (public.is_venue_manager (venue_id))
  with check (public.is_venue_manager (venue_id));

create policy "Managers manage staff"
  on public.staff for all
  using (public.is_venue_manager (venue_id))
  with check (public.is_venue_manager (venue_id));

create policy "Managers manage opening hours"
  on public.opening_hours for all
  using (public.is_venue_manager (venue_id))
  with check (public.is_venue_manager (venue_id));

create policy "Managers manage venue images"
  on public.venue_images for all
  using (public.is_venue_manager (venue_id))
  with check (public.is_venue_manager (venue_id));

create policy "Team manage staff services"
  on public.staff_services for all
  using (exists (
    select 1 from public.staff s
    where s.id = staff_id and public.is_venue_manager (s.venue_id)
  ))
  with check (exists (
    select 1 from public.staff s
    where s.id = staff_id and public.is_venue_manager (s.venue_id)
  ));

-- Staff can read the venues they work at even while pending
create policy "Staff see their venues"
  on public.venues for select
  using (public.is_venue_staff (id));

-- Notifications: venue audience readable by the whole team
create policy "Staff see venue notifications"
  on public.notifications for select
  using (audience = 'venue' and venue_id is not null and public.is_venue_staff (venue_id));
