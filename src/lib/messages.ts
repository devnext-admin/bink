// Direct messaging between customers and salons. A conversation is the pair
// (venue_id, user_id). Supabase when connected; local persistence in demo mode.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushNotification } from './notifications';
import { getSupabase } from './supabase';

export interface ChatMessage {
  id: string;
  venue_id: string;
  venue_name: string;
  user_id: string;
  user_name: string;
  sender: 'customer' | 'venue';
  text: string;
  read_by_customer: boolean;
  read_by_venue: boolean;
  created_at: string;
}

export interface Conversation {
  venue_id: string;
  venue_name: string;
  user_id: string;
  user_name: string;
  last_text: string;
  last_at: string;
  unread: number;
}

const KEY = 'bink.messages';

async function readAll(): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeAll(list: ChatMessage[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(-500)));
}

const isCloudId = (id: string) => !id.startsWith('demo-') && id !== 'guest' && !id.startsWith('venue-');

export async function sendMessage(input: {
  venueId: string;
  venueName: string;
  userId: string;
  userName: string;
  sender: 'customer' | 'venue';
  text: string;
}): Promise<ChatMessage> {
  const msg: ChatMessage = {
    id: `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    venue_id: input.venueId,
    venue_name: input.venueName,
    user_id: input.userId,
    user_name: input.userName,
    sender: input.sender,
    text: input.text.trim(),
    read_by_customer: input.sender === 'customer',
    read_by_venue: input.sender === 'venue',
    created_at: new Date().toISOString(),
  };

  const sb = getSupabase();
  if (sb && isCloudId(input.userId) && isCloudId(input.venueId)) {
    const { error } = await sb.from('messages').insert({
      venue_id: input.venueId,
      user_id: input.userId,
      sender: input.sender,
      text: msg.text,
      read_by_customer: msg.read_by_customer,
      read_by_venue: msg.read_by_venue,
    });
    if (error) throw new Error(error.message);
  } else {
    const list = await readAll();
    await writeAll([...list, msg]);
  }

  // Notify the other side
  if (input.sender === 'customer') {
    await pushNotification({
      audience: 'venue',
      venueId: input.venueId,
      title: 'New message',
      body: `${input.userName}: ${msg.text.slice(0, 80)}`,
    });
  } else {
    await pushNotification({
      audience: 'customer',
      userId: input.userId,
      venueId: input.venueId,
      title: `Message from ${input.venueName}`,
      body: msg.text.slice(0, 80),
    });
  }
  return msg;
}

export async function getThread(venueId: string, userId: string): Promise<ChatMessage[]> {
  const sb = getSupabase();
  if (sb && isCloudId(userId) && isCloudId(venueId)) {
    const { data } = await sb
      .from('messages')
      .select('*')
      .eq('venue_id', venueId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (data) return data as ChatMessage[];
  }
  return (await readAll())
    .filter((m) => m.venue_id === venueId && m.user_id === userId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function toConversations(messages: ChatMessage[], perspective: 'customer' | 'venue'): Conversation[] {
  const map = new Map<string, Conversation>();
  for (const m of messages) {
    const key = `${m.venue_id}|${m.user_id}`;
    const unreadFlag = perspective === 'customer' ? !m.read_by_customer : !m.read_by_venue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        venue_id: m.venue_id,
        venue_name: m.venue_name,
        user_id: m.user_id,
        user_name: m.user_name,
        last_text: m.text,
        last_at: m.created_at,
        unread: unreadFlag ? 1 : 0,
      });
    } else {
      if (m.created_at > existing.last_at) {
        existing.last_at = m.created_at;
        existing.last_text = m.text;
        if (m.venue_name) existing.venue_name = m.venue_name;
        if (m.user_name) existing.user_name = m.user_name;
      }
      if (unreadFlag) existing.unread += 1;
    }
  }
  return [...map.values()].sort((a, b) => b.last_at.localeCompare(a.last_at));
}

export async function getConversationsForUser(userId: string): Promise<Conversation[]> {
  const sb = getSupabase();
  if (sb && isCloudId(userId)) {
    const { data } = await sb
      .from('messages')
      .select('*, venue:venues (name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (data?.length) {
      return toConversations(
        data.map((m: any) => ({ ...m, venue_name: m.venue?.name ?? 'Salon', user_name: '' })),
        'customer'
      );
    }
  }
  return toConversations((await readAll()).filter((m) => m.user_id === userId), 'customer');
}

export async function getConversationsForVenue(venueId: string): Promise<Conversation[]> {
  const sb = getSupabase();
  if (sb && isCloudId(venueId)) {
    const { data } = await sb
      .from('messages')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: true });
    if (data?.length) {
      const userIds = [...new Set(data.map((m: any) => m.user_id))];
      const { data: profs } = await sb.from('profiles').select('id, full_name').in('id', userIds);
      const names = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      return toConversations(
        data.map((m: any) => ({ ...m, user_name: names.get(m.user_id) ?? 'Customer' })),
        'venue'
      );
    }
  }
  return toConversations((await readAll()).filter((m) => m.venue_id === venueId), 'venue');
}

export async function markThreadRead(venueId: string, userId: string, by: 'customer' | 'venue') {
  const patch = by === 'customer' ? { read_by_customer: true } : { read_by_venue: true };
  const sb = getSupabase();
  if (sb && isCloudId(userId) && isCloudId(venueId)) {
    await sb.from('messages').update(patch).eq('venue_id', venueId).eq('user_id', userId);
    return;
  }
  const list = await readAll();
  await writeAll(
    list.map((m) => (m.venue_id === venueId && m.user_id === userId ? { ...m, ...patch } : m))
  );
}

export async function getUnreadMessageCount(userId: string | null, ownedVenueIds: string[]): Promise<number> {
  if (!userId && !ownedVenueIds.length) return 0;
  const sb = getSupabase();
  if (sb && userId && isCloudId(userId)) {
    let count = 0;
    const { count: mine } = await sb
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('sender', 'venue')
      .eq('read_by_customer', false);
    count += mine ?? 0;
    const cloudVenues = ownedVenueIds.filter(isCloudId);
    if (cloudVenues.length) {
      const { count: theirs } = await sb
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('venue_id', cloudVenues)
        .eq('sender', 'customer')
        .eq('read_by_venue', false);
      count += theirs ?? 0;
    }
    return count;
  }
  const all = await readAll();
  let count = 0;
  for (const m of all) {
    if (userId && m.user_id === userId && m.sender === 'venue' && !m.read_by_customer) count++;
    if (ownedVenueIds.includes(m.venue_id) && m.sender === 'customer' && !m.read_by_venue) count++;
  }
  return count;
}
