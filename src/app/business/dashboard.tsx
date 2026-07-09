import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../../components/logo';
import { PaymentPill } from '../../components/payment-pill';
import { Button } from '../../components/ui/button';
import { Chip } from '../../components/ui/chip';
import { Field } from '../../components/ui/field';
import { Rating } from '../../components/ui/rating';
import { BText } from '../../components/ui/text';
import { useAppData } from '../../lib/app-data-context';
import { useAuth } from '../../lib/auth-context';
import {
  addService,
  addStaff,
  addVenueImage,
  deleteService,
  deleteStaff,
  getVenueBookings,
  removeVenueImage,
  updateService,
  updateStaff,
  updateVenueHours,
  updateVenueInfo,
} from '../../lib/business';
import { formatDateLong, formatDuration, formatPrice, formatTimeOfDate } from '../../lib/format';
import { setBookingStatus } from '../../lib/ops';
import { getVenueTransactions, refundBooking, salesSummary } from '../../lib/payments';
import { colors, font, maxContentWidth, radius } from '../../lib/theme';
import type { Booking, Transaction, Venue } from '../../lib/types';
import { useIsDesktop } from '../../lib/use-layout';

type Section = 'overview' | 'bookings' | 'sales' | 'analytics' | 'services' | 'staff' | 'settings';
const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'grid-outline' },
  { key: 'bookings', label: 'Bookings', icon: 'calendar-outline' },
  { key: 'sales', label: 'Sales', icon: 'cash-outline' },
  { key: 'analytics', label: 'Analytics', icon: 'stats-chart-outline' },
  { key: 'services', label: 'Services', icon: 'pricetags-outline' },
  { key: 'staff', label: 'Team', icon: 'people-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];

export default function BusinessDashboard() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuth();
  const { allVenues, refresh } = useAppData();

  const myVenues = useMemo(
    () => (user ? allVenues.filter((v) => v.owner_id === user.id) : []),
    [allVenues, user]
  );
  const [venueId, setVenueId] = useState<string | null>(null);
  const venue = myVenues.find((v) => v.id === venueId) ?? myVenues[0] ?? null;

  const [section, setSection] = useState<Section>('overview');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    if (venue) {
      getVenueBookings(venue.id).then(setBookings);
      getVenueTransactions(venue.id).then(setTransactions);
    }
  }, [venue?.id]);

  const reload = useCallback(async () => {
    await refresh();
    if (venue) {
      getVenueBookings(venue.id).then(setBookings);
      getVenueTransactions(venue.id).then(setTransactions);
    }
  }, [refresh, venue?.id]);

  if (loading) return null;

  if (!user || myVenues.length === 0) {
    return (
      <View style={[styles.emptyWrap, { paddingTop: insets.top + 40 }]}>
        <Logo />
        <BText variant="h2" style={{ marginTop: 32 }}>
          No business yet
        </BText>
        <BText variant="small" style={{ marginTop: 8, textAlign: 'center', maxWidth: 320 }}>
          {user
            ? 'List your salon on Bink to get your business dashboard.'
            : 'Log in and list your salon to get your business dashboard.'}
        </BText>
        <View style={{ marginTop: 20 }}>
          <Button title="List your business" onPress={() => router.replace('/business')} />
        </View>
      </View>
    );
  }

  const revenue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((c, b) => c + b.total_cents, 0);
  const upcoming = bookings.filter(
    (b) => new Date(b.starts_at).getTime() >= Date.now() && b.status !== 'cancelled'
  );
  const currency = venue!.services[0]?.currency ?? 'SAR';

  let body: React.ReactNode = null;
  if (section === 'overview') {
    body = (
      <View style={{ gap: 24 }}>
        {venue!.status === 'pending' && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={18} color={colors.warning} />
            <BText variant="small" color={colors.warning} style={{ flex: 1 }}>
              Your listing is pending review by the Bink team. It is not visible to customers yet.
            </BText>
          </View>
        )}
        {venue!.status === 'suspended' && (
          <View style={[styles.pendingBanner, { backgroundColor: colors.dangerBg }]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <BText variant="small" color={colors.danger} style={{ flex: 1 }}>
              Your listing is suspended. Contact Bink support for details.
            </BText>
          </View>
        )}
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
          <StatCard label="Upcoming bookings" value={String(upcoming.length)} icon="calendar-outline" />
          <StatCard label="Total revenue" value={formatPrice(revenue, currency)} icon="cash-outline" />
          <StatCard
            label="Rating"
            value={venue!.rating_count ? `${venue!.rating_avg.toFixed(1)} ★` : 'No reviews yet'}
            icon="star-outline"
          />
          <StatCard label="Services listed" value={String(venue!.services.length)} icon="pricetags-outline" />
        </View>
        <View style={styles.card}>
          <BText variant="h3">Next appointments</BText>
          {upcoming.length === 0 ? (
            <BText variant="small" style={{ marginTop: 10 }}>
              Nothing booked yet. Share your Bink page to start filling the calendar.
            </BText>
          ) : (
            upcoming.slice(0, 5).map((b) => <BookingRow key={b.id} booking={b} />)
          )}
        </View>
        <View style={styles.card}>
          <BText variant="h3">Your public page</BText>
          <BText variant="small" style={{ marginTop: 6 }}>
            bink.app/venue/{venue!.slug}
          </BText>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <Button
              title="Preview listing"
              variant="secondary"
              size="sm"
              onPress={() => router.push(`/venue/${venue!.slug}`)}
            />
          </View>
        </View>
      </View>
    );
  } else if (section === 'bookings') {
    body = (
      <View style={styles.card}>
        <BText variant="h3">All bookings</BText>
        {bookings.length === 0 ? (
          <BText variant="small" style={{ marginTop: 10 }}>
            No bookings yet.
          </BText>
        ) : (
          bookings.map((b) => <BookingRow key={b.id} booking={b} onRefund={reload} />)
        )}
      </View>
    );
  } else if (section === 'sales') {
    const summary = salesSummary(transactions);
    body = (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
          <StatCard label="Gross sales" value={formatPrice(summary.gross_cents, summary.currency)} icon="trending-up-outline" />
          <StatCard label="Refunds" value={formatPrice(summary.refunds_cents, summary.currency)} icon="return-down-back-outline" />
          <StatCard label="Net revenue" value={formatPrice(summary.net_cents, summary.currency)} icon="cash-outline" />
          <StatCard label="Transactions" value={String(summary.count)} icon="receipt-outline" />
        </View>
        <View style={styles.card}>
          <BText variant="h3">Transactions</BText>
          {transactions.length === 0 ? (
            <BText variant="small" style={{ marginTop: 10 }}>
              No online payments yet. Card and Apple Pay payments will appear here; pay-at-venue bookings are
              listed under Bookings.
            </BText>
          ) : (
            transactions.map((t) => (
              <View key={t.id} style={styles.bookingRow}>
                <View style={{ flex: 1 }}>
                  <BText variant="smallMedium">
                    {t.customer_name || 'Customer'} ·{' '}
                    {t.method === 'apple_pay' ? 'Apple Pay' : t.method === 'card' ? 'Card' : 'At venue'}
                  </BText>
                  <BText variant="tiny">
                    {formatDateLong(t.created_at)} · {t.gateway}
                    {t.gateway_ref ? ` · ${t.gateway_ref}` : ''}
                  </BText>
                </View>
                <BText
                  variant="smallMedium"
                  color={t.status === 'refunded' ? colors.danger : colors.ink}
                  style={t.status === 'refunded' ? { textDecorationLine: 'line-through' } : undefined}
                >
                  {formatPrice(t.amount_cents, t.currency)}
                </BText>
                <TxStatusPill status={t.status} />
              </View>
            ))
          )}
        </View>
      </View>
    );
  } else if (section === 'analytics') {
    body = <AnalyticsSection bookings={bookings} venue={venue!} isDesktop={isDesktop} />;
  } else if (section === 'services') {
    body = <ServicesEditor venue={venue!} onChanged={reload} />;
  } else if (section === 'staff') {
    body = <StaffEditor venue={venue!} onChanged={reload} />;
  } else {
    body = <SettingsEditor venue={venue!} onChanged={reload} />;
  }

  const nav = (
    <View style={isDesktop ? styles.sideNav : styles.topNav}>
      {SECTIONS.map((s) => {
        const active = section === s.key;
        return (
          <Pressable
            key={s.key}
            onPress={() => setSection(s.key)}
            style={[
              isDesktop ? styles.sideNavItem : styles.topNavItem,
              active && { backgroundColor: colors.ink },
            ]}
          >
            <Ionicons name={s.icon as any} size={16} color={active ? colors.white : colors.ink} />
            <BText
              style={{
                fontFamily: active ? font.bold : font.medium,
                fontSize: 14,
                color: active ? colors.white : colors.ink,
              }}
            >
              {s.label}
            </BText>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPage }}>
      {/* header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Logo size={22} />
            <View style={styles.bizTag}>
              <BText style={{ fontFamily: font.bold, fontSize: 11, color: colors.accent }}>BUSINESS</BText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {myVenues.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {myVenues.map((v) => (
                  <Chip key={v.id} label={v.name} selected={venue!.id === v.id} onPress={() => setVenueId(v.id)} />
                ))}
              </ScrollView>
            )}
            <Pressable onPress={() => router.push('/')} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={[styles.contentWrap, isDesktop && { flexDirection: 'row', gap: 28 }]}>
          {nav}
          <View style={{ flex: 1, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <Image
                source={{ uri: venue!.images[0]?.url }}
                style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.bgSubtle }}
                contentFit="cover"
              />
              <View>
                <BText variant="h2">{venue!.name}</BText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <BText variant="small">
                    {venue!.area ? `${venue!.area}, ` : ''}
                    {venue!.city}
                  </BText>
                  <StatusTag status={venue!.status ?? 'approved'} />
                </View>
              </View>
            </View>
            {body}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
function StatusTag({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    approved: { label: 'Live', color: colors.green, bg: colors.greenBg },
    pending: { label: 'Pending review', color: colors.warning, bg: colors.warningBg },
    suspended: { label: 'Suspended', color: colors.danger, bg: colors.dangerBg },
  };
  const m = map[status] ?? map.approved;
  return (
    <View style={{ backgroundColor: m.bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
      <BText style={{ fontFamily: font.semibold, fontSize: 11, color: m.color }}>{m.label}</BText>
    </View>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={[styles.card, { flex: 1, minWidth: 150 }]}>
      <Ionicons name={icon as any} size={18} color={colors.gray} />
      <BText style={{ fontFamily: font.extrabold, fontSize: 24, lineHeight: 32, color: colors.ink, marginTop: 8 }}>
        {value}
      </BText>
      <BText variant="tiny" style={{ marginTop: 2 }}>
        {label}
      </BText>
    </View>
  );
}

function BookingRow({ booking, onRefund }: { booking: Booking; onRefund?: () => void }) {
  const [refunding, setRefunding] = useState(false);
  const canManage = onRefund && (booking.status === 'confirmed' || booking.status === 'pending');
  return (
    <View style={[styles.bookingRow, { flexWrap: 'wrap' }]}>
      <View style={{ flex: 1, minWidth: 220 }}>
        <BText variant="smallMedium">
          {booking.customer_name || 'Guest customer'} · {booking.items.map((i) => i.service_name).join(', ')}
        </BText>
        <BText variant="tiny" style={{ marginTop: 2 }}>
          {formatDateLong(booking.starts_at)} at {formatTimeOfDate(booking.starts_at)}
          {booking.staff_name ? ` · with ${booking.staff_name}` : ''}
          {booking.status === 'completed' ? ' · completed' : ''}
          {booking.status === 'no_show' ? ' · no-show' : ''}
          {booking.status === 'cancelled' ? ' · cancelled' : ''}
        </BText>
      </View>
      <BText variant="smallMedium">{formatPrice(booking.total_cents, booking.currency)}</BText>
      <PaymentPill status={booking.payment_status ?? 'unpaid'} />
      {canManage ? (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <SmallPillBtn
            label="Complete"
            color={colors.green}
            onPress={async () => {
              await setBookingStatus(booking.id, 'completed');
              onRefund!();
            }}
          />
          <SmallPillBtn
            label="No-show"
            color={colors.gray}
            onPress={async () => {
              await setBookingStatus(booking.id, 'no_show');
              onRefund!();
            }}
          />
        </View>
      ) : null}
      {onRefund && booking.payment_status === 'paid' ? (
        <Pressable
          disabled={refunding}
          onPress={async () => {
            setRefunding(true);
            await refundBooking(booking.id);
            setRefunding(false);
            onRefund();
          }}
          style={styles.refundBtn}
        >
          <BText style={{ fontFamily: font.semibold, fontSize: 12, color: colors.danger }}>
            {refunding ? 'Refunding…' : 'Refund'}
          </BText>
        </Pressable>
      ) : null}
    </View>
  );
}

function SmallPillBtn({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.refundBtn, { borderColor: color }]}>
      <BText style={{ fontFamily: font.semibold, fontSize: 12, color }}>{label}</BText>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Analytics: pure-View bar charts from real bookings
// ---------------------------------------------------------------------------
function BarChart({ data, unit }: { data: { label: string; value: number }[]; unit?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={{ gap: 8, marginTop: 14 }}>
      {data.map((d) => (
        <View key={d.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <BText variant="tiny" style={{ width: 82 }} numberOfLines={1}>
            {d.label}
          </BText>
          <View style={{ flex: 1, height: 18, backgroundColor: colors.bgSubtle, borderRadius: radius.pill }}>
            <View
              style={{
                width: `${(d.value / max) * 100}%`,
                height: 18,
                borderRadius: radius.pill,
                backgroundColor: colors.accent,
                minWidth: d.value > 0 ? 6 : 0,
              }}
            />
          </View>
          <BText variant="tiny" style={{ width: 70, textAlign: 'right' }}>
            {unit === 'money' ? formatPrice(d.value, 'SAR') : d.value}
          </BText>
        </View>
      ))}
    </View>
  );
}

function AnalyticsSection({
  bookings,
  venue,
  isDesktop,
}: {
  bookings: Booking[];
  venue: Venue;
  isDesktop: boolean;
}) {
  const active = bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'no_show');

  // Revenue: last 7 days
  const days: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toDateString();
    days.push({
      label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      value: active
        .filter((b) => new Date(b.starts_at).toDateString() === key)
        .reduce((c, b) => c + b.total_cents, 0),
    });
  }

  // Peak hours
  const hours = [10, 12, 14, 16, 18, 20].map((h) => ({
    label: `${h}:00–${h + 2}:00`,
    value: active.filter((b) => {
      const bh = new Date(b.starts_at).getHours();
      return bh >= h && bh < h + 2;
    }).length,
  }));

  // Top services
  const svcCounts = new Map<string, number>();
  active.forEach((b) => b.items.forEach((i) => svcCounts.set(i.service_name, (svcCounts.get(i.service_name) ?? 0) + 1)));
  const topServices = [...svcCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  // Team performance
  const team = venue.staff.map((m) => ({
    label: m.name,
    value: active.filter((b) => b.staff_id === m.id).length,
  }));
  const anyPro = active.filter((b) => !b.staff_id).length;
  if (anyPro) team.push({ label: 'Any professional', value: anyPro });

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
        <View style={[styles.card, { flex: 1 }]}>
          <BText variant="h3">Revenue — last 7 days</BText>
          <BarChart data={days} unit="money" />
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <BText variant="h3">Peak hours</BText>
          <BarChart data={hours} />
        </View>
      </View>
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
        <View style={[styles.card, { flex: 1 }]}>
          <BText variant="h3">Top services</BText>
          {topServices.length ? (
            <BarChart data={topServices} />
          ) : (
            <BText variant="small" style={{ marginTop: 10 }}>
              No bookings yet.
            </BText>
          )}
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <BText variant="h3">Team performance</BText>
          {team.length ? (
            <BarChart data={team} />
          ) : (
            <BText variant="small" style={{ marginTop: 10 }}>
              Add team members to see their bookings.
            </BText>
          )}
        </View>
      </View>
    </View>
  );
}

function TxStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    succeeded: { label: 'Succeeded', color: colors.green, bg: colors.greenBg },
    pending: { label: 'Pending', color: colors.warning, bg: colors.warningBg },
    failed: { label: 'Failed', color: colors.danger, bg: colors.dangerBg },
    refunded: { label: 'Refunded', color: colors.danger, bg: colors.dangerBg },
  };
  const m = map[status] ?? map.pending;
  return (
    <View style={{ backgroundColor: m.bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
      <BText style={{ fontFamily: font.semibold, fontSize: 11, color: m.color }}>{m.label}</BText>
    </View>
  );
}

function ServicesEditor({ venue, onChanged }: { venue: Venue; onChanged: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Featured');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setGroup('Featured');
    setDuration('60');
    setPrice('');
    setDiscount('0');
  };

  const startEdit = (s: Venue['services'][number]) => {
    setEditingId(s.id);
    setName(s.name);
    setGroup(s.group_name);
    setDuration(String(s.duration_minutes));
    setPrice(String(s.price_cents / 100));
    setDiscount(String(s.discount_pct));
  };

  const save = async () => {
    if (!name.trim() || !price.trim()) return;
    setBusy(true);
    const payload = {
      name: name.trim(),
      group_name: group.trim() || 'Featured',
      duration_minutes: Math.max(5, parseInt(duration, 10) || 30),
      price_cents: Math.round(parseFloat(price) * 100),
      discount_pct: Math.min(90, Math.max(0, parseInt(discount, 10) || 0)),
    };
    if (editingId) await updateService(venue, editingId, payload);
    else await addService(venue, payload);
    resetForm();
    setBusy(false);
    onChanged();
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <BText variant="h3">{editingId ? 'Edit service' : 'Add a service'}</BText>
        <View style={{ gap: 12, marginTop: 16 }}>
          <Field label="Service name" placeholder="e.g. Gel Manicure" value={name} onChangeText={setName} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label="Group" placeholder="Featured" value={group} onChangeText={setGroup} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Duration (min)" keyboardType="numeric" value={duration} onChangeText={setDuration} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Price" keyboardType="numeric" placeholder="150" value={price} onChangeText={setPrice} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Discount %" keyboardType="numeric" value={discount} onChangeText={setDiscount} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title={editingId ? 'Save changes' : 'Add service'} loading={busy} onPress={save} />
            {editingId ? <Button title="Cancel" variant="secondary" onPress={resetForm} /> : null}
          </View>
        </View>
      </View>
      <View style={styles.card}>
        <BText variant="h3">Your services ({venue.services.length})</BText>
        {venue.services.map((s) => (
          <View key={s.id} style={styles.bookingRow}>
            <View style={{ flex: 1 }}>
              <BText variant="smallMedium">{s.name}</BText>
              <BText variant="tiny">
                {s.group_name} · {formatDuration(s.duration_minutes)} · {formatPrice(s.price_cents, s.currency)}
                {s.discount_pct ? ` · ${s.discount_pct}% off` : ''}
              </BText>
            </View>
            <Pressable onPress={() => startEdit(s)} hitSlop={8}>
              <Ionicons name="pencil-outline" size={18} color={colors.ink} />
            </Pressable>
            <Pressable
              onPress={async () => {
                await deleteService(venue, s.id);
                if (editingId === s.id) resetForm();
                onChanged();
              }}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>
        ))}
        {venue.services.length === 0 && (
          <BText variant="small" style={{ marginTop: 10 }}>
            Add your first service so customers can book you.
          </BText>
        )}
      </View>
    </View>
  );
}

function StaffEditor({ venue, onChanged }: { venue: Venue; onChanged: () => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setRole('');
  };

  const startEdit = (m: Venue['staff'][number]) => {
    setEditingId(m.id);
    setName(m.name);
    setRole(m.role);
  };

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    if (editingId) {
      await updateStaff(venue, editingId, { name: name.trim(), role: role.trim() || 'Specialist' });
    } else {
      await addStaff(venue, name.trim(), role.trim() || 'Specialist');
    }
    resetForm();
    setBusy(false);
    onChanged();
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <BText variant="h3">{editingId ? 'Edit team member' : 'Add a team member'}</BText>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field label="Name" placeholder="e.g. Sara" value={name} onChangeText={setName} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Role" placeholder="Stylist" value={role} onChangeText={setRole} />
          </View>
          <Button title={editingId ? 'Save' : 'Add'} loading={busy} onPress={save} />
          {editingId ? <Button title="Cancel" variant="secondary" onPress={resetForm} /> : null}
        </View>
      </View>
      <View style={styles.card}>
        <BText variant="h3">Your team ({venue.staff.length})</BText>
        {venue.staff.map((m) => (
          <View key={m.id} style={styles.bookingRow}>
            <View style={{ flex: 1 }}>
              <BText variant="smallMedium">{m.name}</BText>
              <BText variant="tiny">{m.role}</BText>
            </View>
            <Pressable onPress={() => startEdit(m)} hitSlop={8}>
              <Ionicons name="pencil-outline" size={18} color={colors.ink} />
            </Pressable>
            <Pressable
              onPress={async () => {
                await deleteStaff(venue, m.id);
                if (editingId === m.id) resetForm();
                onChanged();
              }}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>
        ))}
        {venue.staff.length === 0 && (
          <BText variant="small" style={{ marginTop: 10 }}>
            Add your team so clients can choose their favorite professional.
          </BText>
        )}
      </View>
    </View>
  );
}

const HIGHLIGHT_OPTIONS = [
  'Instant confirmation',
  'Pay by app',
  'Parking available',
  'Walk-ins welcome',
  'By appointment only',
  'Woman-owned',
  'Adults only',
  'Private rooms',
  'Complimentary drinks',
  'Bridal packages',
];

function SettingsEditor({ venue, onChanged }: { venue: Venue; onChanged: () => void }) {
  const { categories } = useAppData();
  const [name, setName] = useState(venue.name);
  const [description, setDescription] = useState(venue.description);
  const [address, setAddress] = useState(venue.address);
  const [area, setArea] = useState(venue.area);
  const [city, setCity] = useState(venue.city);
  const [categoryId, setCategoryId] = useState(venue.category_id);
  const [highlights, setHighlights] = useState<string[]>(venue.highlights);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleHighlight = (h: string) =>
    setHighlights((list) => (list.includes(h) ? list.filter((x) => x !== h) : [...list, h]));

  const save = async () => {
    setBusy(true);
    await updateVenueInfo(venue, {
      name: name.trim() || venue.name,
      description: description.trim(),
      address: address.trim(),
      area: area.trim(),
      city: city.trim() || venue.city,
      category_id: categoryId,
      highlights,
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onChanged();
  };

  return (
    <View style={styles.card}>
      <BText variant="h3">Business details</BText>
      <View style={{ gap: 12, marginTop: 16 }}>
        <Field label="Business name" value={name} onChangeText={setName} />
        <Field
          label="About"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={{ minHeight: 100 }}
        />
        <View style={{ gap: 6 }}>
          <BText variant="smallMedium">Category</BText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {categories.map((c) => (
              <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="City" value={city} onChangeText={setCity} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Area" value={area} onChangeText={setArea} />
          </View>
        </View>
        <Field label="Street address" value={address} onChangeText={setAddress} />
        <View style={{ gap: 6 }}>
          <BText variant="smallMedium">Amenities shown on your page</BText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {HIGHLIGHT_OPTIONS.map((h) => (
              <Chip key={h} label={h} selected={highlights.includes(h)} onPress={() => toggleHighlight(h)} />
            ))}
          </View>
        </View>
        <Button title={saved ? 'Saved ✓' : 'Save changes'} loading={busy} onPress={save} />
      </View>
      <HoursEditor venue={venue} onChanged={onChanged} />
      <GalleryEditor venue={venue} onChanged={onChanged} />
    </View>
  );
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function HoursEditor({ venue, onChanged }: { venue: Venue; onChanged: () => void }) {
  const [hours, setHours] = useState(() =>
    [0, 1, 2, 3, 4, 5, 6].map(
      (w) => venue.hours.find((h) => h.weekday === w) ?? { weekday: w, open_time: '10:00', close_time: '22:00', is_closed: false }
    )
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const patch = (weekday: number, p: Partial<(typeof hours)[number]>) =>
    setHours((hs) => hs.map((h) => (h.weekday === weekday ? { ...h, ...p } : h)));

  const save = async () => {
    setBusy(true);
    await updateVenueHours(venue, hours);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onChanged();
  };

  return (
    <View style={[styles.card, { marginTop: 16 }]}>
      <BText variant="h3">Opening hours</BText>
      <View style={{ gap: 10, marginTop: 16 }}>
        {[1, 2, 3, 4, 5, 6, 0].map((w) => {
          const h = hours.find((x) => x.weekday === w)!;
          return (
            <View key={w} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BText variant="smallMedium" style={{ width: 92 }}>
                {WEEKDAY_NAMES[w]}
              </BText>
              {h.is_closed ? (
                <BText variant="small" style={{ flex: 1 }}>
                  Closed
                </BText>
              ) : (
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Field
                    value={h.open_time ?? '10:00'}
                    onChangeText={(v) => patch(w, { open_time: v })}
                    style={{ minHeight: 38, width: 74, paddingHorizontal: 8 }}
                  />
                  <BText variant="tiny">to</BText>
                  <Field
                    value={h.close_time ?? '22:00'}
                    onChangeText={(v) => patch(w, { close_time: v })}
                    style={{ minHeight: 38, width: 74, paddingHorizontal: 8 }}
                  />
                </View>
              )}
              <Pressable
                onPress={() => patch(w, { is_closed: !h.is_closed })}
                style={[styles.refundBtn, { borderColor: h.is_closed ? colors.green : colors.border }]}
              >
                <BText style={{ fontFamily: font.semibold, fontSize: 12, color: h.is_closed ? colors.green : colors.gray }}>
                  {h.is_closed ? 'Open this day' : 'Mark closed'}
                </BText>
              </Pressable>
            </View>
          );
        })}
      </View>
      <View style={{ marginTop: 16, alignItems: 'flex-start' }}>
        <Button title={saved ? 'Saved ✓' : 'Save hours'} size="sm" loading={busy} onPress={save} />
      </View>
    </View>
  );
}

function GalleryEditor({ venue, onChanged }: { venue: Venue; onChanged: () => void }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <View style={[styles.card, { marginTop: 16 }]}>
      <BText variant="h3">Gallery ({venue.images.length})</BText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
        {venue.images.map((im) => (
          <View key={im.url} style={{ position: 'relative' }}>
            <Image
              source={{ uri: im.url }}
              style={{ width: 110, height: 74, borderRadius: radius.sm, backgroundColor: colors.bgSubtle }}
              contentFit="cover"
            />
            {venue.images.length > 1 && (
              <Pressable
                onPress={async () => {
                  await removeVenueImage(venue, im.url);
                  onChanged();
                }}
                style={styles.imgRemove}
                hitSlop={6}
              >
                <Ionicons name="close" size={12} color={colors.white} />
              </Pressable>
            )}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field label="Image URL" placeholder="https://…" value={url} onChangeText={setUrl} autoCapitalize="none" />
        </View>
        <Button
          title="Add photo"
          size="sm"
          loading={busy}
          onPress={async () => {
            if (!url.trim().startsWith('http')) return;
            setBusy(true);
            await addVenueImage(venue, url.trim());
            setUrl('');
            setBusy(false);
            onChanged();
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingBottom: 12,
  },
  headerInner: {
    width: '100%',
    maxWidth: maxContentWidth + 48,
    alignSelf: 'center',
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bizTag: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  contentWrap: {
    width: '100%',
    maxWidth: maxContentWidth + 48,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  sideNav: { width: 200, gap: 4 },
  sideNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: radius.md,
  },
  topNav: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  topNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 20,
  },
  bookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  refundBtn: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(19,19,19,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.warningBg,
    borderRadius: radius.md,
    padding: 14,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 24,
  },
});
