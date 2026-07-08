// Moyasar webhook: settles pending transactions after 3DS / async payment.
// Deploy: npx supabase functions deploy payments-webhook --no-verify-jwt
// Secrets: npx supabase secrets set MOYASAR_WEBHOOK_TOKEN=<shared token>
// Configure the webhook in the Moyasar dashboard to POST here with the token.

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();

    // Moyasar sends the shared secret token in the payload
    const expected = Deno.env.get('MOYASAR_WEBHOOK_TOKEN');
    if (!expected || payload.secret_token !== expected) {
      return json({ error: 'Invalid webhook token' }, 401);
    }

    const payment = payload.data ?? payload;
    const gatewayRef = payment.id;
    const status = payment.status; // paid | failed | refunded ...

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tx } = await supabase
      .from('transactions')
      .select('*')
      .eq('gateway_ref', gatewayRef)
      .single();
    if (!tx) return json({ error: 'Unknown transaction' }, 404);

    if (status === 'paid' && tx.status !== 'succeeded') {
      await supabase.from('transactions').update({ status: 'succeeded' }).eq('id', tx.id);
      if (tx.booking_id) {
        await supabase.from('bookings').update({ payment_status: 'paid' }).eq('id', tx.booking_id);
        const { data: booking } = await supabase
          .from('bookings')
          .select('id, user_id, venue_id, total_cents, currency')
          .eq('id', tx.booking_id)
          .single();
        if (booking) {
          const vat = Math.round((booking.total_cents * 15) / 115);
          await supabase.from('invoices').insert({
            booking_id: booking.id,
            transaction_id: tx.id,
            venue_id: booking.venue_id,
            user_id: booking.user_id,
            subtotal_cents: booking.total_cents - vat,
            vat_cents: vat,
            total_cents: booking.total_cents,
            currency: booking.currency,
          });
        }
      }
    } else if (status === 'failed') {
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', tx.id);
    } else if (status === 'refunded') {
      await supabase.from('transactions').update({ status: 'refunded' }).eq('id', tx.id);
      if (tx.booking_id) {
        await supabase.from('bookings').update({ payment_status: 'refunded' }).eq('id', tx.booking_id);
      }
    }

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
