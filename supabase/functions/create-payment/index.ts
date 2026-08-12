// Creates a TAP charge for a booking and records a pending transaction.
// The customer completes payment on TAP's hosted page (card, mada, Apple Pay);
// the payments-webhook function settles the transaction afterwards.
//
// Deploy:  npx supabase functions deploy create-payment
// Secrets: npx supabase secrets set TAP_SECRET_KEY=sk_live_... APP_URL=https://bink-three.vercel.app

import { createClient } from 'jsr:@supabase/supabase-js@2';

const TAP_CHARGES = 'https://api.tap.company/v2/charges';

Deno.serve(async (req) => {
  try {
    const { booking_id, amount_cents, currency = 'SAR', method = 'card' } = await req.json();

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

    const secretKey = Deno.env.get('TAP_SECRET_KEY');
    if (!secretKey) return json({ error: 'Gateway not configured (set TAP_SECRET_KEY)' }, 501);

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle();

    const appUrl = Deno.env.get('APP_URL') ?? 'https://bink-three.vercel.app';
    const webhookUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payments-webhook`;

    // TAP amounts are in major currency units (SAR with 2 decimals)
    const gwRes = await fetch(TAP_CHARGES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        amount: Number((amount_cents / 100).toFixed(2)),
        currency,
        description: `Bink booking ${booking_id}`,
        customer: {
          first_name: profile?.full_name || user.email || 'Bink customer',
          email: user.email ?? undefined,
          ...(profile?.phone
            ? { phone: { country_code: 966, number: normalizeKsaLocal(profile.phone) } }
            : {}),
        },
        // src_all shows every method enabled on the TAP account
        // (mada, Visa/Mastercard, Apple Pay) on the hosted page.
        source: { id: 'src_all' },
        redirect: { url: `${appUrl}/appointments` },
        post: { url: webhookUrl },
        reference: { order: booking_id },
        metadata: { booking_id, user_id: user.id, method },
      }),
    });
    const charge = await gwRes.json();
    if (!gwRes.ok || !charge?.id) {
      return json({ error: charge?.errors?.[0]?.description ?? 'Gateway error' }, 502);
    }

    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .insert({
        booking_id,
        venue_id: booking.venue_id,
        user_id: user.id,
        amount_cents,
        currency,
        method,
        status: 'pending',
        gateway: 'tap',
        gateway_ref: charge.id,
      })
      .select()
      .single();
    if (txErr) return json({ error: txErr.message }, 500);

    return json({ transaction: tx, payment_url: charge.transaction?.url ?? null });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function normalizeKsaLocal(phone: string): number {
  const digits = phone.replace(/\D/g, '');
  // 9665XXXXXXXX -> 5XXXXXXXX, 05XXXXXXXX -> 5XXXXXXXX
  if (digits.startsWith('966')) return Number(digits.slice(3));
  if (digits.startsWith('0')) return Number(digits.slice(1));
  return Number(digits);
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
