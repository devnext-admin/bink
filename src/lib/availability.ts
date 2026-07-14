import type { Venue } from './types';
import { formatDate, type Lang } from './i18n';

/**
 * The next bookable half-hour based on the venue's opening hours
 * (the booking flow still enforces real slot conflicts).
 * Returns e.g. "Today 16:30" / "Tue 10:00", or null when hours are unknown.
 */
export function nextAvailableLabel(venue: Venue, lang: Lang, t: (s: string, v?: any) => string): string | null {
  if (!venue.hours?.length) return null;
  const now = new Date();
  for (let d = 0; d < 7; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    const h = venue.hours.find((x) => x.weekday === day.getDay());
    if (!h || h.is_closed || !h.open_time || !h.close_time) continue;
    const [oh, om] = h.open_time.split(':').map(Number);
    const [ch, cm] = h.close_time.split(':').map(Number);
    const open = new Date(day);
    open.setHours(oh, om, 0, 0);
    const close = new Date(day);
    close.setHours(ch, cm, 0, 0);
    // earliest slot: opening time, or the next half hour if already open
    let slot = open;
    if (d === 0 && now > open) {
      const next = new Date(now.getTime() + 30 * 60000);
      next.setMinutes(next.getMinutes() >= 30 ? 30 : 0, 0, 0);
      if (next.getMinutes() === 0 && next <= now) next.setMinutes(30);
      slot = next < open ? open : next;
    }
    if (slot >= close) continue;
    const time = `${String(slot.getHours()).padStart(2, '0')}:${String(slot.getMinutes()).padStart(2, '0')}`;
    if (d === 0) return t('Next: Today {time}', { time });
    if (d === 1) return t('Next: Tomorrow {time}', { time });
    return t('Next: {day} {time}', { day: formatDate(lang, slot, { weekday: 'short' }), time });
  }
  return null;
}

/** Haversine distance in km between two coordinates. */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function distanceLabel(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
