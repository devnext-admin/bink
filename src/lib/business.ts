// Partner (salon) + admin operations. Supabase when configured; in demo mode
// venues created/edited locally are stored in AsyncStorage and merged into the
// app dataset by AppDataProvider.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDemoUsers } from './auth-context';
import { pushNotification } from './notifications';
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
  providerType?: 'salon' | 'freelancer';
  mapsUrl?: string | null;
  categoryId: number;
  description: string;
  address: string;
  area: string;
  city: string;
  country: string;
  imageUrl?: string;
  currency?: string;
  // Full setup captured by the registration wizard
  images?: string[];
  services?: { name: string; group_name?: string; duration_minutes: number; price_cents: number }[];
  staff?: { name: string; role: string }[];
  hours?: Venue['hours'];
}

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=1200&q=80&auto=format&fit=crop',
];

export async function registerSalon(input: RegisterSalonInput): Promise<Venue> {
  const venueId = uid('venue');
  const currency = input.currency ?? 'SAR';
  const imageUrls = input.images?.length
    ? input.images
    : [input.imageUrl || DEFAULT_IMAGES[0]];

  const venue: Venue = {
    id: venueId,
    slug: `${slugify(input.name)}-${Math.random().toString(36).slice(2, 6)}`,
    name: input.name,
    description: input.description,
    category_id: input.categoryId,
    owner_id: input.ownerId,
    status: 'pending',
    provider_type: input.providerType ?? 'salon',
    maps_url: input.mapsUrl?.trim() || null,
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
    images: imageUrls.map((url, i) => ({ url, sort_order: i })),
    services: (input.services ?? []).map((s, i) => ({
      id: uid('svc'),
      venue_id: venueId,
      name: s.name,
      description: '',
      group_name: s.group_name || 'Featured',
      duration_minutes: s.duration_minutes,
      price_cents: s.price_cents,
      currency,
      discount_pct: 0,
      is_featured: true,
      sort_order: i,
    })),
    staff: (input.staff ?? []).map((m) => ({
      id: uid('staff'),
      venue_id: venueId,
      name: m.name,
      role: m.role,
      rating: 5.0,
    })),
    reviews: [],
    hours:
      input.hours ??
      Array.from({ length: 7 }, (_, weekday) => ({
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
        provider_type: venue.provider_type,
        maps_url: venue.maps_url,
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
      await sb.from('venue_images').insert(
        venue.images.map((im) => ({ venue_id: data.id, url: im.url, sort_order: im.sort_order }))
      );
      await sb.from('opening_hours').insert(venue.hours.map((h) => ({ venue_id: data.id, ...h })));
      if (venue.services.length) {
        await sb.from('services').insert(
          venue.services.map(({ id: _id, venue_id: _v, ...s }) => ({ ...s, venue_id: data.id }))
        );
      }
      if (venue.staff.length) {
        await sb.from('staff').insert(
          venue.staff.map((m) => ({ venue_id: data.id, name: m.name, role: m.role }))
        );
      }
      return venue;
    }
  }

  const locals = await getLocalVenues();
  await saveLocalVenues([venue, ...locals]);
  return venue;
}

export async function updateVenueInfo(
  venue: Venue,
  patch: Partial<Pick<Venue, 'name' | 'description' | 'address' | 'area' | 'city' | 'category_id' | 'highlights' | 'maps_url' | 'provider_type' | 'cancellation_policy' | 'cancellation_fee_pct' | 'deposit_cents'>>
): Promise<Venue> {
  const sb = getSupabase();
  if (sb && !venue.id.startsWith('venue-')) {
    await sb.from('venues').update(patch).eq('id', venue.id);
  }
  return mutateLocalVenue(venue, (v) => ({ ...v, ...patch }));
}

export async function updateStaff(
  venue: Venue,
  staffId: string,
  patch: Partial<Pick<Staff, 'name' | 'role' | 'email' | 'venue_role'>>
): Promise<Venue> {
  const sb = getSupabase();
  if (sb && !staffId.startsWith('staff-')) {
    await sb.from('staff').update(patch).eq('id', staffId);
  }
  return mutateLocalVenue(venue, (v) => ({
    ...v,
    staff: v.staff.map((m) => (m.id === staffId ? { ...m, ...patch } : m)),
  }));
}

export async function setVenueStatus(venue: Venue, status: VenueStatus): Promise<Venue> {
  const sb = getSupabase();
  if (sb && !venue.id.startsWith('venue-')) {
    await sb.from('venues').update({ status }).eq('id', venue.id);
  }
  if (status === 'approved' && venue.status !== 'approved') {
    await pushNotification({
      audience: 'venue',
      venueId: venue.id,
      title: 'Your salon is live!',
      body: `${venue.name} was approved and is now visible to customers on Bink.`,
    });
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

export async function addStaff(
  venue: Venue,
  name: string,
  role: string,
  email?: string | null,
  venueRole: 'manager' | 'member' = 'member'
): Promise<Venue> {
  const member: Staff = {
    id: uid('staff'),
    venue_id: venue.id,
    name,
    role,
    rating: 5.0,
    email: email?.trim() || null,
    venue_role: venueRole,
    invite_status: 'none',
    service_ids: [],
  };
  const sb = getSupabase();
  if (sb && !venue.id.startsWith('venue-')) {
    const { data } = await sb
      .from('staff')
      .insert({ venue_id: venue.id, name, role, email: member.email, venue_role: venueRole })
      .select('id')
      .single();
    if (data) member.id = data.id;
  }
  return mutateLocalVenue(venue, (v) => ({ ...v, staff: [...v.staff, member] }));
}

/** Email an account invite to a team member (cloud only). */
export async function inviteTeamMember(staffId: string): Promise<string | null> {
  const sb = getSupabase();
  if (!sb || staffId.startsWith('staff-')) return 'Invites need the cloud backend.';
  const { data, error } = await sb.functions.invoke('invite-team-member', {
    body: { staff_id: staffId },
  });
  if (error) {
    try {
      const body = await (error as any).context?.json?.();
      if (body?.error) return body.error as string;
    } catch {}
    return error.message;
  }
  return data?.error ?? null;
}

/** Which services a team member provides. */
export async function setStaffServices(staffId: string, serviceIds: string[]): Promise<void> {
  const sb = getSupabase();
  if (!sb || staffId.startsWith('staff-')) return;
  await sb.from('staff_services').delete().eq('staff_id', staffId);
  if (serviceIds.length) {
    await sb.from('staff_services').insert(serviceIds.map((service_id) => ({ staff_id: staffId, service_id })));
  }
}

export interface StaffAccess {
  staffId: string;
  venueId: string;
  venueRole: 'manager' | 'member';
  staffName: string;
}

/** The venues the signed-in user works at as a team member. */
export async function getMyStaffAccess(): Promise<StaffAccess[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const user = (await sb.auth.getUser()).data.user;
  if (!user) return [];
  const { data } = await sb
    .from('staff')
    .select('id, venue_id, venue_role, name')
    .eq('user_id', user.id);
  return (data ?? []).map((r: any) => ({
    staffId: r.id,
    venueId: r.venue_id,
    venueRole: r.venue_role ?? 'member',
    staffName: r.name,
  }));
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
      .select('*, items:booking_items (service_id, service_name, duration_minutes, price_cents), staff (name)')
      .eq('venue_id', venueId)
      .order('starts_at', { ascending: false });
    if (!error && data?.length) {
      // bookings reference auth.users, so resolve display names via profiles
      const userIds = [...new Set(data.map((b: any) => b.user_id).filter(Boolean))];
      const { data: profs } = await sb.from('profiles').select('id, full_name').in('id', userIds);
      const names = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      return data.map((b: any) => ({
        ...b,
        venue_name: '',
        customer_name: names.get(b.user_id) ?? null,
        staff_name: b.staff?.name ?? null,
        items: b.items ?? [],
      }));
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
