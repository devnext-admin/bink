-- Bink: beauty & wellness booking marketplace
-- Core schema: profiles, categories, venues, services, staff, bookings, reviews, favorites

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Profiles (mirrors auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner"
  on public.profiles for select using (auth.uid () = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update using (auth.uid () = id);

create policy "Profiles are insertable by owner"
  on public.profiles for insert with check (auth.uid () = id);

-- Auto-create a profile row for each new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id serial primary key,
  slug text not null unique,
  name text not null,
  icon text not null default 'sparkles',
  sort_order int not null default 0
);

alter table public.categories enable row level security;
create policy "Categories are public" on public.categories for select using (true);

-- ---------------------------------------------------------------------------
-- Venues
-- ---------------------------------------------------------------------------
create table public.venues (
  id uuid primary key default uuid_generate_v4 (),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category_id int references public.categories (id),
  address text not null default '',
  area text not null default '',
  city text not null default '',
  country text not null default '',
  lat double precision,
  lng double precision,
  rating_avg numeric(3, 2) not null default 0,
  rating_count int not null default 0,
  is_featured boolean not null default false,
  is_new boolean not null default false,
  is_trending boolean not null default false,
  highlights text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.venues enable row level security;
create policy "Venues are public" on public.venues for select using (true);

create table public.venue_images (
  id serial primary key,
  venue_id uuid not null references public.venues (id) on delete cascade,
  url text not null,
  sort_order int not null default 0
);

alter table public.venue_images enable row level security;
create policy "Venue images are public" on public.venue_images for select using (true);

create table public.opening_hours (
  id serial primary key,
  venue_id uuid not null references public.venues (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0 = Sunday
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  unique (venue_id, weekday)
);

alter table public.opening_hours enable row level security;
create policy "Opening hours are public" on public.opening_hours for select using (true);

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default uuid_generate_v4 (),
  venue_id uuid not null references public.venues (id) on delete cascade,
  name text not null,
  description text not null default '',
  group_name text not null default 'Featured',
  duration_minutes int not null,
  price_cents int not null,
  currency text not null default 'SAR',
  discount_pct int not null default 0,
  is_featured boolean not null default false,
  sort_order int not null default 0
);

alter table public.services enable row level security;
create policy "Services are public" on public.services for select using (true);

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------
create table public.staff (
  id uuid primary key default uuid_generate_v4 (),
  venue_id uuid not null references public.venues (id) on delete cascade,
  name text not null,
  role text not null default '',
  avatar_url text,
  rating numeric(3, 2) not null default 5.0
);

alter table public.staff enable row level security;
create policy "Staff are public" on public.staff for select using (true);

-- ---------------------------------------------------------------------------
-- Bookings
-- ---------------------------------------------------------------------------
create type public.booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');

create table public.bookings (
  id uuid primary key default uuid_generate_v4 (),
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references public.venues (id),
  staff_id uuid references public.staff (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'confirmed',
  total_cents int not null default 0,
  currency text not null default 'SAR',
  notes text,
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "Bookings are viewable by owner"
  on public.bookings for select using (auth.uid () = user_id);

create policy "Bookings are insertable by owner"
  on public.bookings for insert with check (auth.uid () = user_id);

create policy "Bookings are updatable by owner"
  on public.bookings for update using (auth.uid () = user_id);

create table public.booking_items (
  id serial primary key,
  booking_id uuid not null references public.bookings (id) on delete cascade,
  service_id uuid not null references public.services (id),
  service_name text not null,
  duration_minutes int not null,
  price_cents int not null
);

alter table public.booking_items enable row level security;

create policy "Booking items follow booking owner (select)"
  on public.booking_items for select
  using (exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid ()));

create policy "Booking items follow booking owner (insert)"
  on public.booking_items for insert
  with check (exists (select 1 from public.bookings b where b.id = booking_id and b.user_id = auth.uid ()));

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default uuid_generate_v4 (),
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  author_name text not null default 'Guest',
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;
create policy "Reviews are public" on public.reviews for select using (true);

create policy "Reviews are insertable by authenticated users"
  on public.reviews for insert with check (auth.uid () = user_id);

-- Keep venue rating aggregates in sync
create or replace function public.refresh_venue_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v uuid := coalesce(new.venue_id, old.venue_id);
begin
  update public.venues
  set rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where venue_id = v), 0),
      rating_count = (select count(*) from public.reviews where venue_id = v)
  where id = v;
  return null;
end;
$$;

create trigger on_review_change
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_venue_rating();

-- ---------------------------------------------------------------------------
-- Favorites
-- ---------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  venue_id uuid not null references public.venues (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);

alter table public.favorites enable row level security;

create policy "Favorites are viewable by owner"
  on public.favorites for select using (auth.uid () = user_id);

create policy "Favorites are insertable by owner"
  on public.favorites for insert with check (auth.uid () = user_id);

create policy "Favorites are deletable by owner"
  on public.favorites for delete using (auth.uid () = user_id);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index venues_category_idx on public.venues (category_id);
create index venues_flags_idx on public.venues (is_featured, is_new, is_trending);
create index services_venue_idx on public.services (venue_id);
create index staff_venue_idx on public.staff (venue_id);
create index reviews_venue_idx on public.reviews (venue_id);
create index bookings_user_idx on public.bookings (user_id, starts_at desc);
create index venue_images_venue_idx on public.venue_images (venue_id, sort_order);
