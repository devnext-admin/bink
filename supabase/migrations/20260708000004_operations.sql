-- Operations build-out: no-show status, venue-managed booking statuses,
-- promo codes, and review submissions tied to bookings.

alter type public.booking_status add value if not exists 'no_show';

-- Venue owners can manage the status of bookings at their venues
create policy "Venue owners can update venue bookings"
  on public.bookings for update
  using (public.owns_venue (venue_id));

-- ---------------------------------------------------------------------------
-- Promo codes (admin-managed, applied at checkout)
-- ---------------------------------------------------------------------------
create table public.promo_codes (
  id serial primary key,
  code text not null unique,
  pct_off int not null check (pct_off between 1 and 100),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.promo_codes enable row level security;

create policy "Active promo codes are readable"
  on public.promo_codes for select
  using (is_active = true or public.is_admin ());

create policy "Admins manage promo codes (insert)"
  on public.promo_codes for insert with check (public.is_admin ());

create policy "Admins manage promo codes (update)"
  on public.promo_codes for update using (public.is_admin ());

create policy "Admins manage promo codes (delete)"
  on public.promo_codes for delete using (public.is_admin ());

-- Track promo usage on bookings
alter table public.bookings add column promo_code text;

-- ---------------------------------------------------------------------------
-- Categories: admins can manage
-- ---------------------------------------------------------------------------
create policy "Admins manage categories (insert)"
  on public.categories for insert with check (public.is_admin ());

create policy "Admins manage categories (update)"
  on public.categories for update using (public.is_admin ());
