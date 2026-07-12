-- The demo gateway (pre-Moyasar) charges nothing; the client records the
-- transaction and invoice itself. Real gateways write through edge functions
-- with the service role, which bypasses RLS — so these policies only need to
-- cover the demo flow.

create policy "Users can record their demo transactions"
  on public.transactions for insert
  to authenticated
  with check (auth.uid () = user_id and gateway = 'demo');

create policy "Users can create their invoices"
  on public.invoices for insert
  to authenticated
  with check (auth.uid () = user_id);

-- Demo refunds are recorded client-side by the salon owner
create policy "Venue owners can update venue transactions"
  on public.transactions for update
  to authenticated
  using (public.owns_venue (venue_id));
