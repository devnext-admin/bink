import { arContent } from './translations/ar-content';

// Notification bodies are stored as finished English sentences (with venue
// names and dates baked in at write time). Every body comes from one of our
// own templates, so for Arabic we translate at render time: first the fixed
// template phrases, then any embedded content names, then date/time tokens.

const PHRASES: [string, string][] = [
  ['. See you there!', '. نراك هناك!'],
  ['See you there!', 'نراك هناك!'],
  [' booked ', ' حجز(ت) '],
  [' for ', ' ليوم '],
  ['A customer', 'أحد العملاء'],
  [' cancelled ', ' ألغى(ت) '],
  [' moved their appointment to ', ' نقل(ت) موعدهم إلى '],
  ['issued. Bink holds your payment securely and releases it to ',
   'صدرت. تحتفظ بينك بمبلغك بأمان وتحوّله إلى '],
  [' after your visit is confirmed.', ' بعد تأكيد زيارتك.'],
  ['Your payment of ', 'مبلغك البالغ '],
  [' was refunded to your original payment method.', ' أعيد إلى وسيلة الدفع الأصلية.'],
  [' secures your booking at ', ' يحجز موعدك لدى '],
  ['. The rest is paid at the venue.', '. ويُدفع الباقي في الصالون.'],
  [' paid online - held in escrow until the visit is confirmed.',
   ' دُفع إلكترونيًا - محفوظ في الضمان حتى تأكيد الزيارة.'],
  [' rated you ', ' قيّمك(ت) بـ '],
  ['How was your visit to ', 'كيف كانت زيارتك إلى '],
  ['? Tap to rate it.', '؟ اضغط للتقييم.'],
  ['Payment released for your visit to ', 'تم تحويل دفعة زيارتك إلى '],
  [' has been released to you.', ' حُوّلت إليك.'],
  ['Your listing is now live on Bink.', 'أصبح إدراجك متاحًا الآن على بينك.'],
  [' SAR', ' ر.س'],
];

const DAYS: [string, string][] = [
  ['Mon', 'الاثنين'], ['Tue', 'الثلاثاء'], ['Wed', 'الأربعاء'], ['Thu', 'الخميس'],
  ['Fri', 'الجمعة'], ['Sat', 'السبت'], ['Sun', 'الأحد'],
];
const MONTHS: [string, string][] = [
  ['Jan', 'يناير'], ['Feb', 'فبراير'], ['Mar', 'مارس'], ['Apr', 'أبريل'],
  ['May', 'مايو'], ['Jun', 'يونيو'], ['Jul', 'يوليو'], ['Aug', 'أغسطس'],
  ['Sep', 'سبتمبر'], ['Oct', 'أكتوبر'], ['Nov', 'نوفمبر'], ['Dec', 'ديسمبر'],
];

// Content names sorted longest-first so "Glow Lash Studio" wins over "Glow".
const NAMES = Object.entries(arContent)
  .filter(([k]) => k.length >= 3)
  .sort((a, b) => b[0].length - a[0].length);

export function translateNotificationBody(body: string): string {
  let b = body;
  for (const [en, ar] of PHRASES) b = b.split(en).join(ar);
  for (const [en, ar] of NAMES) if (b.includes(en)) b = b.split(en).join(ar);
  for (const [en, ar] of DAYS) b = b.replace(new RegExp(`\\b${en}\\b`, 'g'), ar);
  for (const [en, ar] of MONTHS) b = b.replace(new RegExp(`\\b${en}\\b`, 'g'), ar);
  b = b.replace(/\bAM\b/g, 'صباحًا').replace(/\bPM\b/g, 'مساءً').replace(/\bat\b/g, 'الساعة');
  return b;
}
