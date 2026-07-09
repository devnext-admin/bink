-- In-app notifications for customers and venue owners.

create table public.notifications (
  id uuid primary key default uuid_generate_v4 (),
  user_id uuid references auth.users (id) on delete cascade,
  venue_id uuid references public.venues (id) on delete cascade,
  audience text not null check (audience in ('customer', 'venue')),
  title text not null,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

create policy "Users see their notifications"
  on public.notifications for select
  using (audience = 'customer' and user_id = auth.uid ());

create policy "Venue owners see venue notifications"
  on public.notifications for select
  using (audience = 'venue' and public.owns_venue (venue_id));

create policy "Users can mark their notifications read"
  on public.notifications for update
  using (
    (audience = 'customer' and user_id = auth.uid ())
    or (audience = 'venue' and public.owns_venue (venue_id))
  );

-- Authenticated users create notifications as side-effects of their actions
-- (booking, cancelling, reviewing); service-role writes bypass RLS anyway.
create policy "Authenticated users can insert notifications"
  on public.notifications for insert
  with check (auth.uid () is not null);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_venue_idx on public.notifications (venue_id, created_at desc);
