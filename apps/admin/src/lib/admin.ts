// Platform admin operations. These live apart from the shared data modules so
// the customer and partner bundles never carry admin queries: only the admin
// surface imports this file. Keep admin-only reads and writes here rather than
// adding them back to business.ts / ops.ts / data.ts / payments.ts.

import AsyncStorage from '@react-native-async-storage/async-storage';
import demo from '@bink/shared/data/demo.json';
import { getDemoUsers } from '@bink/shared/lib/auth-context';
import { mutateLocalVenue } from '@bink/shared/lib/business';
import { LOCAL_CATEGORIES_KEY, demoCategories, getBookings } from '@bink/shared/lib/data';
import { pushNotification } from '@bink/shared/lib/notifications';
import { PROMOS_KEY } from '@bink/shared/lib/ops';
import { TX_KEY } from '@bink/shared/lib/payments';
import { getSupabase } from '@bink/shared/lib/supabase';
import type { Booking, Category, PromoCode, Transaction, Venue, VenueStatus } from '@bink/shared/lib/types';

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeList<T>(key: string, list: T[]) {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

// ---------------------------------------------------------------------------
// Venues

/** Admin: approve, reject or suspend a salon. */
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
// Bookings

/** Admin: every booking on the platform, newest first. */
export async function getAllBookings(): Promise<Booking[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('bookings')
      .select('*, items:booking_items (service_id, service_name, duration_minutes, price_cents), venue:venues (name)')
      .order('starts_at', { ascending: false });
    if (!error && data?.length) {
      const userIds = [...new Set(data.map((b: any) => b.user_id).filter(Boolean))];
      const { data: profs } = await sb.from('profiles').select('id, full_name').in('id', userIds);
      const names = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      return data.map((b: any) => ({
        ...b,
        venue_name: b.venue?.name ?? 'Venue',
        customer_name: names.get(b.user_id) ?? b.walk_in_name ?? null,
        items: b.items ?? [],
      }));
    }
  }
  return getBookings();
}

// ---------------------------------------------------------------------------
// Users

export interface AdminUserRow {
  is_blocked?: boolean;
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
      .select('id, full_name, role, created_at, is_blocked')
      .order('created_at', { ascending: false });
    if (!error && data?.length) {
      return data.map((p: any) => ({
        id: p.id,
        name: p.full_name,
        email: null,
        role: p.role,
        joined_at: p.created_at,
        is_blocked: !!p.is_blocked,
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

/** Admin: block or unblock a user account. */
export async function adminSetUserBlocked(userId: string, blocked: boolean): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.from('profiles').update({ is_blocked: blocked }).eq('id', userId);
}

/**
 * Admin: change a user's platform role. The database trigger
 * `lock_profile_privileges` still gates this, so a non-admin caller fails.
 */
export async function adminSetUserRole(userId: string, role: 'customer' | 'partner' | 'admin'): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.from('profiles').update({ role }).eq('id', userId);
}

// ---------------------------------------------------------------------------
// Reviews

export interface AdminReviewRow {
  id: string;
  venue_id: string;
  venue_name: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

/** Admin: latest reviews across the platform, for moderation. */
export async function getAllReviews(): Promise<AdminReviewRow[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('reviews')
      .select('id, venue_id, author_name, rating, comment, created_at, venue:venues (name)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error && data) {
      return data.map((r: any) => ({ ...r, venue_name: r.venue?.name ?? 'Salon' }));
    }
  }
  return [];
}

/** Admin: remove a review (the DB trigger recomputes the venue rating). */
export async function adminDeleteReview(reviewId: string): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.from('reviews').delete().eq('id', reviewId);
}

// ---------------------------------------------------------------------------
// Transactions

/** Admin: every transaction on the platform, newest first. */
export async function getAllTransactions(): Promise<Transaction[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('transactions')
      .select('*, venue:venues (name)')
      .order('created_at', { ascending: false });
    if (!error && data?.length) return data.map((t: any) => ({ ...t, venue_name: t.venue?.name }));
  }
  return readList<Transaction>(TX_KEY);
}

// ---------------------------------------------------------------------------
// Categories

/** Admin: add a treatment category to the marketplace. */
export async function createCategory(name: string, nameAr?: string, imageUrl?: string): Promise<void> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from('categories').insert({
      name,
      slug,
      icon: 'sparkles-outline',
      sort_order: 99,
      name_ar: nameAr?.trim() || null,
      image_url: imageUrl?.trim() || null,
    });
    if (!error) return;
  }
  const raw = await AsyncStorage.getItem(LOCAL_CATEGORIES_KEY);
  const local: Category[] = raw ? JSON.parse(raw) : [];
  if (local.some((c) => c.slug === slug) || demoCategories.some((c) => c.slug === slug)) return;
  local.push({ id: 100 + local.length, slug, name, icon: 'sparkles-outline' });
  await AsyncStorage.setItem(LOCAL_CATEGORIES_KEY, JSON.stringify(local));
}

// ---------------------------------------------------------------------------
// Promo codes
//
// Reads stay in ops.ts because validatePromo (customer checkout) needs them.
// Only the writes are admin-only, so only the writes live here.

const demoPromos: PromoCode[] = (demo as any).promos ?? [];

export async function createPromo(
  code: string,
  pctOff: number,
  opts?: { maxUses?: number | null; expiresAt?: string | null }
): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from('promo_codes').insert({
      code: code.toUpperCase(),
      pct_off: pctOff,
      max_uses: opts?.maxUses ?? null,
      expires_at: opts?.expiresAt ?? null,
    });
    if (!error) return;
  }
  const local = await readList<PromoCode>(PROMOS_KEY);
  await writeList(PROMOS_KEY, [
    { id: uid('promo'), code: code.toUpperCase(), pct_off: pctOff, is_active: true },
    ...local,
  ]);
}

export async function togglePromo(code: string, isActive: boolean): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await sb.from('promo_codes').update({ is_active: isActive }).eq('code', code);
    if (!error) return;
  }
  const local = await readList<PromoCode>(PROMOS_KEY);
  if (local.some((p) => p.code === code)) {
    await writeList(PROMOS_KEY, local.map((p) => (p.code === code ? { ...p, is_active: isActive } : p)));
  } else {
    const demoPromo = demoPromos.find((p) => p.code === code);
    if (demoPromo) await writeList(PROMOS_KEY, [{ ...demoPromo, is_active: isActive }, ...local]);
  }
}
