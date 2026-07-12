-- Link reviews to the booking they rate, so the app can tell whether a
-- past visit has already been reviewed (drives the "Rate your visit" button).
alter table public.reviews
  add column booking_id uuid references public.bookings (id) on delete set null;

create index reviews_booking_idx on public.reviews (booking_id);
