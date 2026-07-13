-- Back-office powers: admins manage user roles and moderate reviews.
create policy "Admins update any profile"
  on public.profiles for update
  using (public.is_admin ());

create policy "Admins delete reviews"
  on public.reviews for delete
  using (public.is_admin ());
