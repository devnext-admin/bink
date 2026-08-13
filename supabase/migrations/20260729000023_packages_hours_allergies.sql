-- Functional-depth features that close the gap called out in the review:
-- service packages, per-staff working hours, and client health notes.

-- 1. Packages: a named bundle of services at a bundle price -------------------
create table if not exists public.packages (
  id uuid primary key default uuid_generate_v4(),
  venue_id uuid not null references public.venues (id) on delete cascade,
  name text not null,
  name_ar text,
  description text not null default '',
  service_ids uuid[] not null default '{}',
  duration_minutes integer not null default 60,
  price_cents integer not null,
  original_price_cents integer,
  currency text not null default 'SAR',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.packages enable row level security;

-- Public sees packages of approved venues (same visibility as services)
drop policy if exists "Packages of approved venues are public" on public.packages;
create policy "Packages of approved venues are public"
  on public.packages for select
  using (
    exists (
      select 1 from public.venues v
      where v.id = venue_id and (v.status = 'approved' or v.owner_id = auth.uid() or is_admin())
    )
    or is_venue_staff(venue_id)
  );

drop policy if exists "Owners manage packages" on public.packages;
create policy "Owners manage packages"
  on public.packages for all
  using (owns_venue(venue_id) or is_venue_manager(venue_id) or is_admin())
  with check (owns_venue(venue_id) or is_venue_manager(venue_id) or is_admin());

create index if not exists idx_packages_venue on public.packages (venue_id);

-- 2. Per-staff working hours -------------------------------------------------
create table if not exists public.staff_hours (
  id uuid primary key default uuid_generate_v4(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  open_time time,
  close_time time,
  is_off boolean not null default false,
  unique (staff_id, weekday)
);

alter table public.staff_hours enable row level security;

-- Readable wherever the staff's venue is readable (public availability)
drop policy if exists "Staff hours are public" on public.staff_hours;
create policy "Staff hours are public"
  on public.staff_hours for select using (true);

drop policy if exists "Owners manage staff hours" on public.staff_hours;
create policy "Owners manage staff hours"
  on public.staff_hours for all
  using (
    exists (
      select 1 from public.staff s
      where s.id = staff_id
        and (owns_venue(s.venue_id) or is_venue_manager(s.venue_id) or is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.staff s
      where s.id = staff_id
        and (owns_venue(s.venue_id) or is_venue_manager(s.venue_id) or is_admin())
    )
  );

create index if not exists idx_staff_hours_staff on public.staff_hours (staff_id);

-- 3. Client health notes / allergies -----------------------------------------
-- Stored on the customer's own profile; surfaced to the salon by copying into
-- the booking's notes at creation time (the salon cannot read profiles).
-- Like phone, this is PII: it is NOT in the broadly-granted column list, and
-- the owner reads their own value through a security-definer function.
alter table public.profiles add column if not exists allergies text;

create or replace function public.my_allergies()
returns text language sql security definer stable set search_path = public as $$
  select allergies from public.profiles where id = auth.uid();
$$;
grant execute on function public.my_allergies() to authenticated;
