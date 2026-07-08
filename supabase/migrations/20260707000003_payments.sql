-- Money layer: payment status on bookings, transactions ledger, VAT invoices.
-- Gateway (Moyasar/Tap) writes happen through edge functions with the service
-- role; RLS below only grants read access to the right parties.

alter table public.bookings
  add column payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid', 'refunded')),
  add column payment_method text not null default 'pay_at_venue'
    check (payment_method in ('pay_at_venue', 'card', 'apple_pay'));

-- ---------------------------------------------------------------------------
-- Transactions
-- ---------------------------------------------------------------------------
create table public.transactions (
  id uuid primary key default uuid_generate_v4 (),
  booking_id uuid references public.bookings (id) on delete set null,
  venue_id uuid not null references public.venues (id),
  user_id uuid references auth.users (id) on delete set null,
  amount_cents int not null,
  currency text not null default 'SAR',
  method text not null check (method in ('pay_at_venue', 'card', 'apple_pay')),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  gateway text not null default 'demo', -- 'moyasar' | 'tap' | 'demo'
  gateway_ref text, -- gateway payment id, for webhook reconciliation + refunds
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Users can view their transactions"
  on public.transactions for select using (auth.uid () = user_id);

create policy "Venue owners can view venue transactions"
  on public.transactions for select using (public.owns_venue (venue_id));

create policy "Admins can view all transactions"
  on public.transactions for select using (public.is_admin ());

create index transactions_venue_idx on public.transactions (venue_id, created_at desc);
create index transactions_user_idx on public.transactions (user_id, created_at desc);
create index transactions_booking_idx on public.transactions (booking_id);

-- ---------------------------------------------------------------------------
-- Invoices (KSA VAT 15%, issued on successful payment)
-- ---------------------------------------------------------------------------
create sequence public.invoice_number_seq;

create table public.invoices (
  id uuid primary key default uuid_generate_v4 (),
  number text not null unique
    default 'BINK-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0'),
  booking_id uuid references public.bookings (id) on delete set null,
  transaction_id uuid references public.transactions (id) on delete set null,
  venue_id uuid not null references public.venues (id),
  user_id uuid references auth.users (id) on delete set null,
  subtotal_cents int not null,
  vat_cents int not null,
  total_cents int not null,
  vat_rate numeric(4, 2) not null default 15.00,
  currency text not null default 'SAR',
  issued_at timestamptz not null default now()
);

alter table public.invoices enable row level security;

create policy "Users can view their invoices"
  on public.invoices for select using (auth.uid () = user_id);

create policy "Venue owners can view venue invoices"
  on public.invoices for select using (public.owns_venue (venue_id));

create policy "Admins can view all invoices"
  on public.invoices for select using (public.is_admin ());

create index invoices_user_idx on public.invoices (user_id, issued_at desc);
create index invoices_venue_idx on public.invoices (venue_id, issued_at desc);
