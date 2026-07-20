import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../components/logo';
import { PaymentPill } from '../components/payment-pill';
import { Button } from '../components/ui/button';
import { Chip } from '../components/ui/chip';
import { BText } from '../components/ui/text';
import { useAppData } from '../lib/app-data-context';
import { useAuth } from '../lib/auth-context';
import {
  AdminReviewRow,
  AdminUserRow,
  adminDeleteReview,
  adminSetUserBlocked,
  adminSetUserRole,
  getAllBookings,
  getAllReviews,
  getAllUsers,
  registerSalon,
  setVenueStatus,
  updateVenueInfo,
} from '../lib/business';
import { createCategory } from '../lib/data';
import { formatDateLong, formatPrice, formatTimeOfDate } from '../lib/format';
import { formatDate, useI18n } from '../lib/i18n';
import { createPromo, getPromoCodes, togglePromo } from '../lib/ops';
import { escrowSummary, getAllTransactions, refundBooking, salesSummary } from '../lib/payments';
import { colors, font, radius } from '../lib/theme';
import type { Booking, Transaction } from '../lib/types';
import { useIsDesktop } from '../lib/use-layout';

type Tab = 'overview' | 'salons' | 'users' | 'bookings' | 'payments' | 'reviews' | 'categories' | 'promos';
const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'stats-chart-outline' },
  { key: 'salons', label: 'Salons', icon: 'storefront-outline' },
  { key: 'users', label: 'Users', icon: 'people-outline' },
  { key: 'bookings', label: 'Bookings', icon: 'calendar-outline' },
  { key: 'payments', label: 'Payments', icon: 'card-outline' },
  { key: 'reviews', label: 'Reviews', icon: 'star-outline' },
  { key: 'categories', label: 'Categories', icon: 'pricetags-outline' },
  { key: 'promos', label: 'Promos', icon: 'ticket-outline' },
];

export default function Admin() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const { user, loading, startEmulating } = useAuth();
  const { allVenues, categories, refresh } = useAppData();

  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reviews, setReviews] = useState<AdminReviewRow[]>([]);
  const [promos, setPromos] = useState<any[]>([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoPct, setNewPromoPct] = useState('10');
  const [newCategory, setNewCategory] = useState('');
  const [salonQuery, setSalonQuery] = useState('');
  const [salonStatus, setSalonStatus] = useState<'all' | 'approved' | 'pending' | 'suspended'>('all');
  const [addSalon, setAddSalon] = useState(false);
  const [nsName, setNsName] = useState('');
  const [nsCat, setNsCat] = useState<number | null>(null);
  const [nsCity, setNsCity] = useState('');
  const [nsArea, setNsArea] = useState('');
  const [nsAddress, setNsAddress] = useState('');
  const [nsBusy, setNsBusy] = useState(false);
  const [nsError, setNsError] = useState<string | null>(null);

  const createSalon = async () => {
    if (!user) return;
    if (!nsName.trim() || !nsCat || !nsCity.trim()) {
      setNsError(t('Please fill the name, category and city.'));
      return;
    }
    setNsBusy(true);
    setNsError(null);
    const venue = await registerSalon({
      ownerId: user.id,
      providerType: 'salon',
      mapsUrl: null,
      name: nsName.trim(),
      categoryId: nsCat,
      description: `Welcome to ${nsName.trim()} — quality treatments, easy booking on Bink.`,
      address: nsAddress.trim(),
      area: nsArea.trim(),
      city: nsCity.trim(),
      country: 'Saudi Arabia',
      images: [],
      services: [],
      staff: [],
      hours: [],
    });
    // Admin-created salons go live immediately.
    await setVenueStatus(venue, 'approved');
    await refresh();
    setNsBusy(false);
    setAddSalon(false);
    setNsName('');
    setNsCat(null);
    setNsCity('');
    setNsArea('');
    setNsAddress('');
  };
  const [userQuery, setUserQuery] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'all' | 'confirmed' | 'completed' | 'cancelled'>('all');

  const load = useCallback(() => {
    getAllUsers().then(setUsers);
    getAllBookings().then(setBookings);
    getAllTransactions().then(setTransactions);
    getPromoCodes().then(setPromos);
    getAllReviews().then(setReviews);
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') load();
  }, [user?.role, load]);

  const stats = useMemo(() => {
    const activeBookings = bookings.filter((b) => b.status !== 'cancelled');
    const sales = salesSummary(transactions);
    const escrow = escrowSummary(transactions);
    return {
      salons: allVenues.length,
      pending: allVenues.filter((v) => v.status === 'pending').length,
      users: users.length,
      bookings: activeBookings.length,
      revenue: activeBookings.reduce((c, b) => c + b.total_cents, 0),
      onlinePaid: sales.net_cents,
      escrowHeld: escrow.held_cents,
      escrowReleased: escrow.released_cents,
      refunds: sales.refunds_cents,
      currency: activeBookings[0]?.currency ?? 'SAR',
    };
  }, [allVenues, users, bookings, transactions]);

  if (loading) return null;

  if (!user || user.role !== 'admin') {
    return (
      <View style={[styles.gate, { paddingTop: insets.top + 60 }]}>
        <Ionicons name="lock-closed-outline" size={40} color={colors.grayLight} />
        <BText variant="h2" style={{ marginTop: 20 }}>
          {t('Bink internal')}
        </BText>
        <BText variant="small" style={{ marginTop: 8, textAlign: 'center', maxWidth: 340 }}>
          {t('This area is for the Bink team only. Sign in with an admin account to continue.')}
        </BText>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
          <Button title={t('Log in')} onPress={() => router.push('/auth')} />
          <Button title={t('Back home')} variant="secondary" onPress={() => router.replace('/')} />
        </View>
      </View>
    );
  }

  const pendingVenues = allVenues.filter((v) => v.status === 'pending');

  let body: React.ReactNode = null;
  if (tab === 'overview') {
    const topVenues = [...allVenues].sort((a, b) => b.rating_count - a.rating_count).slice(0, 5);
    const recent = bookings.slice(0, 5);
    body = (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <StatCard label={t('Total salons')} value={String(stats.salons)} icon="storefront-outline" />
          <StatCard label={t('Pending approval')} value={String(stats.pending)} icon="time-outline" accent={stats.pending > 0} />
          <StatCard label={t('Registered users')} value={String(stats.users)} icon="people-outline" />
          <StatCard label={t('Bookings')} value={String(stats.bookings)} icon="calendar-outline" />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <StatCard label={t('Booking value')} value={formatPrice(stats.revenue, stats.currency)} icon="cash-outline" />
          <StatCard label={t('Paid online')} value={formatPrice(stats.onlinePaid, stats.currency)} icon="card-outline" />
          <StatCard label={t('In escrow')} value={formatPrice(stats.escrowHeld, stats.currency)} icon="lock-closed-outline" />
          <StatCard label={t('Refunds')} value={formatPrice(stats.refunds, stats.currency)} icon="return-down-back-outline" />
        </View>

        {pendingVenues.length > 0 && (
          <View style={[styles.card, { borderColor: '#F0C36D', backgroundColor: '#FFFDF7' }]}>
            <BText variant="h3">{t('Waiting for your approval')}</BText>
            {pendingVenues.map((v) => (
              <View key={v.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <BText variant="smallMedium">{v.name}</BText>
                  <BText variant="tiny">
                    {v.city} · {t(categories.find((c) => c.id === v.category_id)?.name ?? '—')}
                    {v.provider_type === 'freelancer' ? ` · ${t('Freelancer')}` : ''}
                  </BText>
                </View>
                <SmallAction label={t('Review listing')} color={colors.info} onPress={() => router.push(`/business/dashboard?venue=${v.id}` as any)} />
                <SmallAction
                  label={t('Approve')}
                  color={colors.green}
                  onPress={async () => {
                    await setVenueStatus(v, 'approved');
                    await refresh();
                  }}
                />
              </View>
            ))}
          </View>
        )}

        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
          <View style={[styles.card, { flex: 1 }]}>
            <BText variant="h3">{t('Latest bookings')}</BText>
            {recent.map((b) => (
              <View key={b.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <BText variant="smallMedium" numberOfLines={1}>
                    {b.venue_name || allVenues.find((v) => v.id === b.venue_id)?.name || t('Venue')}
                  </BText>
                  <BText variant="tiny" numberOfLines={1}>
                    {b.customer_name || t('Guest')} · {formatDateLong(b.starts_at)}
                  </BText>
                </View>
                <BText variant="smallMedium">{formatPrice(b.total_cents, b.currency)}</BText>
              </View>
            ))}
          </View>
          <View style={[styles.card, { flex: 1 }]}>
            <BText variant="h3">{t('Top salons by reviews')}</BText>
            {topVenues.map((v) => (
              <View key={v.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <BText variant="smallMedium" numberOfLines={1}>
                    {v.name}
                  </BText>
                  <BText variant="tiny" numberOfLines={1}>
                    {v.city} · {t(categories.find((c) => c.id === v.category_id)?.name ?? '—')}
                  </BText>
                </View>
                <BText variant="smallMedium">
                  {v.rating_avg.toFixed(1)} ★ ({v.rating_count.toLocaleString()})
                </BText>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  } else if (tab === 'salons') {
    const q = salonQuery.trim().toLowerCase();
    const filtered = allVenues.filter((v) => {
      const status = v.status ?? 'approved';
      if (salonStatus !== 'all' && status !== salonStatus) return false;
      if (q && !`${v.name} ${v.city} ${v.area}`.toLowerCase().includes(q)) return false;
      return true;
    });
    body = (
      <View style={{ gap: 16 }}>
        <View style={styles.card}>
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10, alignItems: isDesktop ? 'center' : 'stretch' }}>
            <TextInput
        {...({ dir: 'auto' } as any)}
              placeholder={t('Search salons…')}
              placeholderTextColor={colors.gray}
              value={salonQuery}
              onChangeText={setSalonQuery}
              style={[styles.input, { flex: 1 }]}
            />
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {(['all', 'approved', 'pending', 'suspended'] as const).map((st) => (
                <Chip
                  key={st}
                  label={st === 'all' ? t('All') : t(st === 'approved' ? 'Live' : st === 'pending' ? 'Pending' : 'Suspended')}
                  selected={salonStatus === st}
                  onPress={() => setSalonStatus(st)}
                />
              ))}
            </View>
            <Button
              title={addSalon ? t('Close') : t('Add salon')}
              size="sm"
              variant={addSalon ? 'secondary' : 'primary'}
              onPress={() => setAddSalon(!addSalon)}
            />
          </View>
        </View>

        {addSalon && (
          <View style={styles.card}>
            <BText variant="h3">{t('Add a salon')}</BText>
            <BText variant="tiny" style={{ marginTop: 4 }}>
              {t('Creates a live listing you manage. The owner can be reassigned later from the business dashboard.')}
            </BText>
            <View style={{ gap: 12, marginTop: 14 }}>
              <TextInput
                {...({ dir: 'auto' } as any)}
                placeholder={t('Salon name')}
                placeholderTextColor={colors.gray}
                value={nsName}
                onChangeText={setNsName}
                style={styles.input}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {categories.map((c) => (
                  <Chip key={c.id} label={t(c.name)} selected={nsCat === c.id} onPress={() => setNsCat(c.id)} />
                ))}
              </View>
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 10 }}>
                <TextInput
                  {...({ dir: 'auto' } as any)}
                  placeholder={t('City')}
                  placeholderTextColor={colors.gray}
                  value={nsCity}
                  onChangeText={setNsCity}
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  {...({ dir: 'auto' } as any)}
                  placeholder={t('Area / district')}
                  placeholderTextColor={colors.gray}
                  value={nsArea}
                  onChangeText={setNsArea}
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
              <TextInput
                {...({ dir: 'auto' } as any)}
                placeholder={t('Street address')}
                placeholderTextColor={colors.gray}
                value={nsAddress}
                onChangeText={setNsAddress}
                style={styles.input}
              />
              {nsError ? (
                <BText variant="small" color={colors.danger}>
                  {nsError}
                </BText>
              ) : null}
              <View style={{ flexDirection: 'row' }}>
                <Button title={t('Create salon')} loading={nsBusy} onPress={createSalon} />
              </View>
            </View>
          </View>
        )}
        <View style={styles.card}>
          <BText variant="h3">{t('All salons ({n})', { n: filtered.length })}</BText>
          {filtered.map((v) => {
            const status = v.status ?? 'approved';
            return (
              <View key={v.id} style={[styles.row, { flexWrap: 'wrap' }]}>
                <Pressable
                  onPress={async () => {
                    await updateVenueInfo(v, { is_featured: !v.is_featured });
                    await refresh();
                  }}
                  hitSlop={8}
                >
                  <Ionicons name={v.is_featured ? 'star' : 'star-outline'} size={18} color={v.is_featured ? colors.star : colors.grayLight} />
                </Pressable>
                <View style={{ flex: 1, minWidth: 200 }}>
                  <Pressable onPress={() => router.push(`/venue/${v.slug}`)}>
                    <BText variant="smallMedium" color={colors.accent}>
                      {v.name}
                    </BText>
                  </Pressable>
                  <BText variant="tiny">
                    {v.area ? `${v.area}, ` : ''}
                    {v.city} · {t(categories.find((c) => c.id === v.category_id)?.name ?? '—')} ·{' '}
                    {v.services.length === 1 ? t('1 service') : t('{n} services', { n: v.services.length })}
                    {v.provider_type === 'freelancer' ? ` · ${t('Freelancer')}` : ''}
                  </BText>
                </View>
                <StatusTag status={status} />
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <SmallAction label={t('Open dashboard')} color={colors.info} onPress={() => router.push(`/business/dashboard?venue=${v.id}` as any)} />
                  {status !== 'approved' && (
                    <SmallAction
                      label={t('Approve')}
                      color={colors.green}
                      onPress={async () => {
                        await setVenueStatus(v, 'approved');
                        await refresh();
                      }}
                    />
                  )}
                  {status !== 'suspended' && (
                    <SmallAction
                      label={t('Suspend')}
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
      </View>
    );
  } else if (tab === 'users') {
    const q = userQuery.trim().toLowerCase();
    const filtered = users.filter((u) => !q || `${u.name ?? ''} ${u.email ?? ''}`.toLowerCase().includes(q));
    body = (
      <View style={{ gap: 16 }}>
        <View style={styles.card}>
          <TextInput
        {...({ dir: 'auto' } as any)}
            placeholder={t('Search users…')}
            placeholderTextColor={colors.gray}
            value={userQuery}
            onChangeText={setUserQuery}
            style={styles.input}
          />
        </View>
        <View style={styles.card}>
          <BText variant="h3">{t('Users ({n})', { n: filtered.length })}</BText>
          <BText variant="tiny" style={{ marginTop: 4 }}>
            {t('Tap a role to change what a user can do.')}
          </BText>
          {filtered.map((u) => (
            <View key={u.id} style={[styles.row, { flexWrap: 'wrap' }]}>
              <View style={{ flex: 1, minWidth: 180 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <BText variant="smallMedium">{u.name ?? '—'}</BText>
                  {u.is_blocked && (
                    <View style={{ backgroundColor: colors.dangerBg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <BText style={{ fontFamily: font.semibold, fontSize: 11, color: colors.danger }}>{t('Blocked')}</BText>
                    </View>
                  )}
                </View>
                <BText variant="tiny">
                  {u.email ?? t('no email')} ·{' '}
                  {t('joined {date}', {
                    date: formatDate(lang, u.joined_at, { year: 'numeric', month: 'numeric', day: 'numeric' }),
                  })}
                </BText>
              </View>
              {u.id === user.id ? (
                <RoleTag role={u.role} />
              ) : (
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {(['customer', 'partner', 'admin'] as const).map((r) => (
                    <Chip
                      key={r}
                      label={t(r)}
                      selected={u.role === r}
                      onPress={async () => {
                        if (u.role === r) return;
                        await adminSetUserRole(u.id, r);
                        load();
                      }}
                    />
                  ))}
                  <SmallAction
                    label={t('View as user')}
                    color={colors.info}
                    onPress={async () => {
                      await startEmulating({ id: u.id, email: u.email, name: u.name });
                      router.push('/appointments');
                    }}
                  />
                  <SmallAction
                    label={u.is_blocked ? t('Unblock') : t('Block')}
                    color={u.is_blocked ? colors.green : colors.danger}
                    onPress={async () => {
                      await adminSetUserBlocked(u.id, !u.is_blocked);
                      load();
                    }}
                  />
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  } else if (tab === 'payments') {
    body = (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <StatCard label={t('Paid online')} value={formatPrice(stats.onlinePaid, stats.currency)} icon="card-outline" />
          <StatCard label={t('In escrow')} value={formatPrice(stats.escrowHeld, stats.currency)} icon="lock-closed-outline" />
          <StatCard label={t('Released to salons')} value={formatPrice(stats.escrowReleased, stats.currency)} icon="checkmark-done-outline" />
          <StatCard label={t('Refunds')} value={formatPrice(stats.refunds, stats.currency)} icon="return-down-back-outline" />
        </View>
        <View style={styles.card}>
          <BText variant="h3">{t('All transactions ({n})', { n: transactions.length })}</BText>
          {transactions.length === 0 ? (
            <BText variant="small" style={{ marginTop: 10 }}>
              {t('No online payments yet. Card and Apple Pay payments will appear here; pay-at-venue bookings are listed under Bookings.')}
            </BText>
          ) : (
            transactions.map((tx) => (
              <View key={tx.id} style={[styles.row, { flexWrap: 'wrap' }]}>
                <View style={{ flex: 1, minWidth: 220 }}>
                  <BText variant="smallMedium" numberOfLines={1}>
                    {tx.venue_name || allVenues.find((v) => v.id === tx.venue_id)?.name || t('Venue')}
                  </BText>
                  <BText variant="tiny" numberOfLines={1}>
                    {formatDateLong(tx.created_at)} · {tx.method === 'apple_pay' ? 'Apple Pay' : tx.method === 'card' ? t('Card') : t('At venue')} · {tx.gateway}
                  </BText>
                </View>
                <BText
                  variant="smallMedium"
                  color={tx.status === 'refunded' ? colors.danger : colors.ink}
                  style={tx.status === 'refunded' ? { textDecorationLine: 'line-through' } : undefined}
                >
                  {formatPrice(tx.amount_cents, tx.currency)}
                </BText>
                <TxStatusPill status={tx.status === 'succeeded' && tx.escrow_status ? tx.escrow_status : tx.status} />
                {tx.status === 'succeeded' && tx.escrow_status === 'held' && tx.booking_id ? (
                  <SmallAction
                    label={t('Refund')}
                    color={colors.danger}
                    onPress={async () => {
                      await refundBooking(tx.booking_id!);
                      load();
                    }}
                  />
                ) : null}
              </View>
            ))
          )}
        </View>
      </View>
    );
  } else if (tab === 'reviews') {
    body = (
      <View style={styles.card}>
        <BText variant="h3">{t('Latest reviews ({n})', { n: reviews.length })}</BText>
        <BText variant="tiny" style={{ marginTop: 4 }}>
          {t('Removing a review recalculates the salon rating automatically.')}
        </BText>
        {reviews.length === 0 ? (
          <BText variant="small" style={{ marginTop: 10 }}>
            {t('No reviews yet.')}
          </BText>
        ) : (
          reviews.map((r) => (
            <View key={r.id} style={[styles.row, { alignItems: 'flex-start' }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <BText variant="smallMedium">{r.author_name}</BText>
                  <BText variant="tiny">· {r.venue_name}</BText>
                  <BText variant="tiny" color={colors.star}>
                    {'★'.repeat(r.rating)}
                  </BText>
                </View>
                {r.comment ? (
                  <BText variant="small" style={{ marginTop: 4 }}>
                    {r.comment}
                  </BText>
                ) : null}
                <BText variant="tiny" style={{ marginTop: 4 }}>
                  {formatDate(lang, r.created_at, { year: 'numeric', month: 'long', day: 'numeric' })}
                </BText>
              </View>
              <SmallAction
                label={t('Remove')}
                color={colors.danger}
                onPress={async () => {
                  await adminDeleteReview(r.id);
                  load();
                  await refresh();
                }}
              />
            </View>
          ))
        )}
      </View>
    );
  } else if (tab === 'categories') {
    body = (
      <View style={{ gap: 16 }}>
        <View style={styles.card}>
          <BText variant="h3">{t('Add category')}</BText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' }}>
            <TextInput
        {...({ dir: 'auto' } as any)}
              placeholder={t('e.g. Kids Salon')}
              placeholderTextColor={colors.gray}
              value={newCategory}
              onChangeText={setNewCategory}
              style={styles.input}
            />
            <Button
              title={t('Add')}
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
          <BText variant="h3">{t('Categories ({n})', { n: categories.length })}</BText>
          {categories.map((c) => (
            <View key={c.slug} style={styles.row}>
              <View style={{ flex: 1 }}>
                <BText variant="smallMedium">{t(c.name)}</BText>
                <BText variant="tiny">
                  {c.slug} · {t('{n} salons', { n: allVenues.filter((v) => v.category_id === c.id).length })}
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
          <BText variant="h3">{t('Create promo code')}</BText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' }}>
            <TextInput
        {...({ dir: 'auto' } as any)}
              placeholder={t('CODE')}
              placeholderTextColor={colors.gray}
              autoCapitalize="characters"
              value={newPromoCode}
              onChangeText={setNewPromoCode}
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
        {...({ dir: 'auto' } as any)}
              placeholder={t('% off')}
              placeholderTextColor={colors.gray}
              keyboardType="numeric"
              value={newPromoPct}
              onChangeText={setNewPromoPct}
              style={[styles.input, { width: 80, flex: 0 }]}
            />
            <Button
              title={t('Create')}
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
          <BText variant="h3">{t('Promo codes ({n})', { n: promos.length })}</BText>
          {promos.map((p) => (
            <View key={p.code} style={styles.row}>
              <View style={{ flex: 1 }}>
                <BText variant="smallMedium">{p.code}</BText>
                <BText variant="tiny">
                  {t('{pct}% off', { pct: p.pct_off })}
                  {p.expires_at
                    ? ` · ${t('expires {date}', {
                        date: formatDate(lang, p.expires_at, { year: 'numeric', month: 'numeric', day: 'numeric' }),
                      })}`
                    : ` · ${t('no expiry')}`}
                </BText>
              </View>
              <StatusTag status={p.is_active ? 'approved' : 'suspended'} />
              <SmallAction
                label={p.is_active ? t('Disable') : t('Enable')}
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
    const filtered = bookings.filter((b) => bookingStatus === 'all' || b.status === bookingStatus);
    body = (
      <View style={{ gap: 16 }}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {(['all', 'confirmed', 'completed', 'cancelled'] as const).map((st) => (
              <Chip
                key={st}
                label={st === 'all' ? t('All') : t(st === 'confirmed' ? 'Confirmed' : st === 'completed' ? 'Completed' : 'Cancelled')}
                selected={bookingStatus === st}
                onPress={() => setBookingStatus(st)}
              />
            ))}
            <View style={{ flex: 1 }} />
            {Platform.OS === 'web' && filtered.length > 0 ? (
              <SmallAction label={t('Export CSV')} color={colors.ink} onPress={() => exportBookingsCsv(filtered)} />
            ) : null}
          </View>
        </View>
        <View style={styles.card}>
          <BText variant="h3">{t('Bookings ({n})', { n: filtered.length })}</BText>
          {filtered.length === 0 ? (
            <BText variant="small" style={{ marginTop: 10 }}>
              {t('No bookings yet.')}
            </BText>
          ) : (
            filtered.map((b) => (
              <View key={b.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <BText variant="smallMedium">
                    {b.venue_name || allVenues.find((v) => v.id === b.venue_id)?.name || t('Venue')}
                  </BText>
                  <BText variant="tiny">
                    {b.customer_name || t('Guest')} ·{' '}
                    {t('{date} at {time}', { date: formatDateLong(b.starts_at), time: formatTimeOfDate(b.starts_at) })} ·{' '}
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
      </View>
    );
  }

  const navInner = (
    <View style={isDesktop ? styles.sideNav : styles.topNavRow}>
      {TABS.map((tb) => {
        const active = tab === tb.key;
        const badge = tb.key === 'salons' && pendingVenues.length > 0;
        return (
          <Pressable
            key={tb.key}
            onPress={() => setTab(tb.key)}
            style={[
              isDesktop ? styles.sideNavItem : styles.topNavItem,
              active && { backgroundColor: colors.ink },
            ]}
          >
            <Ionicons name={tb.icon as any} size={16} color={active ? colors.white : colors.ink} />
            <BText
              style={{
                fontFamily: active ? font.bold : font.medium,
                fontSize: 14,
                color: active ? colors.white : colors.ink,
                flex: isDesktop ? 1 : undefined,
              }}
            >
              {t(tb.label)}
            </BText>
            {badge && (
              <View style={styles.navBadge}>
                <BText style={{ fontFamily: font.bold, fontSize: 10, color: colors.white }}>{pendingVenues.length}</BText>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
  const nav = isDesktop ? (
    navInner
  ) : (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topNavScroll}>
      {navInner}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPage }}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Logo size={22} />
            <View style={styles.adminTag}>
              <BText style={{ fontFamily: font.bold, fontSize: 11, color: colors.white }}>{t('ADMIN')}</BText>
            </View>
          </View>
          <Pressable onPress={() => router.push('/')} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={[styles.contentWrap, isDesktop && { flexDirection: 'row', gap: 28 }]}>
          {nav}
          <View style={{ flex: 1, gap: 16 }}>{body}</View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: string; accent?: boolean }) {
  return (
    <View style={[styles.card, { flex: 1, minWidth: 150, flexBasis: '40%' }, accent && { borderColor: '#F0C36D', backgroundColor: '#FFF9EE' }]}>
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
  const { t } = useI18n();
  const map: Record<string, { label: string; color: string; bg: string }> = {
    approved: { label: 'Live', color: colors.green, bg: colors.greenBg },
    pending: { label: 'Pending', color: colors.warning, bg: colors.warningBg },
    suspended: { label: 'Suspended', color: colors.danger, bg: colors.dangerBg },
    confirmed: { label: 'Confirmed', color: colors.green, bg: colors.greenBg },
    completed: { label: 'Completed', color: colors.gray, bg: colors.bgSubtle },
    cancelled: { label: 'Cancelled', color: colors.danger, bg: colors.dangerBg },
    no_show: { label: 'No-show', color: colors.gray, bg: colors.bgSubtle },
  };
  const m = map[status] ?? map.approved;
  return (
    <View style={{ backgroundColor: m.bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
      <BText style={{ fontFamily: font.semibold, fontSize: 11, color: m.color }}>{t(m.label)}</BText>
    </View>
  );
}

function TxStatusPill({ status }: { status: string }) {
  const { t } = useI18n();
  const map: Record<string, { label: string; color: string; bg: string }> = {
    held: { label: 'In escrow', color: colors.info, bg: colors.infoBg },
    released: { label: 'Released', color: colors.green, bg: colors.greenBg },
    succeeded: { label: 'Succeeded', color: colors.green, bg: colors.greenBg },
    pending: { label: 'Pending', color: colors.warning, bg: colors.warningBg },
    failed: { label: 'Failed', color: colors.danger, bg: colors.dangerBg },
    refunded: { label: 'Refunded', color: colors.danger, bg: colors.dangerBg },
  };
  const m = map[status] ?? map.pending;
  return (
    <View style={{ backgroundColor: m.bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
      <BText style={{ fontFamily: font.semibold, fontSize: 11, color: m.color }}>{t(m.label)}</BText>
    </View>
  );
}

function RoleTag({ role }: { role: string }) {
  const { t } = useI18n();
  const map: Record<string, { color: string; bg: string }> = {
    admin: { color: colors.white, bg: colors.ink },
    partner: { color: colors.accent, bg: colors.accentSoft },
    customer: { color: colors.gray, bg: colors.bgSubtle },
  };
  const m = map[role] ?? map.customer;
  return (
    <View style={{ backgroundColor: m.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
      <BText style={{ fontFamily: font.semibold, fontSize: 11, color: m.color }}>{t(role)}</BText>
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
    paddingHorizontal: 32,
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
    paddingHorizontal: 32,
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
  topNavRow: { flexDirection: 'row', gap: 8 },
  topNavScroll: { marginBottom: 16, flexGrow: 0 },
  topNavItem: {
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
  navBadge: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
