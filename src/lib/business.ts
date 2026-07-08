// Partner (salon) + admin operations. Supabase when configured; in demo mode
// venues created/edited locally are stored in AsyncStorage and merged into the
// app dataset by AppDataProvider.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDemoUsers } from './auth-context';
import { getBookings } from './data';
import { getSupabase } from './supabase';
import type { Booking, Service, Staff, Venue, VenueStatus } from './types';

const LOCAL_VENUES_KEY = 'bink.localVenues';

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'salon'
  );
}

export async function getLocalVenues(): Promise<Venue[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_VENUES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveLocalVenues(venues: Venue[]) {
  await AsyncStorage.setItem(LOCAL_VENUES_KEY, JSON.stringify(venues));
}

/** Apply a mutation to one locally-stored venue (creating the local copy from
 *  a seed venue if needed — used when admins/owners edit demo venues). */
async function mutateLocalVenue(venue: Venue, fn: (v: Venue) => Venue): Promise<Venue> {
  const locals = await getLocalVenues();
  const idx = locals.findIndex((v) => v.id === venue.id);
  const base = idx >= 0 ? locals[idx] : venue;
  const next = fn(JSON.parse(JSON.stringify(base)));
  if (idx >= 0) locals[idx] = next;
  else locals.unshift(next);
  await saveLocalVenues(locals);
  return next;
}

// ---------------------------------------------------------------------------
// Salon registration + settings
// ---------------------------------------------------------------------------
export interface RegisterSalonInput {
  ownerId: string;
  name: string;
  categoryId: number;
  description: string;
  address: string;
  area: string;
  city: string;
  country: string;
  imageUrl?: string;
  currency?: string;
}

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=1200&q=80&auto=format&fit=crop',
];

export async function registerSalon(input: RegisterSalonInput): Promise<Venue> {
  const venue: Venue = {
    id: uid('venue'),
    slug: `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name,
    description: input.description,
    category_id: input.categoryId,
    owner_id: input.ownerId,
    status: 'pending',
    address: input.address,
    area: input.area,
    city: input.city,
    country: input.country,
    rating_avg: 0,
    rating_count: 0,
    is_featured: false,
    is_new: true,
    is_trending: false,
    highlights: ['Instant confirmation', 'Pay by app'],
    images: [{ url: input.imageUrl || DEFAULT_IMAGES[0], sort_order: 0 }],
    services: [],
    staff: [],
    reviews: [],
    hours: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      open_time: weekday === 0 ? null : '10:00',
      close_time: weekday === 0 ? null : '22:00',
      is_closed: weekday === 0,
    })),
  };

  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('venues')
      .insert({
        slug: venue.slug,
        name: venue.name,
        description: venue.description,
        category_id: venue.category_id,
        owner_id: input.ownerId,
        status: 'pending',
        address: venue.address,
        area: venue.area,
        city: venue.city,
        country: venue.country,
        highlights: venue.highlights,
        is_new: true,
      })
      .select('id')
      .single();
    if (!error && data) {
      venue.id = data.id;
      await sb.from('venue_images').insert({ venue_id: data.id, url: venue.images[0].url, sort_order: 0 });
      await sb.from('opening_hours').insert(
        venue.hours.map((h) => ({ venue_id: data.id, ...h }))
      );
      return venue;
    }
  }

  const locals = await getLocalVenues();
  await saveLocalVenues([venue, ...locals]);
  return venue;
}

export async function updateVenueInfo(
  venue: Venue,
  patch: Partial<Pick<Venue, 'name' | 'description' | 'address' | 'area' | 'city'>>
): Promise<Venue> {
  const sb = getSupabase();
  if (sb && !venue.id.startsWith('venue-')) {
    await sb.from('venues').update(patch).eq('id', venue.id);
  }
  return mutateLocalVenue(venue, (v) => ({ ...v, ...patch }));
}

export async function setVenueStatus(venue: Venue, status: VenueStatus): Promise<Venue> {
  const sb = getSupabase();
  if (sb && !venue.id.startsWith('venue-')) {
    await sb.from('venues').update({ status }).eq('id', venue.id);
  }
  return mutateLocalVenue(venue, (v) => ({ ...v, status }));
}

// ---------------------------------------------------------------------------
// Services & staff CRUD
// ---------------------------------------------------------------------------
export interface ServiceInput {
  name: string;
  group_name: string;
  duration_minutes: number;
  price_cents: number;
  description?: string;
  currency?: string;
}

export async function addService(venue: Venue, input: ServiceInput): Promise<Venue> {
  const service: Service = {
    id: uid('svc'),
    venue_id: venue.id,
    name: input.name,
    description: input.description ?? '',
    group_name: input.group_name || 'Featured',
    duration_minutes: input.duration_minutes,
    price_cents: input.price_cents,
    currency: input.currency ?? venue.services[0]?.currency ?? 'SAR',
    discount_pct: 0,
    is_featured: (input.group_name || 'Featured') === 'Featured',
    sort_order: venue.services.length,
  };
  const sb = getSupabase();
  if (sb && !venue.id.startsWith('venue-')) {
    const { data } = await sb
      .from('services')
      .insert({ ...service, id: undefined })
      .select('id')
      .single();
    if (data) service.id = data.id;
  }
  return mutateLocalVenue(venue, (v) => ({ ...v, services: [...v.services, service] }));
}

export async function updateService(
  venue: Venue,
  serviceId: string,
  patch: Partial<Pick<Service, 'name' | 'group_name' | 'duration_minutes' | 'price_cents' | 'discount_pct' | 'description'>>
): Promise<Venue> {
  const sb = getSupabase();
  if (sb && !serviceId.startsWith('svc-')) {
    await sb.from('services').update(patch).eq('id', serviceId);
  }
  return mutateLocalVenue(venue, (v) => ({
    ...v,
    services: v.services.map((s) => (s.id === serviceId ? { ...s, ...patch } : s)),
  }));
}

export async function updateVenueHours(
  venue: Venue,
  hours: Venue['hours']
): Promise<Venue> {
  const sb = getSupabase();
  if (sb && !venue.id.startsWith('venue-')) {
    for (const h of hours) {
      await sb
        .from('opening_hours')
        .upsert(
          { venue_id: venue.id, weekday: h.weekday, open_time: h.open_time, close_time: h.close_time, is_closed: h.is_closed },
          { onConflict: 'venue_id,weekday' }
        );
    }
  }
  return mutateLocalVenue(venue, (v) => ({ ...v, hours }));
}

export async function addVenueImage(venue: Venue, url: string): Promise<Venue> {
  const sb = getSupabase();
  if (sb && !venue.id.startsWith('venue-')) {
    await sb.from('venue_images').insert({ venue_id: venue.id, url, sort_order: venue.images.length });
  }
  return mutateLocalVenue(venue, (v) => ({
    ...v,
    images: [...v.images, { url, sort_order: v.images.length }],
  }));
}

export async function removeVenueImage(venue: Venue, url: string): Promise<Venue> {
  const sb = getSupabase();
  if (sb && !venue.id.startsWith('venue-')) {
    await sb.from('venue_images').delete().eq('venue_id', venue.id).eq('url', url);
  }
  return mutateLocalVenue(venue, (v) => ({
    ...v,
    images: v.images.filter((im) => im.url !== url),
  }));
}

export async function deleteService(venue: Venue, serviceId: string): Promise<Venue> {
  const sb = getSupabase();
  if (sb && !serviceId.startsWith('svc-')) {
    await sb.from('services').delete().eq('id', serviceId);
  }
  return mutateLocalVenue(venue, (v) => ({
    ...v,
    services: v.services.filter((s) => s.id !== serviceId),
  }));
}

export async function addStaff(venue: Venue, name: string, role: string): Promise<Venue> {
  const member: Staff = { id: uid('staff'), venue_id: venue.id, name, role, rating: 5.0 };
  const sb = getSupabase();
  if (sb && !venue.id.startsWith('venue-')) {
    const { data } = await sb
      .from('staff')
      .insert({ venue_id: venue.id, name, role })
      .select('id')
      .single();
    if (data) member.id = data.id;
  }
  return mutateLocalVenue(venue, (v) => ({ ...v, staff: [...v.staff, member] }));
}

export async function deleteStaff(venue: Venue, staffId: string): Promise<Venue> {
  const sb = getSupabase();
  if (sb && !staffId.startsWith('staff-')) {
    await sb.from('staff').delete().eq('id', staffId);
  }
  return mutateLocalVenue(venue, (v) => ({ ...v, staff: v.staff.filter((s) => s.id !== staffId) }));
}

// ---------------------------------------------------------------------------
// Partner + admin queries
// ---------------------------------------------------------------------------
export async function getVenueBookings(venueId: string): Promise<Booking[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('bookings')
      .select('*, items:booking_items (service_id, service_name, duration_minutes, price_cents)')
      .eq('venue_id', venueId)
      .order('starts_at', { ascending: false });
    if (!error && data?.length) {
      return data.map((b: any) => ({ ...b, venue_name: '', items: b.items ?? [] }));
    }
  }
  return (await getBookings()).filter((b) => b.venue_id === venueId);
}

export async function getAllBookings(): Promise<Booking[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('bookings')
      .select('*, items:booking_items (service_id, service_name, duration_minutes, price_cents), venue:venues (name)')
      .order('starts_at', { ascending: false });
    if (!error && data?.length) {
      return data.map((b: any) => ({ ...b, venue_name: b.venue?.name ?? 'Venue', items: b.items ?? [] }));
    }
  }
  return getBookings();
}

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  joined_at: string;
}

export async function getAllUsers(): Promise<AdminUserRow[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('profiles')
      .select('id, full_name, role, created_at')
      .order('created_at', { ascending: false });
    if (!error && data?.length) {
      return data.map((p: any) => ({
        id: p.id,
        name: p.full_name,
        email: null,
        role: p.role,
        joined_at: p.created_at,
      }));
    }
  }
  return (await getDemoUsers()).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    joined_at: u.joined_at,
  }));
}
