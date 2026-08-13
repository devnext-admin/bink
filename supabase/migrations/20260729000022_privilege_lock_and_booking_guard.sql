-- Security hardening called out in the architecture review:
--   1. Close the privilege-escalation path: a signed-in user could run
--      `update profiles set role='admin' where id = auth.uid()` because the
--      owner UPDATE policy had no WITH CHECK and no trigger guarded the role
--      column. A BEFORE UPDATE trigger now pins role/is_blocked for anyone who
--      is not already an admin, so self-promotion silently no-ops.
--   2. Prevent double-booking at the database level with an exclusion
--      constraint on overlapping active appointments per staff member, instead
--      of relying on application logic alone.

-- 1. Privilege lock -----------------------------------------------------------
create or replace function public.lock_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only an existing admin may change a profile's role or blocked flag.
  -- is_admin() reads the *committed* role of the caller, so a normal user
  -- attempting to promote themselves fails this check and the privileged
  -- columns are reset to their previous values. Name/phone/avatar edits by
  -- the owner are unaffected.
  if (new.role is distinct from old.role) or (new.is_blocked is distinct from old.is_blocked) then
    if not public.is_admin() then
      new.role := old.role;
      new.is_blocked := old.is_blocked;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_profile_privileges on public.profiles;
create trigger trg_lock_profile_privileges
  before update on public.profiles
  for each row execute function public.lock_profile_privileges();

-- Defence in depth: an explicit WITH CHECK on the owner policy so the row a
-- user writes must still be their own (the trigger enforces the role pin).
drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 2. Double-booking guard -----------------------------------------------------
-- btree_gist lets us mix equality (staff_id) with range overlap (&&).
create extension if not exists btree_gist;

-- Backfill a time range column the constraint can index. Kept in sync by a
-- trigger so application inserts/updates never have to set it.
alter table public.bookings
  add column if not exists slot tstzrange
  generated always as (tstzrange(starts_at, ends_at, '[)')) stored;

-- Two active (not cancelled / no-show) bookings for the same staff member may
-- not overlap. Unassigned walk-ins (staff_id null) are excluded from the rule.
alter table public.bookings drop constraint if exists no_double_booking;
alter table public.bookings
  add constraint no_double_booking
  exclude using gist (
    staff_id with =,
    slot with &&
  )
  where (staff_id is not null and status not in ('cancelled', 'no_show'));
