// Creates a gateway payment for a booking and records a pending transaction.
// Deploy: npx supabase functions deploy create-payment
// Secrets: npx supabase secrets set MOYASAR_SECRET_KEY=sk_... APP_URL=https://bink-three.vercel.app
//
// Client calls: supabase.functions.invoke('create-payment', { body: { booking_id, amount_cents, currency, method, source? } })

import { createClient } from 'jsr:@supabase/supabase-js@2';

const MOYASAR_API = 'https://api.moyasar.com/v1/payments';

Deno.serve(async (req) => {
  try {
    const { booking_id, amount_cents, currency = 'SAR', method = 'card', source } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Authenticated user from the caller's JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: userData } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: 'Not authenticated' }, 401);

    // Validate the booking belongs to the caller and the amount matches
    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('id, user_id, venue_id, total_cents, currency, payment_status')
      .eq('id', booking_id)
      .single();
    if (bErr || !booking) return json({ error: 'Booking not found' }, 404);
    if (booking.user_id !== user.id) return json({ error: 'Not your booking' }, 403);
    if (booking.payment_status === 'paid') return json({ error: 'Already paid' }, 409);
    if (booking.total_cents !== amount_cents) return json({ error: 'Amount mismatch' }, 400);

    const secretKey = Deno.env.get('MOYASAR_SECRET_KEY');
    if (!secretKey) return json({ error: 'Gateway not configured (set MOYASAR_SECRET_KEY)' }, 501);

    // Create the Moyasar payment. `source` comes from the client SDK
    // (card token / Apple Pay token).
    const gwRes = await fetch(MOYASAR_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${btoa(secretKey + ':')}`,
      },
      body: JSON.stringify({
        amount: amount_cents,
        currency,
        description: `Bink booking ${booking_id}`,
        callback_url: `${Deno.env.get('APP_URL') ?? ''}/appointments`,
        metadata: { booking_id, user_id: user.id },
        source,
      }),
    });
    const gwPayment = await gwRes.json();
    if (!gwRes.ok) return json({ error: gwPayment.message ?? 'Gateway error' }, 502);

    const settled = gwPayment.status === 'paid';
    const { data: tx, error: tErr } = await supabase
      .from('transactions')
      .insert({
        booking_id,
        venue_id: booking.venue_id,
        user_id: user.id,
        amount_cents,
        currency,
        method,
        status: settled ? 'succeeded' : 'pending',
        gateway: 'moyasar',
        gateway_ref: gwPayment.id,
      })
      .select('*')
      .single();
    if (tErr) return json({ error: tErr.message }, 500);

    if (settled) await settleBooking(supabase, booking_id, tx.id);

    // For 3DS the client redirects the user to gwPayment.source.transaction_url;
    // the webhook settles the transaction afterwards.
    return json({
      transaction: tx,
      requires_action: !settled,
      redirect_url: gwPayment.source?.transaction_url ?? null,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

async function settleBooking(supabase: any, bookingId: string, transactionId: string) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, user_id, venue_id, total_cents, currency, payment_method')
    .eq('id', bookingId)
    .single();
  if (!booking) return;

  await supabase
    .from('bookings')
    .update({ payment_status: 'paid' })
    .eq('id', bookingId);

  // KSA VAT 15%, prices VAT-inclusive
  const vat = Math.round((booking.total_cents * 15) / 115);
  await supabase.from('invoices').insert({
    booking_id: bookingId,
    transaction_id: transactionId,
    venue_id: booking.venue_id,
    user_id: booking.user_id,
    subtotal_cents: booking.total_cents - vat,
    vat_cents: vat,
    total_cents: booking.total_cents,
    currency: booking.currency,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
