-- Direct messaging between customers and salons. A conversation is the pair
-- (user_id, venue_id); messages carry the sender side and per-side read flags.

create table public.messages (
  id uuid primary key default uuid_generate_v4 (),
  venue_id uuid not null references public.venues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  sender text not null check (sender in ('customer', 'venue')),
  text text not null,
  read_by_customer boolean not null default false,
  read_by_venue boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

create policy "Participants can read their conversations"
  on public.messages for select
  using (user_id = auth.uid () or public.owns_venue (venue_id));

create policy "Customers can send in their conversations"
  on public.messages for insert
  with check (
    (sender = 'customer' and user_id = auth.uid ())
    or (sender = 'venue' and public.owns_venue (venue_id))
  );

create policy "Participants can update read flags"
  on public.messages for update
  using (user_id = auth.uid () or public.owns_venue (venue_id));

create index messages_user_idx on public.messages (user_id, created_at desc);
create index messages_venue_idx on public.messages (venue_id, created_at desc);
create index messages_thread_idx on public.messages (venue_id, user_id, created_at);
