// One-click demo experiences. Each persona gets a rich, deterministic dataset
// (bookings in every state, escrow, chats, notifications, invoices, favorites)
// so a first-time visitor sees the whole product working immediately.
// Seeding is idempotent: prior demo-persona rows are removed and re-written,
// so the demo always opens in the same polished state.

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppNotification } from './notifications';
import type { ChatMessage } from './messages';
import type { Booking, Invoice, Transaction, Venue } from './types';

export const DEMO_CUSTOMER_EMAIL = 'demo@bink.com';
export const DEMO_OWNER_EMAIL = 'owner@bink.com';
export const DEMO_ADMIN_EMAIL = 'admin@bink.com';

const CUSTOMER_ID = `demo-${DEMO_CUSTOMER_EMAIL}`;
const OWNER_ID = `demo-${DEMO_OWNER_EMAIL}`;
const DEMO_VENUE_ID = 'venue-demo-glow-and-co';

// Seed-venue ids (from scripts/data.mjs deterministic uuids)
const FADE_ROOM = '00000000-0000-4000-8000-000000000002';
const VELVET_NAILS = '00000000-0000-4000-8000-000000000004';
const BLOWOUT_BAR = '00000000-0000-4000-8000-000000000003';

const img = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`;

function at(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function readList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function upsert<T extends { id: string }>(key: string, mine: (item: T) => boolean, rows: T[]) {
  const existing = await readList<T>(key);
  await AsyncStorage.setItem(key, JSON.stringify([...rows, ...existing.filter((r) => !mine(r))]));
}

/** Pre-register the persona in the demo user registry so signIn picks up the
 *  friendly display name and role. */
async function registerPersona(email: string, name: string, role: 'customer' | 'partner' | 'admin') {
  const users = await readList<any>('bink.users');
  const row = { id: `demo-${email}`, email, name, role, isGuest: true, joined_at: at(-14, 9) };
  await AsyncStorage.setItem(
    'bink.users',
    JSON.stringify([row, ...users.filter((u: any) => u.email !== email)])
  );
}

// ---------------------------------------------------------------------------
// Customer demo: Deema — a regular Bink user with history everywhere
// ---------------------------------------------------------------------------
export async function seedCustomerDemo() {
  await registerPersona(DEMO_CUSTOMER_EMAIL, 'Deema', 'customer');
  const bookings: Booking[] = [
    {
      // Upcoming, paid online → held in escrow
      id: 'local-demo-c1',
      venue_id: VELVET_NAILS,
      user_id: CUSTOMER_ID,
      customer_name: 'Deema',
      venue_name: 'Velvet Nails Lounge',
      venue_area: 'Al Olaya, Riyadh',
      staff_id: null,
      staff_name: 'Jenny',
      notes: 'Soft square shape please 💅',
      starts_at: at(2, 16, 0),
      ends_at: at(2, 17, 0),
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: 'card',
      total_cents: 15000,
      currency: 'SAR',
      items: [{ service_id: 'demo-s1', service_name: 'Gel Manicure', duration_minutes: 60, price_cents: 15000 }],
    },
    {
      // Upcoming, pay at venue
      id: 'local-demo-c2',
      venue_id: FADE_ROOM,
      user_id: CUSTOMER_ID,
      customer_name: 'Deema',
      venue_name: 'The Fade Room',
      venue_area: 'Corniche, Al Khobar',
      staff_id: null,
      staff_name: null,
      starts_at: at(5, 18, 30),
      ends_at: at(5, 19, 15),
      status: 'confirmed',
      payment_status: 'unpaid',
      payment_method: 'pay_at_venue',
      total_cents: 9000,
      currency: 'SAR',
      items: [{ service_id: 'demo-s2', service_name: 'Classic Haircut', duration_minutes: 45, price_cents: 9000 }],
    },
    {
      // Past, completed by salon, awaiting customer confirmation → escrow held
      id: 'local-demo-c3',
      venue_id: BLOWOUT_BAR,
      user_id: CUSTOMER_ID,
      customer_name: 'Deema',
      venue_name: 'The Blowout Bar',
      venue_area: 'Ash Shati, Jeddah',
      staff_id: null,
      staff_name: 'Anong',
      starts_at: at(-2, 15, 0),
      ends_at: at(-2, 15, 45),
      status: 'completed',
      payment_status: 'paid',
      payment_method: 'apple_pay',
      total_cents: 14000,
      currency: 'SAR',
      items: [{ service_id: 'demo-s3', service_name: 'Signature Blowout', duration_minutes: 45, price_cents: 14000 }],
    },
    {
      // Past, fully settled: completed + confirmed + released + rated
      id: 'local-demo-c4',
      venue_id: VELVET_NAILS,
      user_id: CUSTOMER_ID,
      customer_name: 'Deema',
      venue_name: 'Velvet Nails Lounge',
      venue_area: 'Al Olaya, Riyadh',
      staff_id: null,
      staff_name: 'Thao',
      starts_at: at(-9, 13, 0),
      ends_at: at(-9, 14, 15),
      status: 'completed',
      customer_confirmed_at: at(-8, 10, 0),
      rated: true,
      payment_status: 'paid',
      payment_method: 'card',
      total_cents: 20000,
      currency: 'SAR',
      items: [{ service_id: 'demo-s4', service_name: 'Luxury Spa Pedicure', duration_minutes: 75, price_cents: 20000 }],
    },
  ];

  const transactions: Transaction[] = [
    {
      id: 'tx-demo-c1',
      booking_id: 'local-demo-c1',
      venue_id: VELVET_NAILS,
      venue_name: 'Velvet Nails Lounge',
      user_id: CUSTOMER_ID,
      customer_name: 'Deema',
      amount_cents: 15000,
      currency: 'SAR',
      method: 'card',
      status: 'succeeded',
      escrow_status: 'held',
      gateway: 'demo',
      gateway_ref: 'demo-ref-c1',
      created_at: at(-1, 12, 0),
    },
    {
      id: 'tx-demo-c3',
      booking_id: 'local-demo-c3',
      venue_id: BLOWOUT_BAR,
      venue_name: 'The Blowout Bar',
      user_id: CUSTOMER_ID,
      customer_name: 'Deema',
      amount_cents: 14000,
      currency: 'SAR',
      method: 'apple_pay',
      status: 'succeeded',
      escrow_status: 'held',
      gateway: 'demo',
      gateway_ref: 'demo-ref-c3',
      created_at: at(-3, 9, 30),
    },
    {
      id: 'tx-demo-c4',
      booking_id: 'local-demo-c4',
      venue_id: VELVET_NAILS,
      venue_name: 'Velvet Nails Lounge',
      user_id: CUSTOMER_ID,
      customer_name: 'Deema',
      amount_cents: 20000,
      currency: 'SAR',
      method: 'card',
      status: 'succeeded',
      escrow_status: 'released',
      released_at: at(-8, 10, 5),
      gateway: 'demo',
      gateway_ref: 'demo-ref-c4',
      created_at: at(-10, 11, 0),
    },
  ];

  const invoices: Invoice[] = [
    {
      id: 'inv-demo-c1',
      number: 'BINK-DEMO-000101',
      booking_id: 'local-demo-c1',
      venue_id: VELVET_NAILS,
      venue_name: 'Velvet Nails Lounge',
      user_id: CUSTOMER_ID,
      items: bookings[0].items,
      subtotal_cents: 13043,
      vat_cents: 1957,
      total_cents: 15000,
      vat_rate: 15,
      currency: 'SAR',
      issued_at: at(-1, 12, 0),
    },
    {
      id: 'inv-demo-c4',
      number: 'BINK-DEMO-000088',
      booking_id: 'local-demo-c4',
      venue_id: VELVET_NAILS,
      venue_name: 'Velvet Nails Lounge',
      user_id: CUSTOMER_ID,
      items: bookings[3].items,
      subtotal_cents: 17391,
      vat_cents: 2609,
      total_cents: 20000,
      vat_rate: 15,
      currency: 'SAR',
      issued_at: at(-10, 11, 0),
    },
  ];

  const messages: ChatMessage[] = [
    {
      id: 'msg-demo-c1',
      venue_id: FADE_ROOM,
      venue_name: 'The Fade Room',
      user_id: CUSTOMER_ID,
      user_name: 'Deema',
      sender: 'customer',
      text: 'Hi! Booking for Saturday — can I get Omar if he is free?',
      read_by_customer: true,
      read_by_venue: true,
      created_at: at(-1, 17, 2),
    },
    {
      id: 'msg-demo-c2',
      venue_id: FADE_ROOM,
      venue_name: 'The Fade Room',
      user_id: CUSTOMER_ID,
      user_name: 'Deema',
      sender: 'venue',
      text: 'Hi Deema! Omar is in on Saturday — I moved your booking to him. See you then! ✂️',
      read_by_customer: false, // unread badge for the demo user
      read_by_venue: true,
      created_at: at(-1, 17, 26),
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'ntf-demo-c1',
      user_id: CUSTOMER_ID,
      venue_id: FADE_ROOM,
      audience: 'customer',
      title: 'Message from The Fade Room',
      body: 'Omar is in on Saturday — I moved your booking to him. See you then!',
      is_read: false,
      created_at: at(-1, 17, 26),
    },
    {
      id: 'ntf-demo-c2',
      user_id: CUSTOMER_ID,
      venue_id: BLOWOUT_BAR,
      audience: 'customer',
      title: 'Thanks for visiting!',
      body: 'How was The Blowout Bar? Confirm your visit under Appointments to release the payment, and leave a rating.',
      is_read: false,
      created_at: at(-2, 16, 0),
    },
    {
      id: 'ntf-demo-c3',
      user_id: CUSTOMER_ID,
      venue_id: VELVET_NAILS,
      audience: 'customer',
      title: 'Payment held in escrow',
      body: 'BINK-DEMO-000101 issued. Bink holds your payment securely and releases it to Velvet Nails Lounge after your visit is confirmed.',
      is_read: true,
      created_at: at(-1, 12, 0),
    },
  ];

  await upsert<Booking>('bink.bookings', (b) => b.id.startsWith('local-demo-c'), bookings);
  await upsert<Transaction>('bink.transactions', (t) => t.id.startsWith('tx-demo-c'), transactions);
  await upsert<Invoice>('bink.invoices', (i) => i.id.startsWith('inv-demo-c'), invoices);
  await upsert<ChatMessage>('bink.messages', (m) => m.id.startsWith('msg-demo-c'), messages);
  await upsert<AppNotification>('bink.notifications', (n) => n.id.startsWith('ntf-demo-c'), notifications);
  await AsyncStorage.setItem(`bink.favorites:${CUSTOMER_ID}`, JSON.stringify([VELVET_NAILS, FADE_ROOM, BLOWOUT_BAR]));
}

// ---------------------------------------------------------------------------
// Salon-owner demo: a live salon with bookings, sales, chats and reviews
// ---------------------------------------------------------------------------
export async function seedOwnerDemo() {
  await registerPersona(DEMO_OWNER_EMAIL, 'Lama', 'partner');
  await registerPersona(DEMO_ADMIN_EMAIL, 'Bink Admin', 'admin');
  const venue: Venue = {
    id: DEMO_VENUE_ID,
    slug: 'glow-and-co-demo',
    name: 'Glow & Co',
    description:
      'Your neighbourhood glow-up destination — precision cuts, colour and styling from a team that treats every visit like an occasion.',
    category_id: 1,
    owner_id: OWNER_ID,
    status: 'approved',
    address: 'King Fahd Rd, Tower 3',
    area: 'Al Olaya',
    city: 'Riyadh',
    country: 'Saudi Arabia',
    rating_avg: 4.9,
    rating_count: 2,
    is_featured: false,
    is_new: true,
    is_trending: false,
    highlights: ['Instant confirmation', 'Pay by app', 'Parking available', 'Woman-owned'],
    images: [
      { url: img('photo-1633681926022-84c23e8cb2d6'), sort_order: 0 },
      { url: img('photo-1560066984-138dadb4c035'), sort_order: 1 },
      { url: img('photo-1500840216050-6ffa99d75160'), sort_order: 2 },
    ],
    services: [
      { id: 'svc-demo-1', venue_id: DEMO_VENUE_ID, name: 'Signature Cut & Style', description: '', group_name: 'Featured', duration_minutes: 60, price_cents: 18000, currency: 'SAR', discount_pct: 0, is_featured: true, sort_order: 0 },
      { id: 'svc-demo-2', venue_id: DEMO_VENUE_ID, name: 'Full Colour', description: '', group_name: 'Featured', duration_minutes: 120, price_cents: 38000, currency: 'SAR', discount_pct: 10, is_featured: true, sort_order: 1 },
      { id: 'svc-demo-3', venue_id: DEMO_VENUE_ID, name: 'Blow Dry', description: '', group_name: 'Styling', duration_minutes: 40, price_cents: 11000, currency: 'SAR', discount_pct: 0, is_featured: false, sort_order: 2 },
    ],
    staff: [
      { id: 'staff-demo-1', venue_id: DEMO_VENUE_ID, name: 'Lama', role: 'Owner & stylist', rating: 5.0 },
      { id: 'staff-demo-2', venue_id: DEMO_VENUE_ID, name: 'Rita', role: 'Colour specialist', rating: 4.9 },
    ],
    reviews: [
      { id: 'rev-demo-1', venue_id: DEMO_VENUE_ID, author_name: 'Aisha B', rating: 5, comment: 'Lama gave me the best cut I have had in years. Booking through Bink was effortless.', created_at: at(-6, 15, 0) },
      { id: 'rev-demo-2', venue_id: DEMO_VENUE_ID, author_name: 'Sara A', rating: 5, comment: 'Beautiful salon, on time, and the colour turned out perfect.', created_at: at(-12, 12, 0) },
    ],
    hours: Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      open_time: weekday === 0 ? null : '10:00',
      close_time: weekday === 0 ? null : '22:00',
      is_closed: weekday === 0,
    })),
  };

  const bookings: Booking[] = [
    {
      id: 'local-demo-o1',
      venue_id: DEMO_VENUE_ID,
      user_id: 'demo-aisha@customer.com',
      customer_name: 'Aisha B',
      venue_name: 'Glow & Co',
      venue_area: 'Al Olaya, Riyadh',
      staff_id: 'staff-demo-1',
      staff_name: 'Lama',
      notes: 'First visit — shoulder-length trim.',
      starts_at: at(1, 14, 0),
      ends_at: at(1, 15, 0),
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: 'card',
      total_cents: 18000,
      currency: 'SAR',
      items: [{ service_id: 'svc-demo-1', service_name: 'Signature Cut & Style', duration_minutes: 60, price_cents: 18000 }],
    },
    {
      id: 'local-demo-o2',
      venue_id: DEMO_VENUE_ID,
      user_id: 'demo-maha@customer.com',
      customer_name: 'Maha S',
      venue_name: 'Glow & Co',
      venue_area: 'Al Olaya, Riyadh',
      staff_id: 'staff-demo-2',
      staff_name: 'Rita',
      starts_at: at(2, 11, 0),
      ends_at: at(2, 13, 0),
      status: 'confirmed',
      payment_status: 'unpaid',
      payment_method: 'pay_at_venue',
      total_cents: 34200,
      currency: 'SAR',
      items: [{ service_id: 'svc-demo-2', service_name: 'Full Colour', duration_minutes: 120, price_cents: 34200 }],
    },
    {
      id: 'local-demo-o3',
      venue_id: DEMO_VENUE_ID,
      user_id: 'demo-sara@customer.com',
      customer_name: 'Sara A',
      venue_name: 'Glow & Co',
      venue_area: 'Al Olaya, Riyadh',
      staff_id: 'staff-demo-1',
      staff_name: 'Lama',
      starts_at: at(-4, 17, 0),
      ends_at: at(-4, 17, 40),
      status: 'completed',
      customer_confirmed_at: at(-3, 9, 0),
      payment_status: 'paid',
      payment_method: 'card',
      total_cents: 11000,
      currency: 'SAR',
      items: [{ service_id: 'svc-demo-3', service_name: 'Blow Dry', duration_minutes: 40, price_cents: 11000 }],
    },
  ];

  const transactions: Transaction[] = [
    {
      id: 'tx-demo-o1',
      booking_id: 'local-demo-o1',
      venue_id: DEMO_VENUE_ID,
      venue_name: 'Glow & Co',
      user_id: 'demo-aisha@customer.com',
      customer_name: 'Aisha B',
      amount_cents: 18000,
      currency: 'SAR',
      method: 'card',
      status: 'succeeded',
      escrow_status: 'held',
      gateway: 'demo',
      gateway_ref: 'demo-ref-o1',
      created_at: at(-1, 10, 0),
    },
    {
      id: 'tx-demo-o3',
      booking_id: 'local-demo-o3',
      venue_id: DEMO_VENUE_ID,
      venue_name: 'Glow & Co',
      user_id: 'demo-sara@customer.com',
      customer_name: 'Sara A',
      amount_cents: 11000,
      currency: 'SAR',
      method: 'card',
      status: 'succeeded',
      escrow_status: 'released',
      released_at: at(-3, 9, 5),
      gateway: 'demo',
      gateway_ref: 'demo-ref-o3',
      created_at: at(-5, 16, 0),
    },
  ];

  const messages: ChatMessage[] = [
    {
      id: 'msg-demo-o1',
      venue_id: DEMO_VENUE_ID,
      venue_name: 'Glow & Co',
      user_id: 'demo-aisha@customer.com',
      user_name: 'Aisha B',
      sender: 'customer',
      text: 'Hi! Is there parking near the salon?',
      read_by_customer: true,
      read_by_venue: false, // unread for the owner demo
      created_at: at(0, 9, 45),
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'ntf-demo-o1',
      user_id: null,
      venue_id: DEMO_VENUE_ID,
      audience: 'venue',
      title: 'New message',
      body: 'Aisha B: Hi! Is there parking near the salon?',
      is_read: false,
      created_at: at(0, 9, 45),
    },
    {
      id: 'ntf-demo-o2',
      user_id: null,
      venue_id: DEMO_VENUE_ID,
      audience: 'venue',
      title: 'New booking',
      body: 'Aisha B booked Signature Cut & Style for tomorrow 2:00 PM.',
      is_read: false,
      created_at: at(-1, 10, 0),
    },
    {
      id: 'ntf-demo-o3',
      user_id: null,
      venue_id: DEMO_VENUE_ID,
      audience: 'venue',
      title: 'Payment released',
      body: '110.00 SAR from Sara A was released from escrow to your account.',
      is_read: true,
      created_at: at(-3, 9, 5),
    },
  ];

  await upsert<Venue>('bink.localVenues', (v) => v.id === DEMO_VENUE_ID, [venue]);
  await upsert<Booking>('bink.bookings', (b) => b.id.startsWith('local-demo-o'), bookings);
  await upsert<Transaction>('bink.transactions', (t) => t.id.startsWith('tx-demo-o'), transactions);
  await upsert<ChatMessage>('bink.messages', (m) => m.id.startsWith('msg-demo-o'), messages);
  await upsert<AppNotification>('bink.notifications', (n) => n.id.startsWith('ntf-demo-o'), notifications);
}
