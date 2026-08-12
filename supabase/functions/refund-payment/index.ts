// Refunds a booking's TAP charge. Callable by the platform admin or by the
// customer who paid (their cancellation flow refunds automatically).
//
// Deploy:  npx supabase functions deploy refund-payment
// Secrets: npx supabase secrets set TAP_SECRET_KEY=sk_live_...

import { createClient } from 'jsr:@supabase/supabase-js@2';

const TAP_REFUNDS = 'https://api.tap.company/v2/refunds';

Deno.serve(async (req) => {
  try {
    const { booking_id } = await req.json();
    if (!booking_id) return json({ error: 'booking_id required' }, 400);

    const supabase = createClient(
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

    const { data: tx } = await supabase
      .from('transactions')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('status', 'succeeded')
      .maybeSingle();
    if (!tx) return json({ error: 'No settled payment for this booking' }, 404);

    // Authorization: platform admin, or the customer who paid
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isAdmin = profile?.role === 'admin';
    if (!isAdmin && tx.user_id !== user.id) return json({ error: 'Not allowed' }, 403);

    const secretKey = Deno.env.get('TAP_SECRET_KEY');
    if (!secretKey) return json({ error: 'Gateway not configured (set TAP_SECRET_KEY)' }, 501);

    if (tx.gateway === 'tap' && tx.gateway_ref) {
      const gwRes = await fetch(TAP_REFUNDS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secretKey}`,
        },
        body: JSON.stringify({
          charge_id: tx.gateway_ref,
          amount: Number((tx.amount_cents / 100).toFixed(2)),
          currency: tx.currency,
          reason: 'requested_by_customer',
          metadata: { booking_id },
        }),
      });
      const refund = await gwRes.json();
      if (!gwRes.ok || !refund?.id) {
        return json({ error: refund?.errors?.[0]?.description ?? 'Refund failed at gateway' }, 502);
      }
    }

    await supabase
      .from('transactions')
      .update({ status: 'refunded', escrow_status: 'refunded' })
      .eq('id', tx.id);
    await supabase.from('bookings').update({ payment_status: 'refunded' }).eq('id', booking_id);
    await supabase.from('notifications').insert({
      audience: 'customer',
      user_id: tx.user_id,
      venue_id: tx.venue_id,
      title: 'Refund issued',
      body: `Your payment of ${(tx.amount_cents / 100).toFixed(2)} ${tx.currency} was refunded to your original payment method.`,
    });

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
