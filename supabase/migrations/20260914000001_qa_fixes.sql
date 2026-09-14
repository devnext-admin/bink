-- QA fixes 2026-09-14
-- 1. Online payments: bookings can be 'pending' payment until the gateway webhook settles.
-- 2. Business registration: bank account + legal document details (owner/admin only).
-- 3. Business accounts: new signups with role=partner metadata get the partner
--    role, and a customer may upgrade their own account to partner when they
--    register a business. Admin promotion and is_blocked stay locked down.

-- 1. Payment status ----------------------------------------------------------
alter table public.bookings drop constraint if exists bookings_payment_status_check;
alter table public.bookings add constraint bookings_payment_status_check
  check (payment_status in ('unpaid', 'pending', 'paid', 'refunded'));

-- 2. Business details --------------------------------------------------------
-- Separate table, NOT columns on venues: venues are publicly readable and the
-- IBAN / registration numbers must never reach the marketplace.
create table if not exists public.venue_business_details (
  venue_id uuid primary key references public.venues (id) on delete cascade,
  bank_name text not null,
  bank_iban text not null,
  legal_doc_type text not null
    check (legal_doc_type in ('freelance_license', 'commercial_registration')),
  legal_doc_number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.venue_business_details enable row level security;

drop policy if exists "Owner manages business details" on public.venue_business_details;
create policy "Owner manages business details"
  on public.venue_business_details for all
  using (exists (select 1 from public.venues v where v.id = venue_id and v.owner_id = auth.uid()))
  with check (exists (select 1 from public.venues v where v.id = venue_id and v.owner_id = auth.uid()));

drop policy if exists "Admins read business details" on public.venue_business_details;
create policy "Admins read business details"
  on public.venue_business_details for select
  using (public.is_admin());

-- 3. Partner role ------------------------------------------------------------
-- New signups: honor role=partner from the signup metadata (never admin).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    case when new.raw_user_meta_data ->> 'role' = 'partner' then 'partner' else 'customer' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Existing accounts: a signed-in customer may switch their own account to
-- partner (business registration). The service role (edge functions) may set
-- roles too. Everything else - self-promotion to admin, blocking - stays
-- pinned exactly as before.
create or replace function public.lock_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role) or (new.is_blocked is distinct from old.is_blocked) then
    if public.is_admin() or coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
      return new;
    end if;
    if new.role = 'partner'
       and old.role = 'customer'
       and auth.uid() = new.id
       and new.is_blocked is not distinct from old.is_blocked then
      return new;
    end if;
    new.role := old.role;
    new.is_blocked := old.is_blocked;
  end if;
  return new;
end;
$$;
