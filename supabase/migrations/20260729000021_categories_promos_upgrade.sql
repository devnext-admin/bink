-- Bilingual categories with an optional image, and promo codes with a usage
-- limit and counter (enforced at redemption).
alter table public.categories add column if not exists name_ar text;
alter table public.categories add column if not exists image_url text;
alter table public.promo_codes add column if not exists max_uses integer;
alter table public.promo_codes add column if not exists used_count integer not null default 0;

-- Arabic names for the seeded categories
update public.categories set name_ar = 'صالون شعر' where slug = 'hair-salon' and name_ar is null;
update public.categories set name_ar = 'صالون حلاقة' where slug = 'barbershop' and name_ar is null;
update public.categories set name_ar = 'صالون أظافر' where slug = 'nail-salon' and name_ar is null;
update public.categories set name_ar = 'حواجب ورموش' where slug = 'brows-lashes' and name_ar is null;
update public.categories set name_ar = 'صالون إزالة الشعر بالشمع' where slug = 'waxing-salon' and name_ar is null;
update public.categories set name_ar = 'العناية بالبشرة وتنظيفها' where slug = 'skincare-salon' and name_ar is null;
update public.categories set name_ar = 'استوديو مكياج' where slug = 'makeup-salon' and name_ar is null;
update public.categories set name_ar = 'صالون عرائس' where slug = 'bridal-salon' and name_ar is null;

-- Admins may update promo counters and categories through existing policies;
-- redemption increments used_count via this security-definer helper so
-- customers never need update rights on promo_codes.
create or replace function public.redeem_promo(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.promo_codes
     set used_count = used_count + 1
   where code = p_code;
$$;
