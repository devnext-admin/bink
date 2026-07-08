import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../components/logo';
import { PaymentPill } from '../components/payment-pill';
import { Button } from '../components/ui/button';
import { BText } from '../components/ui/text';
import { useAppData } from '../lib/app-data-context';
import { useAuth } from '../lib/auth-context';
import { AdminUserRow, getAllBookings, getAllUsers, setVenueStatus } from '../lib/business';
import { formatDateLong, formatPrice, formatTimeOfDate } from '../lib/format';
import { createCategory } from '../lib/data';
import { createPromo, getPromoCodes, togglePromo } from '../lib/ops';
import { getAllTransactions, salesSummary } from '../lib/payments';
import { colors, font, maxContentWidth, radius } from '../lib/theme';
import type { Booking } from '../lib/types';
import { useIsDesktop } from '../lib/use-layout';

type Tab = 'overview' | 'salons' | 'users' | 'bookings' | 'categories' | 'promos';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'stats-chart-outline' },
  { key: 'salons', label: 'Salons', icon: 'storefront-outline' },
  { key: 'users', label: 'Users', icon: 'people-outline' },
  { key: 'bookings', label: 'Bookings', icon: 'calendar-outline' },
  { key: 'categories', label: 'Categories', icon: 'pricetags-outline' },
  { key: 'promos', label: 'Promos', icon: 'ticket-outline' },
];

export default function Admin() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const { user, loading } = useAuth();
  const { allVenues, categories, refresh } = useAppData();

  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoPct, setNewPromoPct] = useState('10');
  const [newCategory, setNewCategory] = useState('');

  const load = useCallback(() => {
    getAllUsers().then(setUsers);
    getAllBookings().then(setBookings);
    getAllTransactions().then(setTransactions);
    getPromoCodes().then(setPromos);
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') load();
  }, [user?.role, load]);

  const stats = useMemo(() => {
    const activeBookings = bookings.filter((b) => b.status !== 'cancelled');
    const sales = salesSummary(transactions);
    return {
      salons: allVenues.length,
      pending: allVenues.filter((v) => v.status === 'pending').length,
      users: users.length,
      bookings: activeBookings.length,
      revenue: activeBookings.reduce((c, b) => c + b.total_cents, 0),
      onlinePaid: sales.net_cents,
      currency: activeBookings[0]?.currency ?? 'SAR',
    };
  }, [allVenues, users, bookings, transactions]);

  if (loading) return null;

  if (!user || user.role !== 'admin') {
    return (
      <View style={[styles.gate, { paddingTop: insets.top + 60 }]}>
        <Ionicons name="lock-closed-outline" size={40} color={colors.grayLight} />
        <BText variant="h2" style={{ marginTop: 20 }}>
          Bink internal
        </BText>
        <BText variant="small" style={{ marginTop: 8, textAlign: 'center', maxWidth: 340 }}>
          This area is for the Bink team only. Sign in with an admin account to continue.
          {'\n\n'}Demo tip: log in with any email starting with admin@ (e.g. admin@bink.com).
        </BText>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
          <Button title="Log in" onPress={() => router.push('/auth')} />
          <Button title="Back home" variant="secondary" onPress={() => router.replace('/')} />
        </View>
      </View>
    );
  }

  let body: React.ReactNode = null;
  if (tab === 'overview') {
    const topVenues = [...allVenues]
      .sort((a, b) => b.rating_count - a.rating_count)
      .slice(0, 5);
    body = (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
          <StatCard label="Total salons" value={String(stats.salons)} icon="storefront-outline" />
          <StatCard label="Pending approval" value={String(stats.pending)} icon="time-outline" accent={stats.pending > 0} />
          <StatCard label="Registered users" value={String(stats.users)} icon="people-outline" />
          <StatCard label="Bookings" value={String(stats.bookings)} icon="calendar-outline" />
          <StatCard label="Booking value" value={formatPrice(stats.revenue, stats.currency)} icon="cash-outline" />
          <StatCard label="Paid online" value={formatPrice(stats.onlinePaid, stats.currency)} icon="card-outline" />
        </View>
        <View style={styles.card}>
          <BText variant="h3">Top salons by reviews</BText>
          {topVenues.map((v) => (
            <View key={v.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <BText variant="smallMedium">{v.name}</BText>
                <BText variant="tiny">
                  {v.city} · {categories.find((c) => c.id === v.category_id)?.name ?? '—'}
                </BText>
              </View>
              <BText variant="smallMedium">
                {v.rating_avg.toFixed(1)} ★ ({v.rating_count.toLocaleString()})
              </BText>
            </View>
          ))}
        </View>
      </View>
    );
  } else if (tab === 'salons') {
    body = (
      <View style={styles.card}>
        <BText variant="h3">All salons ({allVenues.length})</BText>
        {allVenues.map((v) => {
          const status = v.status ?? 'approved';
          return (
            <View key={v.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Pressable onPress={() => router.push(`/venue/${v.slug}`)}>
                  <BText variant="smallMedium" color={colors.accent}>
                    {v.name}
                  </BText>
                </Pressable>
                <BText variant="tiny">
                  {v.area ? `${v.area}, ` : ''}
                  {v.city} · {categories.find((c) => c.id === v.category_id)?.name ?? '—'} ·{' '}
                  {v.services.length} services
                  {v.owner_id ? ' · partner-owned' : ''}
                </BText>
              </View>
              <StatusTag status={status} />
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {status !== 'approved' && (
                  <SmallAction
                    label="Approve"
                    color={colors.green}
                    onPress={async () => {
                      await setVenueStatus(v, 'approved');
                      await refresh();
                    }}
                  />
                )}
                {status !== 'suspended' && (
                  <SmallAction
                    label="Suspend"
                    color={colors.danger}
                    onPress={async () => {
                      await setVenueStatus(v, 'suspended');
                      await refresh();
                    }}
                  />
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  } else if (tab === 'users') {
    body = (
      <View style={styles.card}>
        <BText variant="h3">Users ({users.length})</BText>
        {users.length === 0 ? (
          <BText variant="small" style={{ marginTop: 10 }}>
            No registered users yet. Users appear here as they sign up.
          </BText>
        ) : (
          users.map((u) => (
            <View key={u.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <BText variant="smallMedium">{u.name ?? '—'}</BText>
                <BText variant="tiny">
                  {u.email ?? 'no email'} · joined {new Date(u.joined_at).toLocaleDateString('en-US')}
                </BText>
              </View>
              <RoleTag role={u.role} />
            </View>
          ))
        )}
      </View>
    );
  } else if (tab === 'categories') {
    body = (
      <View style={{ gap: 16 }}>
        <View style={styles.card}>
          <BText variant="h3">Add category</BText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' }}>
            <TextInput
              placeholder="e.g. Kids Salon"
              placeholderTextColor={colors.gray}
              value={newCategory}
              onChangeText={setNewCategory}
              style={styles.input}
            />
            <Button
              title="Add"
              size="sm"
              onPress={async () => {
                if (!newCategory.trim()) return;
                await createCategory(newCategory.trim());
                setNewCategory('');
                await refresh();
              }}
            />
          </View>
        </View>
        <View style={styles.card}>
          <BText variant="h3">Categories ({categories.length})</BText>
          {categories.map((c) => (
            <View key={c.slug} style={styles.row}>
              <View style={{ flex: 1 }}>
                <BText variant="smallMedium">{c.name}</BText>
                <BText variant="tiny">
                  {c.slug} · {allVenues.filter((v) => v.category_id === c.id).length} salons
                </BText>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  } else if (tab === 'promos') {
    body = (
      <View style={{ gap: 16 }}>
        <View style={styles.card}>
          <BText variant="h3">Create promo code</BText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' }}>
            <TextInput
              placeholder="CODE"
              placeholderTextColor={colors.gray}
              autoCapitalize="characters"
              value={newPromoCode}
              onChangeText={setNewPromoCode}
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              placeholder="% off"
              placeholderTextColor={colors.gray}
              keyboardType="numeric"
              value={newPromoPct}
              onChangeText={setNewPromoPct}
              style={[styles.input, { width: 80, flex: 0 }]}
            />
            <Button
              title="Create"
              size="sm"
              onPress={async () => {
                const pct = parseInt(newPromoPct, 10);
                if (!newPromoCode.trim() || !pct) return;
                await createPromo(newPromoCode.trim(), Math.min(100, Math.max(1, pct)));
                setNewPromoCode('');
                load();
              }}
            />
          </View>
        </View>
        <View style={styles.card}>
          <BText variant="h3">Promo codes ({promos.length})</BText>
          {promos.map((p) => (
            <View key={p.code} style={styles.row}>
              <View style={{ flex: 1 }}>
                <BText variant="smallMedium">{p.code}</BText>
                <BText variant="tiny">
                  {p.pct_off}% off
                  {p.expires_at ? ` · expires ${new Date(p.expires_at).toLocaleDateString('en-US')}` : ' · no expiry'}
                </BText>
              </View>
              <StatusTag status={p.is_active ? 'approved' : 'suspended'} />
              <SmallAction
                label={p.is_active ? 'Disable' : 'Enable'}
                color={p.is_active ? colors.danger : colors.green}
                onPress={async () => {
                  await togglePromo(p.code, !p.is_active);
                  load();
                }}
              />
            </View>
          ))}
        </View>
      </View>
    );
  } else {
    body = (
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <BText variant="h3">Bookings ({bookings.length})</BText>
          {Platform.OS === 'web' && bookings.length > 0 ? (
            <SmallAction label="Export CSV" color={colors.ink} onPress={() => exportBookingsCsv(bookings)} />
          ) : null}
        </View>
        {bookings.length === 0 ? (
          <BText variant="small" style={{ marginTop: 10 }}>
            No bookings yet.
          </BText>
        ) : (
          bookings.map((b) => (
            <View key={b.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <BText variant="smallMedium">
                  {b.venue_name || allVenues.find((v) => v.id === b.venue_id)?.name || 'Venue'}
                </BText>
                <BText variant="tiny">
                  {b.customer_name || 'Guest'} · {formatDateLong(b.starts_at)} at {formatTimeOfDate(b.starts_at)} ·{' '}
                  {b.items.map((i) => i.service_name).join(', ')}
                </BText>
              </View>
              <BText variant="smallMedium">{formatPrice(b.total_cents, b.currency)}</BText>
              <PaymentPill status={b.payment_status ?? 'unpaid'} />
              <StatusTag status={b.status} />
            </View>
          ))
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPage }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Logo size={22} />
            <View style={styles.adminTag}>
              <BText style={{ fontFamily: font.bold, fontSize: 11, color: colors.white }}>ADMIN</BText>
            </View>
          </View>
          <Pressable onPress={() => router.push('/')} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={styles.contentWrap}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {TABS.map((t) => {
              const active = tab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  style={[styles.tabItem, active && { backgroundColor: colors.ink, borderColor: colors.ink }]}
                >
                  <Ionicons name={t.icon as any} size={15} color={active ? colors.white : colors.ink} />
                  <BText
                    style={{
                      fontFamily: active ? font.bold : font.medium,
                      fontSize: 14,
                      color: active ? colors.white : colors.ink,
                    }}
                  >
                    {t.label}
                  </BText>
                </Pressable>
              );
            })}
          </View>
          {body}
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: string; accent?: boolean }) {
  return (
    <View style={[styles.card, { flex: 1, minWidth: 150 }, accent && { borderColor: '#F0C36D', backgroundColor: '#FFF9EE' }]}>
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

function StatusTag({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    approved: { label: 'Live', color: colors.green, bg: '#E9F7EE' },
    pending: { label: 'Pending', color: '#B77400', bg: '#FFF7E8' },
    suspended: { label: 'Suspended', color: colors.danger, bg: '#FDEBEC' },
    confirmed: { label: 'Confirmed', color: colors.green, bg: '#E9F7EE' },
    completed: { label: 'Completed', color: colors.gray, bg: colors.bgSubtle },
    cancelled: { label: 'Cancelled', color: colors.danger, bg: '#FDEBEC' },
  };
  const m = map[status] ?? map.approved;
  return (
    <View style={{ backgroundColor: m.bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
      <BText style={{ fontFamily: font.semibold, fontSize: 11, color: m.color }}>{m.label}</BText>
    </View>
  );
}

function RoleTag({ role }: { role: string }) {
  const map: Record<string, { color: string; bg: string }> = {
    admin: { color: colors.white, bg: colors.ink },
    partner: { color: colors.accent, bg: '#F3EFFF' },
    customer: { color: colors.gray, bg: colors.bgSubtle },
  };
  const m = map[role] ?? map.customer;
  return (
    <View style={{ backgroundColor: m.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
      <BText style={{ fontFamily: font.semibold, fontSize: 11, color: m.color }}>{role}</BText>
    </View>
  );
}

function exportBookingsCsv(bookings: Booking[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Booking ID', 'Venue', 'Customer', 'Starts', 'Services', 'Total', 'Currency', 'Status', 'Payment'],
    ...bookings.map((b) => [
      b.id,
      b.venue_name,
      b.customer_name ?? 'Guest',
      b.starts_at,
      b.items.map((i) => i.service_name).join('; '),
      (b.total_cents / 100).toFixed(2),
      b.currency,
      b.status,
      b.payment_status ?? 'unpaid',
    ]),
  ];
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `bink-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function SmallAction({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [styles.smallAction, { borderColor: color }, hovered && { opacity: 0.7 }]}
    >
      <BText style={{ fontFamily: font.semibold, fontSize: 12, color }}>{label}</BText>
    </Pressable>
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
  adminTag: {
    backgroundColor: colors.ink,
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
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 42,
    paddingHorizontal: 12,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.ink,
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
  smallAction: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gate: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 24,
  },
});
