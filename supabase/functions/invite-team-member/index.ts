// Invites a salon team member by email. Creates their auth account, sends
// Supabase's invite email (link lands on /welcome to set a password), and
// links the staff record to the new user.
// Deploy: npx supabase functions deploy invite-team-member
// Secrets: APP_URL=https://bink-three.vercel.app

import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const { staff_id } = await req.json();

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Caller from JWT
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: userData } = await createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();
    const caller = userData?.user;
    if (!caller) return json({ error: 'Not authenticated' }, 401);

    // Staff record + venue
    const { data: staff, error: sErr } = await admin
      .from('staff')
      .select('id, name, email, user_id, venue_id, invite_status')
      .eq('id', staff_id)
      .single();
    if (sErr || !staff) return json({ error: 'Team member not found' }, 404);
    if (!staff.email) return json({ error: 'Add an email for this team member first' }, 400);
    if (staff.user_id) return json({ error: 'This team member already has an account' }, 409);

    // Caller must manage this venue (owner, admin, or venue manager)
    const { data: venue } = await admin
      .from('venues')
      .select('id, name, owner_id')
      .eq('id', staff.venue_id)
      .single();
    if (!venue) return json({ error: 'Venue not found' }, 404);
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single();
    const { data: managerRow } = await admin
      .from('staff')
      .select('id')
      .eq('venue_id', venue.id)
      .eq('user_id', caller.id)
      .eq('venue_role', 'manager')
      .maybeSingle();
    const allowed =
      venue.owner_id === caller.id || callerProfile?.role === 'admin' || !!managerRow;
    if (!allowed) return json({ error: 'Only the salon owner or a manager can invite' }, 403);

    const appUrl = Deno.env.get('APP_URL') ?? 'https://bink-three.vercel.app';
    const { data: invited, error: iErr } = await admin.auth.admin.inviteUserByEmail(
      staff.email,
      {
        redirectTo: `${appUrl}/welcome`,
        data: { full_name: staff.name, staff_id: staff.id, venue_id: venue.id, venue_name: venue.name },
      }
    );
    if (iErr) return json({ error: iErr.message }, 400);

    await admin
      .from('staff')
      .update({ user_id: invited.user.id, invite_status: 'invited' })
      .eq('id', staff.id);

    return json({ ok: true, user_id: invited.user.id });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
