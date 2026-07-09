// Money layer. When Supabase + a gateway key are configured, card payments go
// through the `create-payment` edge function (Moyasar-ready) and webhooks
// settle the transaction. In demo mode a simulated gateway succeeds instantly
// and everything (transactions, invoices, booking payment status) persists
// locally so Sales, Invoices and dashboards run on real data flows either way.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { pushNotification } from './notifications';
import { getSupabase } from './supabase';
import type { Booking, Invoice, PaymentMethod, Transaction } from './types';

export const VAT_RATE = 15; // KSA VAT %

const TX_KEY = 'bink.transactions';
const INV_KEY = 'bink.invoices';
const BOOKINGS_KEY = 'bink.bookings';

// Card payments are offered in the UI when either a real gateway is wired or
// we're in demo mode (simulated gateway). Set EXPO_PUBLIC_PAYMENTS_GATEWAY to
// 'moyasar' once the edge functions + secret key are live.
export const paymentsGateway = process.env.EXPO_PUBLIC_PAYMENTS_GATEWAY ?? 'demo';

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function splitVat(totalCents: number) {
  // Prices are VAT-inclusive; VAT portion = total * rate / (100 + rate)
  const vat = Math.round((totalCents * VAT_RATE) / (100 + VAT_RATE));
  return { subtotal_cents: totalCents - vat, vat_cents: vat };
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

async function nextInvoiceNumber(): Promise<string> {
  const invoices = await readList<Invoice>(INV_KEY);
  const year = new Date().getFullYear();
  return `BINK-${year}-${String(invoices.length + 1).padStart(6, '0')}`;
}

async function patchLocalBooking(bookingId: string, patch: Partial<Booking>) {
  const bookings = await readList<Booking>(BOOKINGS_KEY);
  await writeList(
    BOOKINGS_KEY,
    bookings.map((b) => (b.id === bookingId ? { ...b, ...patch } : b))
  );
}

// ---------------------------------------------------------------------------
// Charge a booking (card / apple_pay). Returns the settled transaction.
// ---------------------------------------------------------------------------
export interface PayForBookingInput {
  booking: Booking;
  method: Exclude<PaymentMethod, 'pay_at_venue'>;
  customerName?: string | null;
  userId?: string | null;
}

export async function payForBooking(input: PayForBookingInput): Promise<Transaction> {
  const sb = getSupabase();

  if (sb && paymentsGateway !== 'demo') {
    // Real gateway: the edge function creates the gateway payment, records a
    // pending transaction, and the webhook settles it. We await the result.
    const { data, error } = await sb.functions.invoke('create-payment', {
      body: {
        booking_id: input.booking.id,
        amount_cents: input.booking.total_cents,
        currency: input.booking.currency,
        method: input.method,
      },
    });
    if (error) throw new Error(error.message);
    return data.transaction as Transaction;
  }

  // Demo gateway: instant success
  await new Promise((r) => setTimeout(r, 600));
  const tx: Transaction = {
    id: uid('tx'),
    booking_id: input.booking.id,
    venue_id: input.booking.venue_id,
    venue_name: input.booking.venue_name,
    user_id: input.userId ?? null,
    customer_name: input.customerName ?? input.booking.customer_name ?? null,
    amount_cents: input.booking.total_cents,
    currency: input.booking.currency,
    method: input.method,
    status: 'succeeded',
    escrow_status: 'held',
    gateway: 'demo',
    gateway_ref: uid('demo'),
    created_at: new Date().toISOString(),
  };
  const txs = await readList<Transaction>(TX_KEY);
  await writeList(TX_KEY, [tx, ...txs]);

  const { subtotal_cents, vat_cents } = splitVat(tx.amount_cents);
  const invoice: Invoice = {
    id: uid('inv'),
    number: await nextInvoiceNumber(),
    booking_id: input.booking.id,
    venue_id: input.booking.venue_id,
    venue_name: input.booking.venue_name,
    user_id: input.userId ?? null,
    items: input.booking.items,
    subtotal_cents,
    vat_cents,
    total_cents: tx.amount_cents,
    vat_rate: VAT_RATE,
    currency: tx.currency,
    issued_at: tx.created_at,
  };
  const invoices = await readList<Invoice>(INV_KEY);
  await writeList(INV_KEY, [invoice, ...invoices]);

  await patchLocalBooking(input.booking.id, { payment_status: 'paid', payment_method: input.method });
  await pushNotification({
    audience: 'customer',
    userId: input.userId ?? null,
    venueId: input.booking.venue_id,
    title: 'Payment held in escrow',
    body: `${invoice.number} issued. Bink holds your payment securely and releases it to ${input.booking.venue_name} after your visit is confirmed.`,
  });
  return tx;
}

/** Record the chosen method on a pay-at-venue booking (no charge today). */
export async function markPayAtVenue(bookingId: string) {
  const sb = getSupabase();
  if (sb && !bookingId.startsWith('local-')) {
    await sb.from('bookings').update({ payment_method: 'pay_at_venue' }).eq('id', bookingId);
    return;
  }
  await patchLocalBooking(bookingId, { payment_status: 'unpaid', payment_method: 'pay_at_venue' });
}

// ---------------------------------------------------------------------------
// Refunds (venue owner / admin)
// ---------------------------------------------------------------------------
export async function refundBooking(bookingId: string): Promise<void> {
  const sb = getSupabase();
  if (sb && paymentsGateway !== 'demo' && !bookingId.startsWith('local-')) {
    const { error } = await sb.functions.invoke('refund-payment', { body: { booking_id: bookingId } });
    if (error) throw new Error(error.message);
    return;
  }
  const txs = await readList<Transaction>(TX_KEY);
  const tx = txs.find((t) => t.booking_id === bookingId && t.status === 'succeeded');
  await writeList(
    TX_KEY,
    txs.map((t) =>
      t.booking_id === bookingId && t.status === 'succeeded'
        ? { ...t, status: 'refunded', escrow_status: 'refunded' }
        : t
    )
  );
  await patchLocalBooking(bookingId, { payment_status: 'refunded' });
  if (tx) {
    await pushNotification({
      audience: 'customer',
      userId: tx.user_id,
      venueId: tx.venue_id,
      title: 'Refund issued',
      body: `Your payment of ${(tx.amount_cents / 100).toFixed(2)} ${tx.currency} was refunded to your original payment method.`,
    });
  }
}

// ---------------------------------------------------------------------------
// Escrow: release when BOTH the venue marked the booking completed and the
// customer confirmed the visit.
// ---------------------------------------------------------------------------
export async function confirmServiceByCustomer(bookingId: string): Promise<void> {
  const sb = getSupabase();
  const now = new Date().toISOString();
  if (sb && !bookingId.startsWith('local-')) {
    await sb.from('bookings').update({ customer_confirmed_at: now }).eq('id', bookingId);
  } else {
    await patchLocalBooking(bookingId, { customer_confirmed_at: now });
  }
  await tryReleaseEscrow(bookingId);
}

export async function tryReleaseEscrow(bookingId: string): Promise<boolean> {
  const sb = getSupabase();
  if (sb && !bookingId.startsWith('local-')) {
    const { data } = await sb.rpc('try_release_escrow', { p_booking_id: bookingId });
    return !!data;
  }
  const bookings = await readList<Booking>(BOOKINGS_KEY);
  const booking = bookings.find((b) => b.id === bookingId);
  if (!booking || booking.status !== 'completed' || !booking.customer_confirmed_at) return false;

  const txs = await readList<Transaction>(TX_KEY);
  const tx = txs.find((t) => t.booking_id === bookingId && t.status === 'succeeded' && t.escrow_status === 'held');
  if (!tx) return false;

  await writeList(
    TX_KEY,
    txs.map((t) => (t.id === tx.id ? { ...t, escrow_status: 'released', released_at: new Date().toISOString() } : t))
  );
  await pushNotification({
    audience: 'venue',
    venueId: tx.venue_id,
    title: 'Payment released',
    body: `${(tx.amount_cents / 100).toFixed(2)} ${tx.currency} from ${booking.customer_name ?? 'a customer'} was released from escrow to your account.`,
  });
  await pushNotification({
    audience: 'customer',
    userId: booking.user_id ?? tx.user_id,
    venueId: tx.venue_id,
    title: 'Payment released to salon',
    body: `Thanks for confirming your visit at ${booking.venue_name}. Your payment was released.`,
  });
  return true;
}

export function escrowSummary(transactions: Transaction[]) {
  const held = transactions.filter((t) => t.status === 'succeeded' && t.escrow_status === 'held');
  const released = transactions.filter((t) => t.escrow_status === 'released');
  return {
    held_cents: held.reduce((c, t) => c + t.amount_cents, 0),
    released_cents: released.reduce((c, t) => c + t.amount_cents, 0),
    currency: transactions[0]?.currency ?? 'SAR',
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
export async function getVenueTransactions(venueId: string): Promise<Transaction[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('transactions')
      .select('*')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false });
    if (!error && data?.length) return data;
  }
  return (await readList<Transaction>(TX_KEY)).filter((t) => t.venue_id === venueId);
}

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

export async function getMyInvoices(userId?: string | null): Promise<Invoice[]> {
  const sb = getSupabase();
  if (sb && userId) {
    const { data, error } = await sb
      .from('invoices')
      .select('*, venue:venues (name)')
      .order('issued_at', { ascending: false });
    if (!error && data?.length) return data.map((i: any) => ({ ...i, venue_name: i.venue?.name }));
  }
  return readList<Invoice>(INV_KEY);
}

export function salesSummary(transactions: Transaction[]) {
  const succeeded = transactions.filter((t) => t.status === 'succeeded');
  const refunded = transactions.filter((t) => t.status === 'refunded');
  const gross = succeeded.reduce((c, t) => c + t.amount_cents, 0) + refunded.reduce((c, t) => c + t.amount_cents, 0);
  const refunds = refunded.reduce((c, t) => c + t.amount_cents, 0);
  return {
    gross_cents: gross,
    refunds_cents: refunds,
    net_cents: gross - refunds,
    count: succeeded.length + refunded.length,
    currency: transactions[0]?.currency ?? 'SAR',
  };
}
