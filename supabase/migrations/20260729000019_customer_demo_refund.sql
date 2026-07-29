-- A customer cancelling their own paid booking triggers an automatic refund.
-- With the demo gateway the client writes the refund itself, so the customer
-- needs UPDATE on their own demo transactions (real gateways refund through
-- the service-role edge function instead).
create policy "Users refund their own demo transactions"
  on public.transactions for update
  using (auth.uid () = user_id and gateway = 'demo')
  with check (auth.uid () = user_id and gateway = 'demo');
