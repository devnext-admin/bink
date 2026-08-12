// TAP webhook: settles pending transactions after the hosted-page payment.
// TAP POSTs the charge object here (configured per charge via `post.url`).
// The payload is never trusted - the charge is re-fetched from TAP's API
// with the secret key before anything is written.
//
// Deploy:  npx supabase functions deploy payments-webhook --no-verify-jwt
// Secrets: npx supabase secrets set TAP_SECRET_KEY=sk_live_...

import { createClient } from 'jsr:@supabase/supabase-js@2';

const TAP_CHARGES = 'https://api.tap.company/v2/charges';
const VAT_RATE = 15;

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const chargeId: string | undefined = payload?.id;
    if (!chargeId || !chargeId.startsWith('chg_')) return json({ error: 'No charge id' }, 400);

    const secretKey = Deno.env.get('TAP_SECRET_KEY');
    if (!secretKey) return json({ error: 'Gateway not configured' }, 501);

    // Source of truth: TAP's API, not the webhook body
    const gwRes = await fetch(`${TAP_CHARGES}/${chargeId}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const charge = await gwRes.json();
    if (!gwRes.ok || !charge?.id) return json({ error: 'Charge lookup failed' }, 502);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: tx } = await supabase
      .from('transactions')
      .select('*')
      .eq('gateway_ref', charge.id)
      .single();
    if (!tx) return json({ error: 'Unknown transaction' }, 404);

    const status: string = charge.status; // CAPTURED | FAILED | DECLINED | CANCELLED ...

    if (status === 'CAPTURED' && tx.status !== 'succeeded') {
      await supabase
        .from('transactions')
        .update({ status: 'succeeded', escrow_status: 'held' })
        .eq('id', tx.id);

      if (tx.booking_id) {
        await supabase
          .from('bookings')
          .update({ payment_status: 'paid' })
          .eq('id', tx.booking_id);

        const { data: booking } = await supabase
          .from('bookings')
          .select('id, user_id, venue_id, total_cents, currency')
          .eq('id', tx.booking_id)
          .single();

        if (booking) {
          // One invoice per booking
          const { data: existingInv } = await supabase
            .from('invoices')
            .select('id')
            .eq('booking_id', booking.id)
            .maybeSingle();
          if (!existingInv) {
            const vat = Math.round((booking.total_cents * VAT_RATE) / (100 + VAT_RATE));
            await supabase.from('invoices').insert({
              booking_id: booking.id,
              transaction_id: tx.id,
              venue_id: booking.venue_id,
              user_id: booking.user_id,
              subtotal_cents: booking.total_cents - vat,
              vat_cents: vat,
              total_cents: booking.total_cents,
            });
          }

          const { data: venue } = await supabase
            .from('venues')
            .select('name')
            .eq('id', booking.venue_id)
            .single();
          const amount = `${(booking.total_cents / 100).toFixed(2)} ${booking.currency}`;
          await supabase.from('notifications').insert([
            {
              audience: 'customer',
              user_id: booking.user_id,
              venue_id: booking.venue_id,
              title: 'Payment held in escrow',
              body: `Your payment of ${amount} is held securely by Bink and released to ${venue?.name ?? 'the salon'} after your visit is confirmed.`,
            },
            {
              audience: 'venue',
              venue_id: booking.venue_id,
              title: 'Payment received',
              body: `${amount} paid online - held in escrow until the visit is confirmed.`,
            },
          ]);
        }
      }
    } else if (
      (status === 'FAILED' || status === 'DECLINED' || status === 'CANCELLED') &&
      tx.status === 'pending'
    ) {
      await supabase.from('transactions').update({ status: 'failed' }).eq('id', tx.id);
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
