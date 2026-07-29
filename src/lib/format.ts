// Kept in sync by the I18nProvider so prices localise ("SAR 180" → "180 ر.س")
// without threading lang through every call site.
let priceLang: 'en' | 'ar' = 'en';
export function setPriceLang(l: 'en' | 'ar') {
  priceLang = l;
}

export function formatPrice(cents: number, currency: string): string {
  const whole = cents / 100;
  const str = Number.isInteger(whole) ? whole.toLocaleString('en-US') : whole.toFixed(2);
  if (priceLang === 'ar' && currency === 'SAR') return `${str} ر.س`;
  return `${currency} ${str}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return h === 1 ? '1 hr' : `${h} hrs`;
  return `${h} hr, ${m} min`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function weekdayName(weekday: number): string {
  return WEEKDAYS[weekday] ?? '';
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTimeOfDate(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
