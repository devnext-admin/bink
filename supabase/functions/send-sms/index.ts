// Sends a transactional SMS through Taqnyat (booking confirmations, changes,
// cancellations). Only authenticated users can invoke it, and each caller can
// only message their own registered phone number - the function looks the
// number up itself, so the client never controls the recipient.
//
// Deploy:  npx supabase functions deploy send-sms
// Secrets: npx supabase secrets set TAQNYAT_API_KEY=... TAQNYAT_SENDER=Bink

import { createClient } from 'jsr:@supabase/supabase-js@2';

const TAQNYAT_API = 'https://api.taqnyat.sa/v1/messages';

Deno.serve(async (req) => {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== 'string' || text.length > 480) {
      return json({ error: 'text required (max 480 chars)' }, 400);
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: userData } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: 'Not authenticated' }, 401);

    const apiKey = Deno.env.get('TAQNYAT_API_KEY');
    const sender = Deno.env.get('TAQNYAT_SENDER');
    if (!apiKey || !sender) return json({ error: 'SMS not configured' }, 501);

    // The recipient is always the caller's own registered phone
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .maybeSingle();
    const to = normalizeKsa(profile?.phone ?? '');
    if (!to) return json({ error: 'No phone number on the account' }, 400);

    const res = await fetch(TAQNYAT_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ recipients: [to], body: text, sender }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return json({ error: out?.message ?? 'SMS gateway error' }, 502);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

// 05XXXXXXXX / 5XXXXXXXX / +9665XXXXXXXX -> 9665XXXXXXXX
function normalizeKsa(phone: string): number | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('966') && digits.length === 12) return Number(digits);
  if (digits.startsWith('05') && digits.length === 10) return Number('966' + digits.slice(1));
  if (digits.startsWith('5') && digits.length === 9) return Number('966' + digits);
  return null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
