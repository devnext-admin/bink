-- Admin moderation of users: block/unblock (blocked accounts cannot sign in
-- meaningfully — the app signs them out — and the database refuses their
-- bookings, messages and reviews), plus the reads admins need to "view as"
-- any customer for support.

alter table public.profiles
  add column is_blocked boolean not null default false;

create or replace function public.is_blocked()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select p.is_blocked from public.profiles p where p.id = auth.uid ()), false);
$$;

-- Restrictive policies: these AND with the existing permissive ones,
-- so a blocked user fails every write no matter what else allows it.
create policy "Blocked users cannot book"
  on public.bookings as restrictive for insert
  with check (not public.is_blocked ());

create policy "Blocked users cannot message"
  on public.messages as restrictive for insert
  with check (not public.is_blocked ());

create policy "Blocked users cannot review"
  on public.reviews as restrictive for insert
  with check (not public.is_blocked ());

-- Admin "view as user" needs to read what that user sees
create policy "Admins view all favorites"
  on public.favorites for select
  using (public.is_admin ());

create policy "Admins view all notifications"
  on public.notifications for select
  using (public.is_admin ());
