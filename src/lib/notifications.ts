// In-app notifications for customers ('customer' audience, keyed by user) and
// venue owners ('venue' audience, keyed by venue). Demo mode persists locally;
// Supabase writes when connected.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from './supabase';

export interface AppNotification {
  id: string;
  user_id: string | null;
  venue_id: string | null;
  audience: 'customer' | 'venue';
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

const KEY = 'bink.notifications';

async function readAll(): Promise<AppNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeAll(list: AppNotification[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
}

export async function pushNotification(input: {
  audience: 'customer' | 'venue';
  userId?: string | null;
  venueId?: string | null;
  title: string;
  body?: string;
}): Promise<void> {
  const n: AppNotification = {
    id: `ntf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    user_id: input.userId ?? null,
    venue_id: input.venueId ?? null,
    audience: input.audience,
    title: input.title,
    body: input.body ?? '',
    is_read: false,
    created_at: new Date().toISOString(),
  };
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from('notifications').insert({
      user_id: n.user_id,
      venue_id: n.venue_id && !n.venue_id.startsWith('venue-') ? n.venue_id : null,
      audience: n.audience,
      title: n.title,
      body: n.body,
    });
    if (!error) return;
  }
  const list = await readAll();
  await writeAll([n, ...list]);
}

/** Notifications for the current viewer: their customer feed plus the feeds of
 *  any venues they own. */
export async function getNotifications(userId: string | null, ownedVenueIds: string[]): Promise<AppNotification[]> {
  const sb = getSupabase();
  if (sb && userId && !userId.startsWith('demo-') && userId !== 'guest') {
    const { data } = await sb
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data?.length) return data;
  }
  const list = await readAll();
  return list.filter(
    (n) =>
      (n.audience === 'customer' && n.user_id === userId) ||
      (n.audience === 'venue' && n.venue_id != null && ownedVenueIds.includes(n.venue_id))
  );
}

export async function getUnreadCount(userId: string | null, ownedVenueIds: string[]): Promise<number> {
  return (await getNotifications(userId, ownedVenueIds)).filter((n) => !n.is_read).length;
}

export async function markAllRead(userId: string | null, ownedVenueIds: string[]): Promise<void> {
  const sb = getSupabase();
  if (sb && userId && !userId.startsWith('demo-') && userId !== 'guest') {
    await sb.from('notifications').update({ is_read: true }).eq('is_read', false);
  }
  const list = await readAll();
  await writeAll(
    list.map((n) =>
      (n.audience === 'customer' && n.user_id === userId) ||
      (n.audience === 'venue' && n.venue_id != null && ownedVenueIds.includes(n.venue_id))
        ? { ...n, is_read: true }
        : n
    )
  );
}
