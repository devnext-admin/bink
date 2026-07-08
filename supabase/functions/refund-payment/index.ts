// Refunds a paid booking via Moyasar. Caller must own the venue or be admin.
// Deploy: npx supabase functions deploy refund-payment

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const { booking_id } = await req.json();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: userData } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: 'Not authenticated' }, 401);

    const { data: tx } = await admin
      .from('transactions')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('status', 'succeeded')
      .single();
    if (!tx) return json({ error: 'No settled payment for this booking' }, 404);

    // Authorize: venue owner or admin
    const { data: venue } = await admin.from('venues').select('owner_id').eq('id', tx.venue_id).single();
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    const allowed = venue?.owner_id === user.id || profile?.role === 'admin';
    if (!allowed) return json({ error: 'Not authorized to refund this booking' }, 403);

    const secretKey = Deno.env.get('MOYASAR_SECRET_KEY');
    if (!secretKey) return json({ error: 'Gateway not configured (set MOYASAR_SECRET_KEY)' }, 501);

    const gwRes = await fetch(`https://api.moyasar.com/v1/payments/${tx.gateway_ref}/refund`, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(secretKey + ':')}` },
    });
    const gwBody = await gwRes.json();
    if (!gwRes.ok) return json({ error: gwBody.message ?? 'Gateway refund failed' }, 502);

    await admin.from('transactions').update({ status: 'refunded' }).eq('id', tx.id);
    await admin.from('bookings').update({ payment_status: 'refunded' }).eq('id', booking_id);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
