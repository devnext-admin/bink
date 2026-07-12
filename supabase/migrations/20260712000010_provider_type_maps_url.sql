-- Bink hosts salons AND freelancers (independent professionals offering
-- salon-style services). Venues also get an optional Google Maps link that
-- powers "Get directions".
alter table public.venues
  add column provider_type text not null default 'salon'
    check (provider_type in ('salon', 'freelancer')),
  add column maps_url text;
