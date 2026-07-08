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
  deleteService,
  deleteStaff,
  getVenueBookings,
  updateVenueInfo,
} from '../../lib/business';
import { formatDateLong, formatDuration, formatPrice, formatTimeOfDate } from '../../lib/format';
import { getVenueTransactions, refundBooking, salesSummary } from '../../lib/payments';
import { colors, font, maxContentWidth, radius } from '../../lib/theme';
import type { Booking, Transaction, Venue } from '../../lib/types';
import { useIsDesktop } from '../../lib/use-layout';

type Section = 'overview' | 'bookings' | 'sales' | 'services' | 'staff' | 'settings';
const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'grid-outline' },
  { key: 'bookings', label: 'Bookings', icon: 'calendar-outline' },
  { key: 'sales', label: 'Sales', icon: 'cash-outline' },
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
            <Ionicons name="time-outline" size={18} color="#B77400" />
            <BText variant="small" color="#B77400" style={{ flex: 1 }}>
              Your listing is pending review by the Bink team. It is not visible to customers yet.
            </BText>
          </View>
        )}
        {venue!.status === 'suspended' && (
          <View style={[styles.pendingBanner, { backgroundColor: '#FDEBEC' }]}>
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
    approved: { label: 'Live', color: colors.green, bg: '#E9F7EE' },
    pending: { label: 'Pending review', color: '#B77400', bg: '#FFF7E8' },
    suspended: { label: 'Suspended', color: colors.danger, bg: '#FDEBEC' },
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
  return (
    <View style={styles.bookingRow}>
      <View style={{ flex: 1 }}>
        <BText variant="smallMedium">
          {booking.customer_name || 'Guest customer'} · {booking.items.map((i) => i.service_name).join(', ')}
        </BText>
        <BText variant="tiny" style={{ marginTop: 2 }}>
          {formatDateLong(booking.starts_at)} at {formatTimeOfDate(booking.starts_at)}
          {booking.staff_name ? ` · with ${booking.staff_name}` : ''}
        </BText>
      </View>
      <BText variant="smallMedium">{formatPrice(booking.total_cents, booking.currency)}</BText>
      <PaymentPill status={booking.payment_status ?? 'unpaid'} />
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

function TxStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    succeeded: { label: 'Succeeded', color: colors.green, bg: '#E9F7EE' },
    pending: { label: 'Pending', color: '#B77400', bg: '#FFF7E8' },
    failed: { label: 'Failed', color: colors.danger, bg: '#FDEBEC' },
    refunded: { label: 'Refunded', color: colors.danger, bg: '#FDEBEC' },
  };
  const m = map[status] ?? map.pending;
  return (
    <View style={{ backgroundColor: m.bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
      <BText style={{ fontFamily: font.semibold, fontSize: 11, color: m.color }}>{m.label}</BText>
    </View>
  );
}

function ServicesEditor({ venue, onChanged }: { venue: Venue; onChanged: () => void }) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Featured');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim() || !price.trim()) return;
    setBusy(true);
    await addService(venue, {
      name: name.trim(),
      group_name: group.trim() || 'Featured',
      duration_minutes: Math.max(5, parseInt(duration, 10) || 30),
      price_cents: Math.round(parseFloat(price) * 100),
    });
    setName('');
    setPrice('');
    setBusy(false);
    onChanged();
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <BText variant="h3">Add a service</BText>
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
          </View>
          <Button title="Add service" loading={busy} onPress={add} />
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
              </BText>
            </View>
            <Pressable
              onPress={async () => {
                await deleteService(venue, s.id);
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
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    await addStaff(venue, name.trim(), role.trim() || 'Specialist');
    setName('');
    setRole('');
    setBusy(false);
    onChanged();
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <BText variant="h3">Add a team member</BText>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field label="Name" placeholder="e.g. Sara" value={name} onChangeText={setName} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Role" placeholder="Stylist" value={role} onChangeText={setRole} />
          </View>
          <Button title="Add" loading={busy} onPress={add} />
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
            <Pressable
              onPress={async () => {
                await deleteStaff(venue, m.id);
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

function SettingsEditor({ venue, onChanged }: { venue: Venue; onChanged: () => void }) {
  const [name, setName] = useState(venue.name);
  const [description, setDescription] = useState(venue.description);
  const [address, setAddress] = useState(venue.address);
  const [area, setArea] = useState(venue.area);
  const [city, setCity] = useState(venue.city);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    await updateVenueInfo(venue, {
      name: name.trim() || venue.name,
      description: description.trim(),
      address: address.trim(),
      area: area.trim(),
      city: city.trim() || venue.city,
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
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="City" value={city} onChangeText={setCity} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Area" value={area} onChangeText={setArea} />
          </View>
        </View>
        <Field label="Street address" value={address} onChangeText={setAddress} />
        <Button title={saved ? 'Saved ✓' : 'Save changes'} loading={busy} onPress={save} />
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
    backgroundColor: '#F3EFFF',
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
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF7E8',
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
