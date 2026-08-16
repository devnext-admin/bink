// Operational flows: availability, reschedule, booking statuses, reviews,
// promo codes. Supabase when configured, local persistence otherwise.

import AsyncStorage from '@react-native-async-storage/async-storage';
import demo from '../data/demo.json';
import { getBookings } from './data';
import { pushNotification } from './notifications';
import { getSupabase } from './supabase';
import { MAX_DELAY_MINUTES } from './types';
import type { Booking, BookingStatus, DelaySide, PromoCode, Review, Venue } from './types';

const BOOKINGS_KEY = 'bink.bookings';
const REVIEWS_KEY = 'bink.reviews'; // local reviews layered over demo data
export const PROMOS_KEY = 'bink.promos'; // admin-created promos in demo mode

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
// Availability: which time slots are taken for a venue on a date.
// A slot conflicts when an active booking overlaps it AND either booking is
// for "any professional" or both are for the same professional.
// ---------------------------------------------------------------------------
export interface BusyInterval {
  startMin: number; // minutes from midnight
  endMin: number;
  staffId: string | null;
}

export async function getBusyIntervals(venueId: string, date: string): Promise<BusyInterval[]> {
  const sb = getSupabase();
  let bookings: Pick<Booking, 'starts_at' | 'ends_at' | 'staff_id' | 'status'>[] = [];
  if (sb) {
    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);
    const { data } = await sb
      .from('bookings')
      .select('starts_at, ends_at, staff_id, status')
      .eq('venue_id', venueId)
      .gte('starts_at', dayStart.toISOString())
      .lte('starts_at', dayEnd.toISOString());
    if (data) bookings = data;
  }
  if (!bookings.length) {
    const dayKey = new Date(`${date}T12:00:00`).toDateString();
    bookings = (await getBookings()).filter(
      (b) => b.venue_id === venueId && new Date(b.starts_at).toDateString() === dayKey
    );
  }
  return bookings
    .filter((b) => b.status === 'confirmed' || b.status === 'pending')
    .map((b) => {
      const s = new Date(b.starts_at);
      const e = new Date(b.ends_at);
      return {
        startMin: s.getHours() * 60 + s.getMinutes(),
        endMin: e.getHours() * 60 + e.getMinutes(),
        staffId: b.staff_id ?? null,
      };
    });
}

/** Is a slot (start + duration, for a staff pick) free given busy intervals? */
export function isSlotFree(
  busy: BusyInterval[],
  slotStartMin: number,
  durationMin: number,
  staffId: string | null,
  totalStaff: number
): boolean {
  const slotEnd = slotStartMin + durationMin;
  const overlapping = busy.filter((b) => slotStartMin < b.endMin && slotEnd > b.startMin);
  if (!overlapping.length) return true;
  if (staffId) {
    // Named professional: blocked if they're booked, or an "any" booking exists
    // and the whole team is saturated at that moment
    if (overlapping.some((b) => b.staffId === staffId)) return false;
    return overlapping.length < totalStaff;
  }
  // "Any professional": free while at least one team member is unbooked
  return overlapping.length < Math.max(totalStaff, 1);
}

// ---------------------------------------------------------------------------
// Booking mutations
// ---------------------------------------------------------------------------
export async function rescheduleBooking(id: string, newStart: Date, durationMin: number): Promise<void> {
  const ends = new Date(newStart.getTime() + durationMin * 60_000);
  const sb = getSupabase();
  const bookings = await readList<Booking>(BOOKINGS_KEY);
  const booking = bookings.find((b) => b.id === id);
  if (sb && !id.startsWith('local-')) {
    await sb
      .from('bookings')
      .update({ starts_at: newStart.toISOString(), ends_at: ends.toISOString() })
      .eq('id', id);
  } else {
    await writeList(
      BOOKINGS_KEY,
      bookings.map((b) =>
        b.id === id ? { ...b, starts_at: newStart.toISOString(), ends_at: ends.toISOString() } : b
      )
    );
  }
  if (booking) {
    const when = newStart.toLocaleString('en-US', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    await pushNotification({
      audience: 'venue',
      venueId: booking.venue_id,
      title: 'Booking rescheduled',
      body: `${booking.customer_name ?? 'A customer'} moved their appointment to ${when}.`,
    });
  }
}

export async function setBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const sb = getSupabase();
  const bookings = await readList<Booking>(BOOKINGS_KEY);
  const booking = bookings.find((b) => b.id === id);
  if (sb && !id.startsWith('local-')) {
    await sb.from('bookings').update({ status }).eq('id', id);
  } else {
    await writeList(BOOKINGS_KEY, bookings.map((b) => (b.id === id ? { ...b, status } : b)));
  }
  if (booking && status === 'completed') {
    const { tryReleaseEscrow } = await import('./payments');
    const released = await tryReleaseEscrow(id);
    await pushNotification({
      audience: 'customer',
      userId: booking.user_id ?? null,
      venueId: booking.venue_id,
      title: 'Thanks for visiting!',
      body:
        booking.payment_status === 'paid' && !released
          ? `How was ${booking.venue_name}? Confirm your visit under Appointments to release the payment, and leave a rating.`
          : `How was ${booking.venue_name}? Rate your visit under Appointments.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export async function submitReview(input: {
  venue: Venue;
  bookingId: string;
  authorName: string;
  userId?: string | null;
  rating: number;
  comment: string;
}): Promise<Review> {
  const review: Review = {
    id: uid('rev'),
    venue_id: input.venue.id,
    author_name: input.authorName,
    rating: input.rating,
    comment: input.comment,
    created_at: new Date().toISOString(),
  };
  const sb = getSupabase();
  if (sb && input.userId && !input.venue.id.startsWith('venue-')) {
    await sb.from('reviews').insert({
      venue_id: input.venue.id,
      user_id: input.userId,
      booking_id: input.bookingId.startsWith('local-') ? null : input.bookingId,
      author_name: input.authorName,
      rating: input.rating,
      comment: input.comment,
    });
  } else {
    const reviews = await readList<Review>(REVIEWS_KEY);
    await writeList(REVIEWS_KEY, [review, ...reviews]);
  }
  // Mark the booking as rated
  const bookings = await readList<Booking>(BOOKINGS_KEY);
  await writeList(BOOKINGS_KEY, bookings.map((b) => (b.id === input.bookingId ? { ...b, rated: true } : b)));
  await pushNotification({
    audience: 'venue',
    venueId: input.venue.id,
    title: 'New review',
    body: `${input.authorName} rated you ${input.rating}★${input.comment ? ` - “${input.comment.slice(0, 80)}”` : ''}`,
  });
  return review;
}

/** Local reviews for a venue (layered on top of seed/demo reviews). */
export async function getLocalReviews(venueId: string): Promise<Review[]> {
  return (await readList<Review>(REVIEWS_KEY)).filter((r) => r.venue_id === venueId);
}

export function ratingWithLocal(venue: Venue, localReviews: Review[]) {
  if (!localReviews.length) return { avg: venue.rating_avg, count: venue.rating_count };
  const seedTotal = venue.rating_avg * venue.rating_count;
  const localTotal = localReviews.reduce((s, r) => s + r.rating, 0);
  const count = venue.rating_count + localReviews.length;
  return { avg: count ? (seedTotal + localTotal) / count : 0, count };
}

// ---------------------------------------------------------------------------
// Promo codes
// ---------------------------------------------------------------------------
const demoPromos: PromoCode[] = (demo as any).promos ?? [];

export async function getPromoCodes(): Promise<PromoCode[]> {
  const sb = getSupabase();
  if (sb) {
    const { data } = await sb.from('promo_codes').select('*').order('created_at', { ascending: false });
    if (data?.length) return data;
  }
  const local = await readList<PromoCode>(PROMOS_KEY);
  const localCodes = new Set(local.map((p) => p.code));
  return [...local, ...demoPromos.filter((p) => !localCodes.has(p.code))];
}

export async function validatePromo(code: string): Promise<PromoCode | null> {
  const promos = await getPromoCodes();
  const promo = promos.find((p) => p.code.toUpperCase() === code.trim().toUpperCase());
  if (!promo || !promo.is_active) return null;
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) return null;
  if (promo.max_uses != null && (promo.used_count ?? 0) >= promo.max_uses) return null;
  return promo;
}

/** Count one redemption of a promo code (called when a booking uses it). */
export async function redeemPromo(code: string): Promise<void> {
  const sb = getSupabase();
  if (sb) await sb.rpc('redeem_promo', { p_code: code }).then(() => {}, () => {});
}


// ---------------------------------------------------------------------------
// Short delay requests
//
// Either side can ask to push a booking back by up to 15 minutes; the other
// side accepts or declines. Against Supabase this goes through two security
// definer RPCs that derive the caller's side from auth.uid(), so neither side
// can answer its own request. In demo mode the same rules are applied locally.

/** Ask the other side to push this booking back. Minutes must be 1 to 15. */
export async function requestBookingDelay(id: string, minutes: number, side: DelaySide): Promise<void> {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_DELAY_MINUTES) {
    throw new Error(`A delay must be between 1 and ${MAX_DELAY_MINUTES} minutes`);
  }
  const sb = getSupabase();
  if (sb && !id.startsWith('local-')) {
    const { error } = await sb.rpc('request_booking_delay', { p_booking: id, p_minutes: minutes });
    if (error) throw new Error(error.message);
    return;
  }
  const bookings = await readList<Booking>(BOOKINGS_KEY);
  await writeList(
    BOOKINGS_KEY,
    bookings.map((b) =>
      b.id === id
        ? { ...b, delay_minutes: minutes, delay_by: side, delay_at: new Date().toISOString() }
        : b
    )
  );
}

/**
 * Accept or decline a pending delay. Accepting shifts both ends of the booking
 * so its duration is preserved. Only the side that did not raise the request
 * may answer, which the database enforces for real bookings.
 */
export async function respondBookingDelay(id: string, accept: boolean, side: DelaySide): Promise<void> {
  const sb = getSupabase();
  if (sb && !id.startsWith('local-')) {
    const { error } = await sb.rpc('respond_booking_delay', { p_booking: id, p_accept: accept });
    if (error) throw new Error(error.message);
    return;
  }
  const bookings = await readList<Booking>(BOOKINGS_KEY);
  const booking = bookings.find((b) => b.id === id);
  if (!booking?.delay_minutes || !booking.delay_by) throw new Error('There is no delay request on that booking');
  if (booking.delay_by === side) throw new Error('The other side has to answer this request');

  const shift = accept ? booking.delay_minutes * 60000 : 0;
  await writeList(
    BOOKINGS_KEY,
    bookings.map((b) =>
      b.id === id
        ? {
            ...b,
            starts_at: new Date(new Date(b.starts_at).getTime() + shift).toISOString(),
            ends_at: new Date(new Date(b.ends_at).getTime() + shift).toISOString(),
            delay_minutes: null,
            delay_by: null,
            delay_at: null,
          }
        : b
    )
  );
}
