// Canonical seed data for Bink. `generate-seed.mjs` expands this into
// supabase/seed.sql and src/data/demo.json so the app and DB always match.

const img = (id, w = 1200) => `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

// Bink is a salon platform: every category is a salon type.
export const categories = [
  { id: 1, slug: 'hair-salon', name: 'Hair Salon', icon: 'cut-outline' },
  { id: 2, slug: 'barbershop', name: 'Barbershop', icon: 'man-outline' },
  { id: 3, slug: 'nail-salon', name: 'Nail Salon', icon: 'color-palette-outline' },
  { id: 4, slug: 'brows-lashes', name: 'Eyebrows & Lashes', icon: 'eye-outline' },
  { id: 5, slug: 'waxing-salon', name: 'Waxing Salon', icon: 'leaf-outline' },
  { id: 6, slug: 'skincare-salon', name: 'Facials & Skincare', icon: 'sparkles-outline' },
  { id: 7, slug: 'makeup-salon', name: 'Makeup Studio', icon: 'rose-outline' },
  { id: 8, slug: 'bridal-salon', name: 'Bridal Salon', icon: 'heart-outline' },
];

const HOURS = { open: '10:00', close: '22:00', closedWeekday: 0 }; // Sunday closed

// Deterministic UUIDs (v4-shaped, fixed) so demo data and DB rows share ids.
const vid = (n) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const sid = (v, n) => `00000000-0000-4000-9${String(v).padStart(3, '0')}-0000000000${String(n).padStart(2, '0')}`;
const stid = (v, n) => `00000000-0000-4000-a${String(v).padStart(3, '0')}-0000000000${String(n).padStart(2, '0')}`;
const rid = (v, n) => `00000000-0000-4000-b${String(v).padStart(3, '0')}-0000000000${String(n).padStart(2, '0')}`;

const reviewPool = [
  { author: 'Sara A', rating: 5, comment: 'Amazing experience from start to finish. The team is so welcoming and the results were perfect.' },
  { author: 'Norah M', rating: 5, comment: 'Best booking experience I have had. Walked in and everything was ready for me.' },
  { author: 'Reem K', rating: 4, comment: 'Great service and lovely atmosphere. Slightly busy on weekends but worth it.' },
  { author: 'Lina H', rating: 5, comment: 'Absolutely in love with the results. Professional, clean and friendly staff.' },
  { author: 'Dana F', rating: 5, comment: 'My go-to place now. The attention to detail is unmatched.' },
  { author: 'Aisha B', rating: 4, comment: 'Very professional team and beautiful interior. Will definitely come back.' },
  { author: 'Maha S', rating: 5, comment: 'Effortless booking and outstanding service. Highly recommend to everyone.' },
  { author: 'Yara T', rating: 5, comment: 'The staff really listen to what you want. Left feeling brand new!' },
];

const venueDefs = [
  {
    n: 1, slug: 'glow-lash-studio', name: 'Glow Lash Studio', cat: 4,
    area: 'An Nuzhah', city: 'Riyadh', country: 'Saudi Arabia', address: 'An Nuzhah District, Olaya St',
    flags: { featured: true },
    desc: 'Step into the peaceful world of Glow Lash Studio. We are all about perfect lashes and brows, offering expert lash extensions, lash lifts, eyebrow shaping and manicures. Our studio is designed like a relaxing bamboo spa, creating a calm and soothing atmosphere where quality and cleanliness come first.',
    highlights: ['Instant confirmation', 'Pay by app', 'Parking available', 'Woman-owned'],
    images: ['photo-1633681926022-84c23e8cb2d6', 'photo-1571875257727-256c39da42af', 'photo-1583209814683-c023dd293cc6'],
    services: [
      ['Classic Lash Extensions', 'Featured', 120, 55000, 'Achieve the most natural look with our classic lash extensions, individually applied to enhance length, curl and thickness.'],
      ['Brow Shaping', 'Featured', 20, 5000, 'Define and sculpt your brows with precision threading, leaving you with clean and beautifully shaped eyebrows.'],
      ['Lash Removal', 'Featured', 20, 10000, 'Our gentle lash removal service safely removes eyelash extensions while preserving your natural lashes.'],
      ['Lashes & Brows Lift', 'Featured', 80, 80000, 'A complete lift package for lashes and brows for a naturally polished look.', 6],
      ['Volume Lash Set', 'Lashes', 150, 65000, 'Full volume set with handmade fans for a dramatic, fluffy finish.'],
      ['Lash Refill (2 weeks)', 'Lashes', 60, 25000, 'Keep your set full with a two-week refill by our lash masters.'],
      ['Brow Lamination', 'Brows', 45, 20000, 'Fuller, fluffier brows that stay in place for up to 8 weeks.'],
      ['Classic Manicure', 'Nails', 45, 8000, 'A classic manicure with shaping, cuticle care and polish.'],
    ],
    staff: [['Ainura', 'Lash master'], ['Gulzira', 'Lash master'], ['Madelaine', 'Nail master']],
  },
  {
    n: 2, slug: 'the-fade-room', name: 'The Fade Room', cat: 2,
    area: 'Corniche', city: 'Al Khobar', country: 'Saudi Arabia', address: 'Prince Turki St',
    flags: { featured: true },
    desc: 'A modern barbershop for the modern gentleman. Precision fades, classic cuts, hot towel shaves and beard sculpting from award-winning barbers in a relaxed, stylish space.',
    highlights: ['Instant confirmation', 'Pay by app', 'Walk-ins welcome'],
    images: ['photo-1585747860715-2ba37e788b70', 'photo-1560066984-138dadb4c035', 'photo-1631729371254-42c2892f0e6e'],
    services: [
      ['Skin Fade + Beard Sculpt', 'Featured', 60, 12000, 'Our signature combo: a razor-sharp skin fade with a fully sculpted beard finish.', 10],
      ['Classic Haircut', 'Featured', 45, 9000, 'Consultation, cut and style with premium products.'],
      ['Hot Towel Shave', 'Featured', 30, 7000, 'Traditional straight-razor shave with hot towels and soothing balm.'],
      ['Beard Trim & Line Up', 'Beard', 25, 5000, 'Precision beard shaping with sharp lines and natural fades.'],
      ['Kids Haircut', 'Hair', 30, 6000, 'Patient, friendly cuts for the little gentlemen.'],
      ['Head Shave', 'Hair', 30, 6500, 'Clean full head shave with hot lather and aftercare.'],
    ],
    staff: [['Omar', 'Master barber'], ['Khalid', 'Barber'], ['Marco', 'Senior barber']],
  },
  {
    n: 3, slug: 'the-blowout-bar', name: 'The Blowout Bar', cat: 1,
    area: 'Ash Shati', city: 'Jeddah', country: 'Saudi Arabia', address: 'Prince Faisal Bin Fahd Rd',
    flags: { featured: true },
    desc: 'Jeddah’s destination for perfect hair, fast. Signature blowouts, glossy styling, braids and treatments — walk in polished, walk out camera-ready.',
    highlights: ['Instant confirmation', 'Walk-ins welcome', 'Parking available'],
    images: ['photo-1600948836101-f9ffda59d250', 'photo-1500840216050-6ffa99d75160', 'photo-1596178065887-1198b6148b2b'],
    services: [
      ['Signature Blowout', 'Featured', 45, 14000, 'Wash, blow dry and finish — smooth, bouncy or beach waves.'],
      ['Express Blowout', 'Featured', 30, 10000, 'In a rush? Dry styling in half an hour.'],
      ['Glass Hair Gloss', 'Styling', 60, 22000, 'High-shine gloss treatment with sleek finish.'],
      ['Braided Updo', 'Styling', 60, 18000, 'Event-ready braids and updos by our stylists.'],
      ['Deep Repair Treatment', 'Treatments', 45, 16000, 'Intense mask and scalp massage for tired hair.'],
      ['Silk Press', 'Styling', 90, 28000, 'Smooth, natural silk press with heat protection.'],
    ],
    staff: [['Anong', 'Senior stylist'], ['Mei', 'Stylist'], ['Priya', 'Stylist']],
  },
  {
    n: 4, slug: 'velvet-nails-lounge', name: 'Velvet Nails Lounge', cat: 3,
    area: 'Al Olaya', city: 'Riyadh', country: 'Saudi Arabia', address: 'Olaya Towers, Tahlia St',
    flags: { featured: true },
    desc: 'Luxury nail artistry in the heart of Riyadh. From flawless gel manicures to bespoke nail art, our masters treat every set as a canvas.',
    highlights: ['Instant confirmation', 'Pay by app', 'Woman-owned', 'Adults only'],
    images: ['photo-1583209814683-c023dd293cc6', 'photo-1556228720-195a672e8a03', 'photo-1633681926022-84c23e8cb2d6'],
    services: [
      ['Gel Manicure', 'Featured', 60, 15000, 'Long-lasting gel polish with meticulous cuticle care and shaping.'],
      ['Luxury Spa Pedicure', 'Featured', 75, 20000, 'A pampering pedicure with sugar scrub, mask and hot towels.', 15],
      ['Acrylic Full Set', 'Featured', 105, 28000, 'Sculpted acrylic extensions in your choice of shape and length.'],
      ['Nail Art (per nail)', 'Nail Art', 10, 1500, 'Hand-painted designs, chrome, foils and crystals.'],
      ['Gel Removal', 'Nails', 20, 4000, 'Gentle soak-off removal that protects your natural nail.'],
      ['Classic Manicure', 'Nails', 45, 9000, 'Shape, buff, cuticle care and classic polish.'],
      ['BIAB Overlay', 'Nails', 75, 18000, 'Builder gel overlay for stronger natural nails.'],
    ],
    staff: [['Jenny', 'Nail artist'], ['Thao', 'Senior nail tech'], ['Rania', 'Nail tech']],
  },
  {
    n: 5, slug: 'marble-and-mane', name: 'Marble & Mane Hair Studio', cat: 1,
    area: 'Hittin', city: 'Riyadh', country: 'Saudi Arabia', address: 'Prince Turki Al Awwal Rd',
    flags: { featured: true },
    desc: 'A destination hair studio for cuts, colour and transformations. Our stylists train internationally and specialise in balayage, precision cutting and healthy-hair treatments.',
    highlights: ['Instant confirmation', 'Pay by app', 'Complimentary drinks'],
    images: ['photo-1560066984-138dadb4c035', 'photo-1600948836101-f9ffda59d250', 'photo-1633681926022-84c23e8cb2d6'],
    services: [
      ['Cut & Blow Dry', 'Featured', 60, 18000, 'Consultation, precision cut and a bouncy blow dry finish.'],
      ['Full Balayage', 'Featured', 180, 75000, 'Hand-painted colour melt with toner and treatment.', 10],
      ['Root Colour', 'Colour', 90, 30000, 'Full root coverage with premium ammonia-free colour.'],
      ['Keratin Smoothing', 'Treatments', 150, 60000, 'Frizz-free, glossy hair for up to 4 months.'],
      ['Olaplex Repair Ritual', 'Treatments', 45, 20000, 'Bond-building treatment for stronger, healthier hair.'],
      ['Bridal Hair Trial', 'Styling', 90, 35000, 'Full bridal styling session with our senior stylist.'],
    ],
    staff: [['Elena', 'Creative director'], ['Sophie', 'Colour specialist'], ['Amir', 'Senior stylist']],
  },
  {
    n: 6, slug: 'pure-skin-studio', name: 'Pure Skin Studio', cat: 6,
    area: 'Al Hamra', city: 'Jeddah', country: 'Saudi Arabia', address: 'Prince Sultan Rd',
    flags: { isNew: true },
    desc: 'A skincare salon devoted to the glow: deep-cleansing facials, gentle peels, dermaplaning and LED — tailored to your skin by certified estheticians.',
    highlights: ['Instant confirmation', 'Certified estheticians', 'Parking available'],
    images: ['photo-1631729371254-42c2892f0e6e', 'photo-1540555700478-4be289fbecef', 'photo-1507652313519-d4e9174996dd'],
    services: [
      ['Signature Glow Facial', 'Featured', 60, 30000, 'Deep cleanse, exfoliation, extraction and hydration boost.'],
      ['HydraFacial Deluxe', 'Featured', 60, 45000, 'Deep cleanse, exfoliation, extraction and antioxidant infusion.'],
      ['Gentle Enzyme Peel', 'Skin', 45, 25000, 'Brightening peel customised to your skin goals.'],
      ['Dermaplaning + Mask', 'Skin', 45, 22000, 'Smooth, peach-fuzz-free skin with a soothing finish mask.'],
      ['LED Light Therapy', 'Skin', 30, 15000, 'Calming, collagen-boosting LED session.'],
    ],
    staff: [['Hala', 'Lead esthetician'], ['Nour', 'Esthetician'], ['Farah', 'Esthetician']],
  },
  {
    n: 7, slug: 'the-nail-atelier', name: 'The Nail Atelier', cat: 3,
    area: 'Al Malqa', city: 'Riyadh', country: 'Saudi Arabia', address: 'Anas Ibn Malik Rd',
    flags: { isNew: true },
    desc: 'A boutique nail studio where minimalist design meets meticulous craft. Specialists in Russian manicure, BIAB and editorial nail art.',
    highlights: ['Instant confirmation', 'Woman-owned', 'By appointment only'],
    images: ['photo-1556228720-195a672e8a03', 'photo-1583209814683-c023dd293cc6', 'photo-1540555700478-4be289fbecef'],
    services: [
      ['Russian Manicure + Gel', 'Featured', 90, 22000, 'Ultra-precise dry manicure with flawless gel application.'],
      ['BIAB Natural Overlay', 'Featured', 75, 19000, 'Strengthen and grow your natural nails with builder gel.'],
      ['Pedicure + Gel', 'Pedicure', 90, 24000, 'Complete pedicure with long-wear gel polish.'],
      ['French Tips', 'Nail Art', 30, 6000, 'Timeless hand-painted french in any shade.'],
      ['Nail Repair (per nail)', 'Nails', 15, 2000, 'Crack and break repair that blends invisibly.'],
    ],
    staff: [['Kateryna', 'Master nail artist'], ['Alina', 'Nail artist'], ['Joud', 'Nail tech']],
  },
  {
    n: 8, slug: 'smooth-and-co-waxing', name: 'Smooth & Co Waxing Salon', cat: 5,
    area: 'Ash Shati', city: 'Dammam', country: 'Saudi Arabia', address: 'Prince Mohammed Bin Fahd Rd',
    flags: { isNew: true },
    desc: 'The waxing specialists. Gentle low-temperature wax, spotless private rooms and therapists who make it quick, clean and comfortable.',
    highlights: ['Instant confirmation', 'Pay by app', 'Private rooms', 'Woman-owned'],
    images: ['photo-1507652313519-d4e9174996dd', 'photo-1540555700478-4be289fbecef', 'photo-1596178065887-1198b6148b2b'],
    services: [
      ['Full Body Wax', 'Featured', 90, 32000, 'Head-to-toe smoothness with gentle, low-temp wax.'],
      ['Full Legs Wax', 'Featured', 40, 14000, 'Silky legs in under an hour.'],
      ['Underarm Wax', 'Waxing', 15, 5000, 'Quick and gentle underarm waxing.'],
      ['Full Arms Wax', 'Waxing', 30, 10000, 'Complete arm waxing with soothing aftercare.'],
      ['Full Face Threading', 'Threading', 30, 9000, 'Precise full-face hair removal with thread.'],
    ],
    staff: [['Grace', 'Wax specialist'], ['Marta', 'Wax specialist'], ['Ivy', 'Therapist']],
  },
  {
    n: 9, slug: 'brow-bar-co', name: 'Brow Bar Co', cat: 4,
    area: 'As Sulimaniyah', city: 'Riyadh', country: 'Saudi Arabia', address: 'Prince Mmd bin Abdulaziz Rd',
    flags: { isNew: true },
    desc: 'The brow specialists. Threading, tinting, lamination and henna brows perfected in minutes — walk in, glow out.',
    highlights: ['Walk-ins welcome', 'Pay by app', 'Woman-owned'],
    images: ['photo-1571875257727-256c39da42af', 'photo-1500840216050-6ffa99d75160', 'photo-1583209814683-c023dd293cc6'],
    services: [
      ['Brow Threading', 'Featured', 15, 4000, 'Clean, precise brow shaping with traditional threading.'],
      ['Brow Lamination + Tint', 'Featured', 60, 22000, 'Brushed-up, fuller brows with a perfectly matched tint.', 10],
      ['Henna Brows', 'Brows', 45, 15000, 'Natural henna staining for fuller-looking brows up to 6 weeks.'],
      ['Lash Lift + Tint', 'Lashes', 60, 25000, 'Curled, darkened natural lashes — mascara optional.'],
      ['Full Face Threading', 'Threading', 30, 9000, 'Complete facial hair removal with thread.'],
    ],
    staff: [['Zainab', 'Brow artist'], ['Hessa', 'Brow artist'], ['Mona', 'Lash tech']],
  },
  {
    n: 10, slug: 'the-glam-room', name: 'The Glam Room', cat: 7,
    area: 'Corniche', city: 'Jeddah', country: 'Saudi Arabia', address: 'North Corniche Rd',
    flags: { trending: true },
    desc: 'Jeddah’s go-to makeup studio for events, weddings and photoshoots. Senior artists, premium products and a look that lasts all night.',
    highlights: ['Instant confirmation', 'Sea view', 'Parking available', 'Woman-owned'],
    images: ['photo-1500840216050-6ffa99d75160', 'photo-1583209814683-c023dd293cc6', 'photo-1571875257727-256c39da42af'],
    services: [
      ['Full Glam Makeup', 'Featured', 75, 40000, 'Occasion-ready full face by our senior artists.'],
      ['Soft Glam Makeup', 'Featured', 60, 30000, 'Natural, radiant makeup for daytime events.'],
      ['Bridal Makeup Trial', 'Bridal', 90, 45000, 'Try your wedding look before the big day.'],
      ['Lash Application', 'Add-ons', 15, 6000, 'Strip or individual lashes applied to perfection.'],
      ['Makeup Lesson (1:1)', 'Lessons', 90, 50000, 'Personal masterclass with your own products.'],
    ],
    staff: [['Layla', 'Senior makeup artist'], ['Kim', 'Makeup artist'], ['Amani', 'Makeup artist']],
  },
  {
    n: 11, slug: 'gentlemens-quarter', name: "Gentlemen's Quarter", cat: 2,
    area: 'King Fahd District', city: 'Riyadh', country: 'Saudi Arabia', address: 'King Fahd Rd',
    flags: { trending: true },
    desc: 'Riyadh’s premium grooming lounge: sharp cuts, royal shaves, facials for men and a complimentary espresso bar.',
    highlights: ['Instant confirmation', 'Pay by app', 'Espresso bar'],
    images: ['photo-1585747860715-2ba37e788b70', 'photo-1560066984-138dadb4c035', 'photo-1600948836101-f9ffda59d250'],
    services: [
      ['Executive Cut & Style', 'Featured', 60, 15000, 'Tailored cut, wash and style with premium finish.'],
      ['Royal Shave', 'Featured', 45, 11000, 'Hot towels, straight razor, facial massage — the full ritual.'],
      ['Gentleman’s Facial', 'Grooming', 45, 18000, 'Deep-cleansing facial designed for men’s skin.'],
      ['Hair + Beard Combo', 'Hair', 75, 19000, 'Complete grooming: cut, beard sculpt and style.', 12],
      ['Grey Blending', 'Colour', 45, 14000, 'Subtle, natural-looking grey coverage.'],
    ],
    staff: [['Hassan', 'Master barber'], ['Tony', 'Senior barber'], ['Youssef', 'Barber']],
  },
  {
    n: 12, slug: 'bloom-beauty-salon', name: 'Bloom Beauty Salon', cat: 8,
    area: 'Al Rawdah', city: 'Jeddah', country: 'Saudi Arabia', address: 'Sari St',
    flags: { trending: true },
    desc: 'Your everything salon: hair, makeup, nails and waxing under one roof. Trusted by Jeddah’s brides for over a decade.',
    highlights: ['Instant confirmation', 'Woman-owned', 'Bridal packages'],
    images: ['photo-1571875257727-256c39da42af', 'photo-1540555700478-4be289fbecef', 'photo-1596178065887-1198b6148b2b'],
    services: [
      ['Blow Dry & Style', 'Featured', 45, 12000, 'Wash and professional blow dry, straight or curled.'],
      ['Full Face Makeup', 'Featured', 60, 35000, 'Occasion-ready glam by our senior makeup artists.'],
      ['Hair Colour (full)', 'Colour', 120, 40000, 'Full-head colour with gloss finish.'],
      ['Full Body Wax', 'Waxing', 90, 30000, 'Complete waxing with gentle, low-temp wax.'],
      ['Bridal Package', 'Bridal', 240, 150000, 'Hair, makeup, nails and lashes for your big day.', 8],
      ['Hair Treatment Mask', 'Treatments', 30, 10000, 'Intense repair mask with scalp massage.'],
    ],
    staff: [['Abeer', 'Salon director'], ['Shatha', 'Makeup artist'], ['Noura', 'Stylist']],
  },
];

export const promos = [
  { id: 1, code: 'WELCOME10', pct_off: 10, is_active: true, expires_at: null },
  { id: 2, code: 'BINK20', pct_off: 20, is_active: true, expires_at: '2026-12-31T23:59:59Z' },
];

export function buildData() {
  const venues = venueDefs.map((v, vi) => {
    const id = vid(v.n);
    const reviews = Array.from({ length: 4 + (v.n % 3) }, (_, i) => {
      const r = reviewPool[(v.n + i * 3) % reviewPool.length];
      return {
        id: rid(v.n, i + 1),
        venue_id: id,
        author_name: r.author,
        rating: r.rating,
        comment: r.comment,
        created_at: `2026-0${(v.n % 6) + 1}-${String((i * 5 + 3) % 27 + 1).padStart(2, '0')}T1${i}:00:00Z`,
      };
    });
    const ratingCount = 40 + v.n * 37;
    const ratingAvg = (4.6 + ((v.n * 7) % 5) * 0.1).toFixed(1);
    return {
      id,
      slug: v.slug,
      name: v.name,
      description: v.desc,
      category_id: v.cat,
      address: v.address,
      area: v.area,
      city: v.city,
      country: v.country,
      rating_avg: Number(ratingAvg) > 5 ? 5.0 : Number(ratingAvg),
      rating_count: ratingCount,
      is_featured: !!v.flags.featured,
      is_new: !!v.flags.isNew,
      is_trending: !!v.flags.trending,
      highlights: v.highlights,
      images: v.images.map((p, i) => ({ url: img(p), sort_order: i })),
      services: v.services.map(([name, group, duration, price, desc, discount], i) => ({
        id: sid(v.n, i + 1),
        venue_id: id,
        name,
        group_name: group,
        duration_minutes: duration,
        price_cents: price,
        currency: v.country === 'UAE' ? 'AED' : 'SAR',
        description: desc,
        discount_pct: discount || 0,
        is_featured: group === 'Featured',
        sort_order: i,
      })),
      staff: v.staff.map(([name, role], i) => ({
        id: stid(v.n, i + 1),
        venue_id: id,
        name,
        role,
        rating: 4.8 + ((v.n + i) % 3) * 0.1,
      })),
      reviews,
      hours: Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        open_time: weekday === HOURS.closedWeekday ? null : HOURS.open,
        close_time: weekday === HOURS.closedWeekday ? null : HOURS.close,
        is_closed: weekday === HOURS.closedWeekday,
      })),
    };
  });
  return { categories, venues, promos };
}
