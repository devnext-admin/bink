// Data layer: uses Supabase when EXPO_PUBLIC_SUPABASE_URL/ANON_KEY are set,
// otherwise falls back to the bundled demo dataset (same ids as seed.sql)
// with AsyncStorage-persisted bookings so the whole app works offline.

import AsyncStorage from '@react-native-async-storage/async-storage';
import demo from '../data/demo.json';
import { pushNotification } from './notifications';
import { getSupabase } from './supabase';
import type { Booking, BookingItem, Category, Venue } from './types';

const demoVenues = demo.venues as unknown as Venue[];
const demoCategories = demo.categories as unknown as Category[];

const VENUE_SELECT = `
  *,
  images:venue_images (url, sort_order),
  services (*),
  staff (*),
  reviews (*),
  hours:opening_hours (weekday, open_time, close_time, is_closed)
`;

function normalizeVenue(v: any): Venue {
  return {
    ...v,
    rating_avg: Number(v.rating_avg),
    images: [...(v.images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    services: [...(v.services ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    staff: v.staff ?? [],
    reviews: [...(v.reviews ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    hours: [...(v.hours ?? [])].sort((a, b) => a.weekday - b.weekday),
  };
}

const LOCAL_CATEGORIES_KEY = 'bink.localCategories';

export async function getCategories(): Promise<Category[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb.from('categories').select('*').order('sort_order');
    if (!error && data?.length) return data;
  }
  try {
    const raw = await AsyncStorage.getItem(LOCAL_CATEGORIES_KEY);
    const local: Category[] = raw ? JSON.parse(raw) : [];
    return [...demoCategories, ...local];
  } catch {
    return demoCategories;
  }
}

export async function createCategory(name: string): Promise<void> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from('categories').insert({ name, slug, icon: 'sparkles-outline', sort_order: 99 });
    if (!error) return;
  }
  const raw = await AsyncStorage.getItem(LOCAL_CATEGORIES_KEY);
  const local: Category[] = raw ? JSON.parse(raw) : [];
  if (local.some((c) => c.slug === slug) || demoCategories.some((c) => c.slug === slug)) return;
  local.push({ id: 100 + local.length, slug, name, icon: 'sparkles-outline' });
  await AsyncStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(local));
}

export async function getVenues(): Promise<Venue[]> {
  const sb = getSupabase();
  if (!sb) return demoVenues;
  const { data, error } = await sb.from('venues').select(VENUE_SELECT);
  if (error || !data?.length) return demoVenues;
  return data.map(normalizeVenue);
}

export async function getVenueBySlug(slug: string): Promise<Venue | null> {
  const sb = getSupabase();
  if (!sb) return demoVenues.find((v) => v.slug === slug) ?? null;
  const { data, error } = await sb.from('venues').select(VENUE_SELECT).eq('slug', slug).maybeSingle();
  if (error || !data) return demoVenues.find((v) => v.slug === slug) ?? null;
  return normalizeVenue(data);
}

export function searchVenues(venues: Venue[], query: string, categorySlug?: string, categories?: Category[]): Venue[] {
  let out = venues;
  if (categorySlug && categories) {
    const cat = categories.find((c) => c.slug === categorySlug);
    if (cat) out = out.filter((v) => v.category_id === cat.id);
  }
  // Token match with naive singularization so "nails" finds "Nail Salon" etc.
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length) {
    out = out.filter((v) => {
      const catName = categories?.find((c) => c.id === v.category_id)?.name ?? '';
      const haystack = [
        v.name,
        v.city,
        v.area,
        catName,
        ...v.services.map((s) => `${s.name} ${s.group_name}`),
      ]
        .join(' ')
        .toLowerCase();
      return tokens.every((t) => {
        const singular = t.endsWith('s') ? t.slice(0, -1) : t;
        return haystack.includes(t) || haystack.includes(singular);
      });
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Bookings — Supabase when signed in, otherwise AsyncStorage (demo mode)
// ---------------------------------------------------------------------------
const LOCAL_BOOKINGS_KEY = 'bink.bookings';

async function getLocalBookings(): Promise<Booking[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_BOOKINGS_KEY);
    const bookings: Booking[] = raw ? JSON.parse(raw) : [];
    // Re-resolve the venue thumbnail from current data so image updates
    // (e.g. the people-free imagery pass) apply to previously stored bookings.
    return bookings.map((b) => ({
      ...b,
      venue_image: demoVenues.find((v) => v.id === b.venue_id)?.images[0]?.url ?? b.venue_image,
    }));
  } catch {
    return [];
  }
}

export interface CreateBookingInput {
  venue: Venue;
  staffId?: string | null;
  staffName?: string | null;
  customerName?: string | null;
  userId?: string | null;
  notes?: string | null;
  startsAt: Date;
  items: BookingItem[];
  currency: string;
  promoCode?: string | null;
  promoPctOff?: number;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const totalMinutes = input.items.reduce((m, i) => m + i.duration_minutes, 0);
  const rawTotal = input.items.reduce((c, i) => c + i.price_cents, 0);
  const totalCents = input.promoPctOff ? Math.round(rawTotal * (1 - input.promoPctOff / 100)) : rawTotal;
  const endsAt = new Date(input.startsAt.getTime() + totalMinutes * 60_000);

  const booking: Booking = {
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    venue_id: input.venue.id,
    user_id: input.userId ?? null,
    customer_name: input.customerName ?? null,
    notes: input.notes ?? null,
    promo_code: input.promoCode ?? null,
    venue_name: input.venue.name,
    venue_image: input.venue.images[0]?.url,
    venue_area: `${input.venue.area}, ${input.venue.city}`,
    staff_id: input.staffId ?? null,
    staff_name: input.staffName ?? null,
    starts_at: input.startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    status: 'confirmed',
    total_cents: totalCents,
    currency: input.currency,
    items: input.items,
  };

  const sb = getSupabase();
  const user = sb ? (await sb.auth.getUser()).data.user : null;

  if (sb && user) {
    const { data, error } = await sb
      .from('bookings')
      .insert({
        user_id: user.id,
        venue_id: input.venue.id,
        staff_id: input.staffId ?? null,
        starts_at: booking.starts_at,
        ends_at: booking.ends_at,
        status: 'confirmed',
        total_cents: totalCents,
        currency: input.currency,
        notes: input.notes ?? null,
        promo_code: input.promoCode ?? null,
      })
      .select('id')
      .single();
    if (!error && data) {
      booking.id = data.id;
      await sb.from('booking_items').insert(
        input.items.map((i) => ({
          booking_id: data.id,
          service_id: i.service_id,
          service_name: i.service_name,
          duration_minutes: i.duration_minutes,
          price_cents: i.price_cents,
        }))
      );
      await notifyBookingCreated(booking, input);
      return booking;
    }
  }

  const existing = await getLocalBookings();
  await AsyncStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify([booking, ...existing]));
  await notifyBookingCreated(booking, input);
  return booking;
}

async function notifyBookingCreated(booking: Booking, input: CreateBookingInput) {
  const when = new Date(booking.starts_at).toLocaleString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
  await pushNotification({
    audience: 'customer',
    userId: input.userId ?? null,
    venueId: booking.venue_id,
    title: 'Booking confirmed',
    body: `${input.venue.name} · ${when}. See you there!`,
  });
  await pushNotification({
    audience: 'venue',
    venueId: booking.venue_id,
    title: 'New booking',
    body: `${input.customerName ?? 'A customer'} booked ${input.items.map((i) => i.service_name).join(', ')} for ${when}.`,
  });
}

/**
 * All bookings (venue dashboards, admin, availability) when called without an
 * argument; pass a user id (or null for guests) to scope to that customer.
 */
export async function getBookings(forUserId?: string | null): Promise<Booking[]> {
  const sb = getSupabase();
  const user = sb ? (await sb.auth.getUser()).data.user : null;

  if (sb && user) {
    const { data, error } = await sb
      .from('bookings')
      .select('*, items:booking_items (service_id, service_name, duration_minutes, price_cents), venue:venues (name, area, city, images:venue_images (url, sort_order))')
      .order('starts_at', { ascending: false });
    if (!error && data) {
      return data.map((b: any) => ({
        id: b.id,
        venue_id: b.venue_id,
        venue_name: b.venue?.name ?? 'Venue',
        venue_image: b.venue?.images?.[0]?.url,
        venue_area: b.venue ? `${b.venue.area}, ${b.venue.city}` : undefined,
        staff_id: b.staff_id,
        staff_name: null,
        starts_at: b.starts_at,
        ends_at: b.ends_at,
        status: b.status,
        total_cents: b.total_cents,
        currency: b.currency,
        items: b.items ?? [],
      }));
    }
  }

  const all = await getLocalBookings();
  if (forUserId === undefined) return all;
  // Own bookings, plus legacy ones saved before accounts existed (no user_id).
  return all.filter((b: any) => (b.user_id ?? null) === forUserId || (forUserId != null && b.user_id == null));
}

export async function cancelBooking(id: string): Promise<void> {
  const sb = getSupabase();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  const bookings = await getLocalBookings();
  const booking = bookings.find((b) => b.id === id);
  if (sb && user && !id.startsWith('local-')) {
    await sb.from('bookings').update({ status: 'cancelled' }).eq('id', id);
  } else {
    await AsyncStorage.setItem(
      LOCAL_BOOKINGS_KEY,
      JSON.stringify(bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)))
    );
  }
  if (booking) {
    await pushNotification({
      audience: 'venue',
      venueId: booking.venue_id,
      title: 'Booking cancelled',
      body: `${booking.customer_name ?? 'A customer'} cancelled ${booking.items.map((i) => i.service_name).join(', ')}.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Favorites — local (mirrors to Supabase when signed in)
// ---------------------------------------------------------------------------
const LOCAL_FAVS_KEY = 'bink.favorites';

// Signed-in users get their own list; guests share the device-level one.
const favsKey = (userId?: string | null) => (userId ? `${LOCAL_FAVS_KEY}:${userId}` : LOCAL_FAVS_KEY);

export async function getFavoriteIds(userId?: string | null): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(favsKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function toggleFavorite(venueId: string, userId?: string | null): Promise<string[]> {
  const favs = await getFavoriteIds(userId);
  const next = favs.includes(venueId) ? favs.filter((id) => id !== venueId) : [...favs, venueId];
  await AsyncStorage.setItem(favsKey(userId), JSON.stringify(next));
  const sb = getSupabase();
  const user = sb ? (await sb.auth.getUser()).data.user : null;
  if (sb && user) {
    if (next.includes(venueId)) {
      await sb.from('favorites').upsert({ user_id: user.id, venue_id: venueId });
    } else {
      await sb.from('favorites').delete().eq('user_id', user.id).eq('venue_id', venueId);
    }
  }
  return next;
}
