-- Phone is PII (PDPL): keep it out of the broadly-readable profiles projection.
-- Names/avatars/role stay readable so owners can see customer names, but no
-- authenticated user can read another user's phone number.
-- A single column-level revoke is not enough — Supabase grants table-wide
-- SELECT to anon/authenticated, so we revoke that and re-grant every column
-- EXCEPT phone.
revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, avatar_url, role, is_blocked, created_at)
  on public.profiles to anon, authenticated;

-- The owner reads their own phone through a security-definer function.
create or replace function public.my_phone()
returns text language sql security definer stable set search_path = public as $$
  select phone from public.profiles where id = auth.uid();
$$;
grant execute on function public.my_phone() to authenticated;
