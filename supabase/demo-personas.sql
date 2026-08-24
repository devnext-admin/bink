-- Demo personas for the cloud database.
-- Run AFTER creating these auth users (Supabase admin API, password binkdemo123):
--   demo@bink.com (Deema, customer), owner@bink.com (Lama, partner),
--   admin@bink.com (Bink Admin), aisha@bink.com, maha@bink.com
-- Replace the UUIDs below if the auth users are ever recreated.

do $$
declare
  cust  uuid := '441199a2-a483-4a5f-8287-161d92f60693'; -- demo@bink.com
  owner uuid := 'ae87efae-7f87-4940-8e9f-4bb9db3a5c64'; -- owner@bink.com
  admn  uuid := 'adbe64cd-4f2a-4aa1-82b3-5bd385e6aa4c'; -- admin@bink.com
  aisha uuid := '07e1dbb0-411b-4647-a57a-39f11b82a0db'; -- aisha@bink.com
  maha  uuid := '2c206ad1-12e0-4e3d-a5b2-fb421a7566e0'; -- maha@bink.com

  glow    uuid := '00000000-0000-4000-9101-000000000001';
  glow_s1 uuid := '00000000-0000-4000-9102-000000000001'; -- Signature Cut & Style
  glow_s2 uuid := '00000000-0000-4000-9102-000000000002'; -- Full Colour
  glow_s3 uuid := '00000000-0000-4000-9102-000000000003'; -- Glow Facial
  glow_t1 uuid := '00000000-0000-4000-9103-000000000001'; -- Lama
  glow_t2 uuid := '00000000-0000-4000-9103-000000000002'; -- Rita

  velvet uuid; fade uuid; blowout uuid;
  b1 uuid := '00000000-0000-4000-9201-000000000001'; -- Deema upcoming, escrow held
  b2 uuid := '00000000-0000-4000-9201-000000000002'; -- Deema upcoming, pay at venue
  b3 uuid := '00000000-0000-4000-9201-000000000003'; -- Deema completed, awaiting confirm
  b4 uuid := '00000000-0000-4000-9201-000000000004'; -- Deema settled + reviewed
  g1 uuid := '00000000-0000-4000-9202-000000000001'; -- Aisha upcoming @ Glow
  g2 uuid := '00000000-0000-4000-9202-000000000002'; -- Maha upcoming @ Glow
  g3 uuid := '00000000-0000-4000-9202-000000000003'; -- Aisha completed @ Glow (released)
  t1 uuid := '00000000-0000-4000-9301-000000000001';
  t3 uuid := '00000000-0000-4000-9301-000000000003';
  t4 uuid := '00000000-0000-4000-9301-000000000004';
  tg1 uuid := '00000000-0000-4000-9302-000000000001';
  tg3 uuid := '00000000-0000-4000-9302-000000000003';
begin
  select id into velvet  from public.venues where slug = 'velvet-nails-lounge';
  select id into fade    from public.venues where slug = 'the-fade-room';
  select id into blowout from public.venues where slug = 'the-blowout-bar';

  -- Roles (profiles are created by the on_auth_user_created trigger).
  -- trg_lock_profile_privileges pins role changes unless the caller is already
  -- an admin, and this script runs with no auth context - without the
  -- disable/enable the updates are silently reverted and every persona stays
  -- a customer.
  alter table public.profiles disable trigger trg_lock_profile_privileges;
  update public.profiles set role = 'partner', full_name = 'Lama'       where id = owner;
  update public.profiles set role = 'admin',   full_name = 'Bink Admin' where id = admn;
  alter table public.profiles enable trigger trg_lock_profile_privileges;
  update public.profiles set full_name = 'Deema'   where id = cust;
  update public.profiles set full_name = 'Aisha B' where id = aisha;
  update public.profiles set full_name = 'Maha S'  where id = maha;

  -- ---------------------------------------------------------------------
  -- Glow & Co: the salon owned by the demo partner
  -- ---------------------------------------------------------------------
  insert into public.venues (id, slug, name, description, category_id, address, area, city, country, is_featured, highlights, owner_id, status)
  values (glow, 'glow-and-co', 'Glow & Co',
          'A boutique hair salon in the heart of Riyadh. Precision cuts, dimensional colour and glow-up facials from a close-knit team that treats every guest like a regular.',
          (select id from public.categories where name = 'Hair Salon'),
          'Olaya Towers, Tahlia St', 'Al Olaya', 'Riyadh', 'Saudi Arabia',
          false, array['Instant confirmation', 'Pay by app', 'Woman-owned'], owner, 'approved')
  on conflict (id) do nothing;

  insert into public.venue_images (venue_id, url, sort_order) values
    (glow, 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80&auto=format&fit=crop', 0),
    (glow, 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?w=1200&q=80&auto=format&fit=crop', 1)
  on conflict do nothing;

  insert into public.opening_hours (venue_id, weekday, open_time, close_time, is_closed)
  select glow, d, '10:00'::time, '22:00'::time, (d = 5) from generate_series(0, 6) d
  on conflict (venue_id, weekday) do nothing;

  insert into public.services (id, venue_id, name, description, group_name, duration_minutes, price_cents, is_featured, sort_order) values
    (glow_s1, glow, 'Signature Cut & Style', 'Consultation, precision cut and styled finish.', 'Featured', 60, 18000, true, 0),
    (glow_s2, glow, 'Full Colour', 'Full-head colour with gloss and blow dry.', 'Colour', 120, 34200, true, 1),
    (glow_s3, glow, 'Glow Facial', 'Deep-cleanse facial with LED finish.', 'Skin', 45, 11000, false, 2)
  on conflict (id) do nothing;

  insert into public.staff (id, venue_id, name, role) values
    (glow_t1, glow, 'Lama', 'Creative director'),
    (glow_t2, glow, 'Rita', 'Senior stylist')
  on conflict (id) do nothing;

  insert into public.reviews (venue_id, user_id, author_name, rating, comment) values
    (glow, aisha, 'Aisha B', 5, 'Lama understood exactly what I wanted. Best cut I have had in years.'),
    (glow, maha, 'Maha S', 5, 'Gorgeous salon and my colour came out perfect.')
  on conflict do nothing;

  -- ---------------------------------------------------------------------
  -- Deema, the demo customer
  -- ---------------------------------------------------------------------
  insert into public.favorites (user_id, venue_id)
  values (cust, velvet), (cust, fade), (cust, blowout)
  on conflict do nothing;

  -- 1) Upcoming, paid online, held in escrow
  insert into public.bookings (id, user_id, venue_id, starts_at, ends_at, status, total_cents, payment_status, payment_method)
  values (b1, cust, velvet, date_trunc('day', now()) + interval '2 days 16 hours', date_trunc('day', now()) + interval '2 days 17 hours', 'confirmed', 15000, 'paid', 'card')
  on conflict (id) do nothing;
  insert into public.booking_items (booking_id, service_id, service_name, duration_minutes, price_cents)
  select b1, id, 'Gel Manicure', 60, 15000 from public.services where venue_id = velvet and name = 'Gel Manicure' limit 1
  on conflict do nothing;
  insert into public.transactions (id, booking_id, venue_id, user_id, amount_cents, method, status, escrow_status)
  values (t1, b1, velvet, cust, 15000, 'card', 'succeeded', 'held') on conflict (id) do nothing;
  insert into public.invoices (booking_id, transaction_id, venue_id, user_id, subtotal_cents, vat_cents, total_cents)
  select b1, t1, velvet, cust, 13043, 1957, 15000
  where not exists (select 1 from public.invoices where booking_id = b1);

  -- 2) Upcoming, pay at venue
  insert into public.bookings (id, user_id, venue_id, starts_at, ends_at, status, total_cents, payment_status, payment_method)
  values (b2, cust, fade, date_trunc('day', now()) + interval '5 days 18 hours 30 minutes', date_trunc('day', now()) + interval '5 days 19 hours 15 minutes', 'confirmed', 9000, 'unpaid', 'pay_at_venue')
  on conflict (id) do nothing;
  insert into public.booking_items (booking_id, service_id, service_name, duration_minutes, price_cents)
  select b2, id, 'Classic Haircut', 45, 9000 from public.services where venue_id = fade and name = 'Classic Haircut' limit 1
  on conflict do nothing;

  -- 3) Completed by the salon, awaiting Deema's confirmation (escrow held)
  insert into public.bookings (id, user_id, venue_id, starts_at, ends_at, status, total_cents, payment_status, payment_method)
  values (b3, cust, blowout, date_trunc('day', now()) - interval '2 days' + interval '15 hours', date_trunc('day', now()) - interval '2 days' + interval '16 hours', 'completed', 16000, 'paid', 'card')
  on conflict (id) do nothing;
  insert into public.booking_items (booking_id, service_id, service_name, duration_minutes, price_cents)
  select b3, id, 'Signature Blowout', 60, 16000 from public.services where venue_id = blowout and name = 'Signature Blowout' limit 1
  on conflict do nothing;
  insert into public.transactions (id, booking_id, venue_id, user_id, amount_cents, method, status, escrow_status)
  values (t3, b3, blowout, cust, 16000, 'card', 'succeeded', 'held') on conflict (id) do nothing;
  insert into public.invoices (booking_id, transaction_id, venue_id, user_id, subtotal_cents, vat_cents, total_cents)
  select b3, t3, blowout, cust, 13913, 2087, 16000
  where not exists (select 1 from public.invoices where booking_id = b3);

  -- 4) Fully settled: completed, confirmed, escrow released, reviewed
  insert into public.bookings (id, user_id, venue_id, starts_at, ends_at, status, total_cents, payment_status, payment_method, customer_confirmed_at)
  values (b4, cust, velvet, date_trunc('day', now()) - interval '10 days' + interval '11 hours', date_trunc('day', now()) - interval '10 days' + interval '11 hours 45 minutes', 'completed', 20000, 'paid', 'card', now() - interval '9 days')
  on conflict (id) do nothing;
  insert into public.booking_items (booking_id, service_id, service_name, duration_minutes, price_cents)
  select b4, id, 'Classic Manicure', 45, 20000 from public.services where venue_id = velvet and name = 'Classic Manicure' limit 1
  on conflict do nothing;
  insert into public.transactions (id, booking_id, venue_id, user_id, amount_cents, method, status, escrow_status, released_at)
  values (t4, b4, velvet, cust, 20000, 'card', 'succeeded', 'released', now() - interval '9 days') on conflict (id) do nothing;
  insert into public.invoices (booking_id, transaction_id, venue_id, user_id, subtotal_cents, vat_cents, total_cents)
  select b4, t4, velvet, cust, 17391, 2609, 20000
  where not exists (select 1 from public.invoices where booking_id = b4);
  insert into public.reviews (venue_id, user_id, author_name, rating, comment)
  select velvet, cust, 'Deema', 5, 'Meticulous work and such a calm space. My nails have never looked better.'
  where not exists (select 1 from public.reviews where venue_id = velvet and user_id = cust);

  -- Deema <-> The Fade Room chat (venue reply unread)
  insert into public.messages (venue_id, user_id, sender, text, read_by_customer, read_by_venue, created_at)
  select fade, cust, 'customer', 'Hi! Booking for Saturday — can I get Omar if he is free?', true, true, now() - interval '1 day 3 hours'
  where not exists (select 1 from public.messages where venue_id = fade and user_id = cust);
  insert into public.messages (venue_id, user_id, sender, text, read_by_customer, read_by_venue, created_at)
  select fade, cust, 'venue', 'Hi Deema! Omar is in on Saturday — I moved your booking to him. See you then! ✂️', false, true, now() - interval '1 day'
  where (select count(*) from public.messages where venue_id = fade and user_id = cust) < 2;

  -- Deema's notifications
  insert into public.notifications (user_id, audience, title, body, is_read, created_at)
  select cust, 'customer', 'Message from The Fade Room', 'Omar is in on Saturday — I moved your booking to him. See you then!', false, now() - interval '1 day'
  where not exists (select 1 from public.notifications where user_id = cust);
  insert into public.notifications (user_id, audience, title, body, is_read, created_at)
  select cust, 'customer', 'Payment held in escrow', 'Bink holds your payment securely and releases it to Velvet Nails Lounge after your visit is confirmed.', false, now() - interval '18 hours'
  where (select count(*) from public.notifications where user_id = cust) < 2;
  insert into public.notifications (user_id, audience, title, body, is_read, created_at)
  select cust, 'customer', 'Thanks for visiting!', 'How was The Blowout Bar? Confirm your visit under Appointments to release the payment, and leave a rating.', true, now() - interval '2 days'
  where (select count(*) from public.notifications where user_id = cust) < 3;

  -- ---------------------------------------------------------------------
  -- Glow & Co activity for the demo owner
  -- ---------------------------------------------------------------------
  insert into public.bookings (id, user_id, venue_id, staff_id, starts_at, ends_at, status, total_cents, payment_status, payment_method, notes)
  values (g1, aisha, glow, glow_t1, date_trunc('day', now()) + interval '1 day 14 hours', date_trunc('day', now()) + interval '1 day 15 hours', 'confirmed', 18000, 'paid', 'card', 'First visit — shoulder-length trim.')
  on conflict (id) do nothing;
  insert into public.booking_items (booking_id, service_id, service_name, duration_minutes, price_cents)
  select g1, glow_s1, 'Signature Cut & Style', 60, 18000 where not exists (select 1 from public.booking_items where booking_id = g1);
  insert into public.transactions (id, booking_id, venue_id, user_id, amount_cents, method, status, escrow_status)
  values (tg1, g1, glow, aisha, 18000, 'card', 'succeeded', 'held') on conflict (id) do nothing;
  insert into public.invoices (booking_id, transaction_id, venue_id, user_id, subtotal_cents, vat_cents, total_cents)
  select g1, tg1, glow, aisha, 15652, 2348, 18000
  where not exists (select 1 from public.invoices where booking_id = g1);

  insert into public.bookings (id, user_id, venue_id, staff_id, starts_at, ends_at, status, total_cents, payment_status, payment_method)
  values (g2, maha, glow, glow_t2, date_trunc('day', now()) + interval '2 days 11 hours', date_trunc('day', now()) + interval '2 days 13 hours', 'confirmed', 34200, 'unpaid', 'pay_at_venue')
  on conflict (id) do nothing;
  insert into public.booking_items (booking_id, service_id, service_name, duration_minutes, price_cents)
  select g2, glow_s2, 'Full Colour', 120, 34200 where not exists (select 1 from public.booking_items where booking_id = g2);

  insert into public.bookings (id, user_id, venue_id, staff_id, starts_at, ends_at, status, total_cents, payment_status, payment_method, customer_confirmed_at)
  values (g3, aisha, glow, glow_t2, date_trunc('day', now()) - interval '6 days' + interval '17 hours', date_trunc('day', now()) - interval '6 days' + interval '17 hours 45 minutes', 'completed', 11000, 'paid', 'card', now() - interval '5 days')
  on conflict (id) do nothing;
  insert into public.booking_items (booking_id, service_id, service_name, duration_minutes, price_cents)
  select g3, glow_s3, 'Glow Facial', 45, 11000 where not exists (select 1 from public.booking_items where booking_id = g3);
  insert into public.transactions (id, booking_id, venue_id, user_id, amount_cents, method, status, escrow_status, released_at)
  values (tg3, g3, glow, aisha, 11000, 'card', 'succeeded', 'released', now() - interval '5 days') on conflict (id) do nothing;
  insert into public.invoices (booking_id, transaction_id, venue_id, user_id, subtotal_cents, vat_cents, total_cents)
  select g3, tg3, glow, aisha, 9565, 1435, 11000
  where not exists (select 1 from public.invoices where booking_id = g3);

  -- Unread customer message for the owner
  insert into public.messages (venue_id, user_id, sender, text, read_by_customer, read_by_venue, created_at)
  select glow, aisha, 'customer', 'Hi! Can I move my appointment 30 minutes later tomorrow?', true, false, now() - interval '2 hours'
  where not exists (select 1 from public.messages where venue_id = glow and user_id = aisha);

  -- Venue notifications
  insert into public.notifications (venue_id, audience, title, body, is_read, created_at)
  select glow, 'venue', 'New booking', 'Aisha B booked Signature Cut & Style — paid online, held in escrow until the visit is confirmed.', false, now() - interval '1 day'
  where not exists (select 1 from public.notifications where venue_id = glow);
  insert into public.notifications (venue_id, audience, title, body, is_read, created_at)
  select glow, 'venue', 'New message', 'Aisha B: Can I move my appointment 30 minutes later tomorrow?', false, now() - interval '2 hours'
  where (select count(*) from public.notifications where venue_id = glow) < 2;
end $$;
