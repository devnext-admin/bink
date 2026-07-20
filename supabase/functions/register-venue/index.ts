// Creates a pending salon for a brand-new owner who has just signed up but
// has not yet confirmed their email (so they have no session). The venue is
// inserted with the service role and lands in 'pending' — an admin still has
// to approve it before it goes live, so this cannot be used to publish spam.
// Deploy: npx supabase functions deploy register-venue --no-verify-jwt

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { ownerId, venue } = await req.json();
    if (!ownerId || !venue?.slug) return json({ error: 'Missing ownerId or venue' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // The owner must be a real, freshly created auth user.
    const { data: userRes, error: uErr } = await admin.auth.admin.getUserById(ownerId);
    if (uErr || !userRes?.user) return json({ error: 'Owner account not found' }, 404);

    const { data: v, error } = await admin
      .from('venues')
      .insert({
        slug: venue.slug,
        name: venue.name,
        description: venue.description,
        category_id: venue.category_id,
        owner_id: ownerId,
        status: 'pending',
        provider_type: venue.provider_type,
        maps_url: venue.maps_url,
        address: venue.address,
        area: venue.area,
        city: venue.city,
        country: venue.country,
        highlights: venue.highlights,
        is_new: true,
      })
      .select('id')
      .single();
    if (error || !v) return json({ error: error?.message ?? 'Insert failed' }, 500);

    if (Array.isArray(venue.images) && venue.images.length) {
      await admin.from('venue_images').insert(
        venue.images.map((im: any) => ({ venue_id: v.id, url: im.url, sort_order: im.sort_order }))
      );
    }
    if (Array.isArray(venue.hours) && venue.hours.length) {
      await admin.from('opening_hours').insert(venue.hours.map((h: any) => ({ venue_id: v.id, ...h })));
    }
    if (Array.isArray(venue.services) && venue.services.length) {
      await admin.from('services').insert(
        venue.services.map(({ id: _id, venue_id: _v, ...s }: any) => ({ ...s, venue_id: v.id }))
      );
    }
    if (Array.isArray(venue.staff) && venue.staff.length) {
      await admin.from('staff').insert(
        venue.staff.map((m: any) => ({ venue_id: v.id, name: m.name, role: m.role }))
      );
    }

    // Ensure the owner carries the partner role once approved.
    await admin.from('profiles').update({ role: 'partner' }).eq('id', ownerId);

    return json({ id: v.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
