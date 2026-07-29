-- Let team members contribute to their salon's service menu:
--  * add new services to the venue they work at, and
--  * manage the list of services they personally provide.
-- Editing/removing existing services stays with managers and owners.

create policy "Staff add services"
  on public.services for insert
  with check (public.is_venue_staff (venue_id));

create policy "Members manage own staff services"
  on public.staff_services for all
  using (
    exists (
      select 1 from public.staff s
      where s.id = staff_services.staff_id and s.user_id = auth.uid ()
    )
  )
  with check (
    exists (
      select 1 from public.staff s
      where s.id = staff_services.staff_id and s.user_id = auth.uid ()
    )
  );
