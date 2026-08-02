-- Platform "Bink Support" venue: gives admins a venue identity to message
-- customers from (the messages model is always venue <-> user). Approved so
-- the name resolves for customers; the app hides it from public listings.
insert into public.venues (slug, name, description, city, country, owner_id, status)
select
  'bink-support',
  'Bink Support',
  'Official Bink support. We message you here about your bookings.',
  'Riyadh',
  'Saudi Arabia',
  p.id,
  'approved'
from public.profiles p
where p.role = 'admin'
  and not exists (select 1 from public.venues v where v.slug = 'bink-support')
order by p.created_at
limit 1;
