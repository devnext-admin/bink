import { DelayControls } from '@bink/shared/components/delay-controls';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatThread, ConversationList } from '@bink/shared/components/chat';
import { Logo } from '@bink/shared/components/logo';
import { NotificationsBell } from '@bink/shared/components/notifications-bell';
import { WebHeader } from '@bink/shared/components/web-header';
import { PaymentPill } from '@bink/shared/components/payment-pill';
import { Button } from '@bink/shared/components/ui/button';
import { Chip } from '@bink/shared/components/ui/chip';
import { Field } from '../../components/ui/field';
import { Rating } from '../../components/ui/rating';
import { Avatar } from '@bink/shared/components/ui/avatar';
import { BText } from '@bink/shared/components/ui/text';
import { useAppData } from '@bink/shared/lib/app-data-context';
import { useAuth } from '@bink/shared/lib/auth-context';
import * as ImagePicker from 'expo-image-picker';
import {
  addService,
  addStaff,
  addPackage,
  updatePackage,
  deletePackage,
  setStaffHours,
  createWalkInBooking,
  addVenueImage,
  deleteService,
  deleteStaff,
  getMyStaffAccess,
  getVenueBookings,
  inviteTeamMember,
  removeVenueImage,
  setStaffServices,
  StaffAccess,
  updateService,
  updateStaff,
  updateVenueHours,
  updateVenueInfo,
  uploadVenuePhoto,
} from '@bink/shared/lib/business';
import { formatDateLong, formatDuration, formatPrice, formatTimeOfDate } from '@bink/shared/lib/format';
import { formatDate, useI18n } from '@bink/shared/lib/i18n';
import { Conversation, getConversationsForVenue } from '@bink/shared/lib/messages';
import { rescheduleBooking, setBookingStatus } from '@bink/shared/lib/ops';
import { pushNotification } from '@bink/shared/lib/notifications';
import { escrowSummary, getVenueTransactions, refundBooking, salesSummary } from '@bink/shared/lib/payments';
import { colors, font, radius } from '@bink/shared/lib/theme';
import type { Booking, Transaction, Venue } from '@bink/shared/lib/types';
import { useIsDesktop } from '@bink/shared/lib/use-layout';
import { openAdminConsole } from '@bink/shared/lib/admin-link';

type Section =
  | 'overview'
  | 'bookings'
  | 'messages'
  | 'clients'
  | 'reviews'
  | 'sales'
  | 'analytics'
  | 'services'
  | 'packages'
  | 'staff'
  | 'settings';
const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'grid-outline' },
  { key: 'bookings', label: 'Calendar', icon: 'calendar-outline' },
  { key: 'messages', label: 'Messages', icon: 'chatbubble-ellipses-outline' },
  { key: 'clients', label: 'Clients', icon: 'people-circle-outline' },
  { key: 'reviews', label: 'Reviews', icon: 'star-outline' },
  { key: 'sales', label: 'Sales', icon: 'cash-outline' },
  { key: 'analytics', label: 'Analytics', icon: 'stats-chart-outline' },
  { key: 'services', label: 'Services', icon: 'pricetags-outline' },
  { key: 'packages', label: 'Packages', icon: 'gift-outline' },
  { key: 'staff', label: 'Team', icon: 'people-outline' },
  { key: 'settings', label: 'Settings', icon: 'settings-outline' },
];
const NAV_GROUPS: { title: string; keys: Section[] }[] = [
  { title: 'Manage', keys: ['overview', 'bookings', 'messages', 'clients', 'reviews'] },
  { title: 'Money', keys: ['sales', 'analytics'] },
  { title: 'Setup', keys: ['services', 'packages', 'staff', 'settings'] },
];

const publicHost =
  typeof window !== 'undefined' && window.location?.host ? window.location.host : 'bink-seven.vercel.app';

export default function BusinessDashboard() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const { user, loading } = useAuth();
  const { allVenues, refresh } = useAppData();
  const params = useLocalSearchParams<{ venue?: string }>();

  const myVenues = useMemo(
    () => (user ? allVenues.filter((v) => v.owner_id === user.id) : []),
    [allVenues, user]
  );

  // Team-member links for the signed-in user (staff.user_id = auth uid)
  const [staffAccess, setStaffAccess] = useState<StaffAccess[]>([]);
  const [staffLoaded, setStaffLoaded] = useState(false);
  useEffect(() => {
    if (user && !user.isGuest) {
      getMyStaffAccess()
        .then(setStaffAccess, () => {})
        .finally(() => setStaffLoaded(true));
    } else {
      setStaffLoaded(true);
    }
  }, [user?.id]);

  // Admins can emulate any business via /business/dashboard?venue=<id>
  const isAdmin = user?.role === 'admin';
  const emulated = isAdmin && params.venue ? allVenues.find((v) => v.id === params.venue) ?? null : null;

  const accessibleVenues = useMemo(() => {
    const list = emulated ? [emulated] : [...myVenues];
    for (const v of allVenues) {
      if (staffAccess.some((a) => a.venueId === v.id) && !list.some((x) => x.id === v.id)) list.push(v);
    }
    return list;
  }, [emulated, myVenues, allVenues, staffAccess]);

  const [venueId, setVenueId] = useState<string | null>(null);
  const venue = accessibleVenues.find((v) => v.id === venueId) ?? accessibleVenues[0] ?? null;

  // 'owner' | 'admin' | 'manager' | 'member'
  const baseAccess: 'owner' | 'admin' | 'manager' | 'member' = !venue
    ? 'owner'
    : emulated && venue.id === emulated.id
      ? 'admin'
      : venue.owner_id === user?.id
        ? 'owner'
        : staffAccess.find((a) => a.venueId === venue.id)?.venueRole === 'manager'
          ? 'manager'
          : 'member';
  // Owners and managers can preview the dashboard exactly as one of their
  // team members sees it - member-only nav, their bookings, their services.
  const [viewAsStaff, setViewAsStaff] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => setViewAsStaff(null), [venue?.id]);
  const access = viewAsStaff && baseAccess !== 'member' ? ('member' as const) : baseAccess;
  const canManage = access !== 'member';
  const memberStaffId = viewAsStaff
    ? viewAsStaff.id
    : access === 'member'
      ? staffAccess.find((a) => a.venueId === venue?.id)?.staffId ?? null
      : null;

  const [section, setSection] = useState<Section>('overview');
  useEffect(() => {
    // Members land on their bookings; sections they can't see snap back
    if (!canManage && !['bookings', 'messages', 'services'].includes(section)) setSection('bookings');
  }, [canManage]);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [messageTarget, setMessageTarget] = useState<{ userId: string; userName: string } | null>(null);
  const [bookingsView, setBookingsView] = useState<'list' | 'day' | 'week'>('list');
  const [calDay, setCalDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [calStaff, setCalStaff] = useState<string | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const openChatWith = (b: Booking) => {
    if (!b.user_id) return;
    setMessageTarget({ userId: b.user_id, userName: b.customer_name ?? t('Customer') });
    setSection('messages');
  };

  useEffect(() => {
    if (venue) {
      getVenueBookings(venue.id).then(setBookings, () => {});
      getVenueTransactions(venue.id).then(setTransactions, () => {});
    }
  }, [venue?.id]);

  const reload = useCallback(async () => {
    await refresh();
    if (venue) {
      getVenueBookings(venue.id).then(setBookings, () => {});
      getVenueTransactions(venue.id).then(setTransactions, () => {});
    }
  }, [refresh, venue?.id]);

  if (loading || (user && !staffLoaded)) return null;

  if (!user || accessibleVenues.length === 0) {
    return (
      <View style={[styles.emptyWrap, { paddingTop: insets.top }]}>
        <Logo />
        <BText variant="h2" style={{ marginTop: 32 }}>
          {t('No business yet')}
        </BText>
        <BText variant="small" style={{ marginTop: 8, textAlign: 'center', maxWidth: 320 }}>
          {user
            ? t('List your salon - or yourself as a freelancer - to get your business dashboard.')
            : t('Log in with your business account - salons and freelancers use the same login.')}
        </BText>
        <View style={{ marginTop: 20 }}>
          <Button title={t('List your business')} onPress={() => router.replace('/business')} />
        </View>
      </View>
    );
  }

  // Team members only see the work assigned to them
  const visibleBookings = canManage
    ? bookings
    : bookings.filter((b) => b.staff_id === memberStaffId);
  const memberCustomerIds = canManage
    ? null
    : [...new Set(visibleBookings.map((b) => b.user_id).filter(Boolean))] as string[];

  const revenue = visibleBookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((c, b) => c + b.total_cents, 0);
  const upcoming = visibleBookings.filter(
    (b) => new Date(b.starts_at).getTime() >= Date.now() && b.status !== 'cancelled'
  );
  const currency = venue!.services[0]?.currency ?? 'SAR';

  let body: React.ReactNode = null;
  if (section === 'overview') {
    const DAY = 86400000;
    const active = visibleBookings.filter((b) => b.status !== 'cancelled' && b.status !== 'no_show');
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    const weekFrom = startToday.getTime() - 6 * DAY;
    const weekTo = startToday.getTime() + DAY;
    const inRange = (b: Booking, from: number, to: number) => {
      const ts = new Date(b.starts_at).getTime();
      return ts >= from && ts < to;
    };
    const todayBookings = active
      .filter((b) => inRange(b, startToday.getTime(), weekTo))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const weekBookings = active.filter((b) => inRange(b, weekFrom, weekTo));
    const prevWeekBookings = active.filter((b) => inRange(b, weekFrom - 7 * DAY, weekFrom));
    const weekRevenue = weekBookings.reduce((c, b) => c + b.total_cents, 0);
    const prevRevenue = prevWeekBookings.reduce((c, b) => c + b.total_cents, 0);
    const revDelta = prevRevenue > 0 ? Math.round(((weekRevenue - prevRevenue) / prevRevenue) * 100) : null;
    const bookDelta = prevWeekBookings.length > 0
      ? Math.round(((weekBookings.length - prevWeekBookings.length) / prevWeekBookings.length) * 100)
      : null;

    // New clients: customers whose first appointment falls in the last 7 days
    const firstSeen = new Map<string, number>();
    for (const b of active) {
      const key = b.user_id ?? `w:${b.customer_name ?? ''}`;
      const ts = new Date(b.starts_at).getTime();
      firstSeen.set(key, Math.min(firstSeen.get(key) ?? Infinity, ts));
    }
    const newClients = [...firstSeen.values()].filter((ts) => ts >= weekFrom && ts < weekTo).length;

    // Occupancy today: booked minutes vs open minutes across the team
    const todayHours = venue!.hours?.find((h) => h.weekday === new Date().getDay());
    let openMin = 720;
    if (todayHours?.is_closed) openMin = 0;
    else if (todayHours?.open_time && todayHours?.close_time) {
      const [oh, om] = todayHours.open_time.split(':').map(Number);
      const [ch, cm] = todayHours.close_time.split(':').map(Number);
      openMin = Math.max(60, ch * 60 + cm - (oh * 60 + om));
    }
    const bookedMin = todayBookings.reduce(
      (c, b) => c + Math.max(30, (new Date(b.ends_at).getTime() - new Date(b.starts_at).getTime()) / 60000),
      0
    );
    const occupancy = openMin === 0 ? null : Math.min(100, Math.round((bookedMin / (openMin * Math.max(1, venue!.staff.length))) * 100));

    // Revenue trend, last 14 days
    const trend: { label: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      trend.push({
        label: formatDate(lang, d, { day: 'numeric', month: 'short' }),
        value: active.filter((b) => new Date(b.starts_at).toDateString() === key).reduce((c, b) => c + b.total_cents, 0),
      });
    }

    // Top services by revenue
    const svcRev = new Map<string, { count: number; revenue: number }>();
    for (const b of active)
      for (const i of b.items) {
        const cur = svcRev.get(i.service_name) ?? { count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += i.price_cents;
        svcRev.set(i.service_name, cur);
      }
    const topServices = [...svcRev.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 5);

    // Team leaderboard by revenue
    const teamPerf = venue!.staff
      .map((m) => {
        const theirs = active.filter((b) => b.staff_id === m.id);
        return { name: m.name, count: theirs.length, revenue: theirs.reduce((c, b) => c + b.total_cents, 0) };
      })
      .sort((a, b) => b.revenue - a.revenue);

    const recentReviews = [...venue!.reviews].slice(0, 3);

    body = (
      <View style={{ gap: 16 }}>
        {venue!.status === 'pending' && (
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={18} color={colors.warning} />
            <BText variant="small" color={colors.warning} style={{ flex: 1 }}>
              {t('Your listing is pending review by the Bink team. It is not visible to customers yet.')}
            </BText>
          </View>
        )}
        {venue!.status === 'suspended' && (
          <View style={[styles.pendingBanner, { backgroundColor: colors.dangerBg }]}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <BText variant="small" color={colors.danger} style={{ flex: 1 }}>
              {t('Your listing is suspended. Contact Bink support for details.')}
            </BText>
          </View>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <StatCard
            label={t("Today's appointments")}
            value={String(todayBookings.length)}
            icon="calendar-outline"
            delta={bookDelta}
            sub={t('{n} this week', { n: weekBookings.length })}
          />
          <StatCard
            label={t('Revenue - last 7 days')}
            value={formatPrice(weekRevenue, currency)}
            icon="cash-outline"
            delta={revDelta}
          />
          <StatCard label={t('New clients (7 days)')} value={String(newClients)} icon="person-add-outline" />
          <StatCard
            label={t('Occupancy today')}
            value={occupancy == null ? t('Closed') : `${occupancy}%`}
            icon="speedometer-outline"
          />
          <StatCard
            label={t('Rating')}
            value={venue!.rating_count ? venue!.rating_avg.toFixed(1) : '-'}
            icon="star-outline"
            sub={venue!.rating_count ? t('{count} reviews', { count: String(venue!.rating_count) }) : t('No reviews yet')}
          />
        </View>

        {canManage && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <QuickAction
              icon="add-circle-outline"
              label={t('New booking')}
              onPress={() => {
                setSection('bookings');
                setShowWalkIn(true);
              }}
            />
            <QuickAction icon="pricetag-outline" label={t('Add a service')} onPress={() => setSection('services')} />
            <QuickAction icon="person-add-outline" label={t('Invite a team member')} onPress={() => setSection('staff')} />
            <QuickAction icon="time-outline" label={t('Edit opening hours')} onPress={() => setSection('settings')} />
          </View>
        )}
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
          <View style={[styles.card, { flex: 1.5 }]}>
            <BText variant="h3">{t('Revenue - last 14 days')}</BText>
            <BarChart data={trend} unit="money" />
          </View>
          <View style={[styles.card, { flex: 1 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <BText variant="h3">{t("Today's schedule")}</BText>
              {canManage && (
                <Button
                  title={t('Add booking')}
                  size="sm"
                  variant="secondary"
                  onPress={() => {
                    setSection('bookings');
                    setShowWalkIn(true);
                  }}
                />
              )}
            </View>
            {todayBookings.length === 0 ? (
              <BText variant="small" style={{ marginTop: 12 }}>
                {t('No appointments today.')}
              </BText>
            ) : (
              <View style={{ marginTop: 8 }}>
                {todayBookings.slice(0, 6).map((b) => (
                  <View key={b.id} style={styles.scheduleRow}>
                    <BText variant="smallMedium" style={{ width: 52 }}>
                      {formatTimeOfDate(b.starts_at)}
                    </BText>
                    <View style={{ flex: 1 }}>
                      <BText variant="smallMedium" numberOfLines={1}>
                        {t(b.customer_name ?? 'Guest customer')}
                      </BText>
                      <BText variant="tiny" numberOfLines={1}>
                        {b.items.map((i) => t(i.service_name)).join('، ')}
                        {b.staff_name ? ` · ${t(b.staff_name)}` : ''}
                      </BText>
                    </View>
                    <StatusTag status={b.status} />
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
          <View style={[styles.card, { flex: 1 }]}>
            <BText variant="h3">{t('Top services')}</BText>
            {topServices.length === 0 ? (
              <BText variant="small" style={{ marginTop: 10 }}>
                {t('No bookings yet.')}
              </BText>
            ) : (
              <View style={{ marginTop: 6 }}>
                {topServices.map(([name, v]) => (
                  <View key={name} style={styles.tableRow}>
                    <BText variant="smallMedium" style={{ flex: 1 }} numberOfLines={1}>
                      {t(name)}
                    </BText>
                    <BText variant="tiny" style={{ width: 70 }}>
                      {t('{n} booked', { n: v.count })}
                    </BText>
                    <BText variant="smallMedium" style={{ width: 90, textAlign: 'right' }}>
                      {formatPrice(v.revenue, currency)}
                    </BText>
                  </View>
                ))}
              </View>
            )}
          </View>
          <View style={[styles.card, { flex: 1 }]}>
            <BText variant="h3">{t('Team leaderboard')}</BText>
            {teamPerf.length === 0 ? (
              <BText variant="small" style={{ marginTop: 10 }}>
                {t('Add team members to see their bookings.')}
              </BText>
            ) : (
              <View style={{ marginTop: 6 }}>
                {teamPerf.map((m, i) => (
                  <View key={m.name} style={styles.tableRow}>
                    <BText variant="tiny" style={{ width: 18 }}>
                      {i + 1}
                    </BText>
                    <BText variant="smallMedium" style={{ flex: 1 }} numberOfLines={1}>
                      {t(m.name)}
                    </BText>
                    <BText variant="tiny" style={{ width: 80 }}>
                      {t('{n} bookings', { n: m.count })}
                    </BText>
                    <BText variant="smallMedium" style={{ width: 90, textAlign: 'right' }}>
                      {formatPrice(m.revenue, currency)}
                    </BText>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
          <View style={[styles.card, { flex: 1.5 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <BText variant="h3">{t('Recent reviews')}</BText>
              <Button title={t('All reviews')} size="sm" variant="secondary" onPress={() => setSection('reviews')} />
            </View>
            {recentReviews.length === 0 ? (
              <BText variant="small" style={{ marginTop: 12 }}>
                {t('No reviews yet.')}
              </BText>
            ) : (
              recentReviews.map((r) => (
                <View key={r.id} style={{ marginTop: 14, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <BText variant="smallMedium">{t(r.author_name)}</BText>
                    <Rating value={r.rating} />
                  </View>
                  <BText variant="small" numberOfLines={2}>
                    {t(r.comment)}
                  </BText>
                </View>
              ))
            )}
          </View>
          <View style={[styles.card, { flex: 1 }]}>
            <BText variant="h3">{t('Your public page')}</BText>
            <BText variant="small" style={{ marginTop: 6 }}>
              {publicHost}/venue/{venue!.slug}
            </BText>
            <View style={{ flexDirection: 'row', marginTop: 12 }}>
              <Button
                title={t('Preview listing')}
                variant="secondary"
                size="sm"
                onPress={() => router.push(`/venue/${venue!.slug}`)}
              />
            </View>
          </View>
        </View>
      </View>
    );
  } else if (section === 'bookings') {
    const staffFiltered = calStaff
      ? visibleBookings.filter((b) => b.staff_id === calStaff)
      : visibleBookings;
    const dayBookings = staffFiltered
      .filter((b) => new Date(b.starts_at).toDateString() === calDay.toDateString() && b.status !== 'cancelled')
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const weekDays: { date: Date; items: Booking[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(calDay);
      d.setDate(calDay.getDate() + i);
      weekDays.push({
        date: d,
        items: staffFiltered
          .filter((b) => new Date(b.starts_at).toDateString() === d.toDateString() && b.status !== 'cancelled')
          .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
      });
    }
    body = (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Chip label={t('List')} selected={bookingsView === 'list'} onPress={() => setBookingsView('list')} />
          <Chip label={t('Day view')} selected={bookingsView === 'day'} onPress={() => setBookingsView('day')} />
          <Chip label={t('Week view')} selected={bookingsView === 'week'} onPress={() => setBookingsView('week')} />
          <View style={{ flex: 1 }} />
          {canManage && (
            <Button title={showWalkIn ? t('Close') : t('Add booking')} size="sm" variant={showWalkIn ? 'secondary' : 'primary'} onPress={() => setShowWalkIn(!showWalkIn)} />
          )}
        </View>
        {showWalkIn && canManage && (
          <WalkInForm
            venue={venue!}
            onDone={() => {
              setShowWalkIn(false);
              reload();
            }}
          />
        )}
        {canManage && venue!.staff.length > 0 && bookingsView !== 'list' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Chip label={t('All team')} selected={!calStaff} onPress={() => setCalStaff(null)} />
            {venue!.staff.map((m) => (
              <Chip key={m.id} label={t(m.name)} selected={calStaff === m.id} onPress={() => setCalStaff(calStaff === m.id ? null : m.id)} />
            ))}
          </View>
        )}
        {bookingsView === 'week' && (
          <View style={styles.card}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 12 }}>
              {Array.from({ length: 14 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                d.setHours(0, 0, 0, 0);
                return (
                  <Chip
                    key={i}
                    label={i === 0 ? t('Today') : formatDate(lang, d, { weekday: 'short', day: 'numeric' })}
                    selected={calDay.toDateString() === d.toDateString()}
                    onPress={() => setCalDay(d)}
                  />
                );
              })}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {weekDays.map((day) => (
                  <View key={day.date.toISOString()} style={styles.weekCol}>
                    <BText variant="smallMedium" style={{ marginBottom: 8 }}>
                      {formatDate(lang, day.date, { weekday: 'short', day: 'numeric' })}
                    </BText>
                    {day.items.length === 0 ? (
                      <BText variant="tiny">{t('Free')}</BText>
                    ) : (
                      day.items.map((b) => (
                        <View key={b.id} style={styles.weekBlock}>
                          <BText style={{ fontFamily: font.bold, fontSize: 11, color: colors.ink }}>
                            {formatTimeOfDate(b.starts_at)}
                          </BText>
                          <BText variant="tiny" numberOfLines={1}>
                            {t(b.customer_name ?? 'Guest customer')}
                          </BText>
                          <BText variant="tiny" numberOfLines={1}>
                            {b.items.map((i) => t(i.service_name)).join('، ')}
                          </BText>
                        </View>
                      ))
                    )}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
        {bookingsView === 'day' && (
          <View style={styles.card}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 12 }}>
              {Array.from({ length: 14 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                d.setHours(0, 0, 0, 0);
                return (
                  <Chip
                    key={i}
                    label={i === 0 ? t('Today') : formatDate(lang, d, { weekday: 'short', day: 'numeric' })}
                    selected={calDay.toDateString() === d.toDateString()}
                    onPress={() => setCalDay(d)}
                  />
                );
              })}
            </ScrollView>
            <DayCalendar bookings={dayBookings} />
          </View>
        )}
        {bookingsView === 'list' && (
      <View style={styles.card}>
        <BText variant="h3">{canManage ? t('All bookings') : t('Your bookings')}</BText>
        {visibleBookings.length === 0 ? (
          <BText variant="small" style={{ marginTop: 10 }}>
            {t('No bookings yet.')}
          </BText>
        ) : (
          visibleBookings.map((b) => (
            <BookingRow
              key={b.id}
              booking={b}
              venue={venue!}
              onRefund={canManage ? reload : undefined}
              onChanged={reload}
              onMessage={openChatWith}
              canOperate
            />
          ))
        )}
      </View>
        )}
      </View>
    );
  } else if (section === 'clients') {
    const map = new Map<string, { name: string; visits: number; spend: number; last: string; userId: string | null }>();
    for (const b of visibleBookings.filter((x) => x.status !== 'cancelled')) {
      const key = b.user_id ?? `w:${b.customer_name ?? 'guest'}`;
      const cur = map.get(key) ?? {
        name: b.customer_name ?? t('Guest customer'),
        visits: 0,
        spend: 0,
        last: '',
        userId: b.user_id ?? null,
      };
      cur.visits += 1;
      cur.spend += b.total_cents;
      if (b.starts_at > cur.last) cur.last = b.starts_at;
      map.set(key, cur);
    }
    let clients = [...map.values()].sort((a, b) => b.spend - a.spend);
    const q = clientQuery.trim().toLowerCase();
    if (q) clients = clients.filter((c) => c.name.toLowerCase().includes(q));
    body = (
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <BText variant="h3">{t('{n} clients', { n: map.size })}</BText>
          <View style={{ width: 260 }}>
            <Field placeholder={t('Search clients')} value={clientQuery} onChangeText={setClientQuery} />
          </View>
        </View>
        {clients.length === 0 ? (
          <BText variant="small" style={{ marginTop: 12 }}>
            {t('No clients yet - they appear here after their first booking.')}
          </BText>
        ) : (
          <View style={{ marginTop: 10 }}>
            {isDesktop && (
              <View style={[styles.tableRow, { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                <BText variant="tiny" style={{ flex: 1 }}>
                  {t('Client')}
                </BText>
                <BText variant="tiny" style={{ width: 70 }}>
                  {t('Visits')}
                </BText>
                <BText variant="tiny" style={{ width: 100 }}>
                  {t('Total spent')}
                </BText>
                <BText variant="tiny" style={{ width: 120 }}>
                  {t('Last visit')}
                </BText>
                <View style={{ width: 90 }} />
              </View>
            )}
            {clients.map((c, i) => (
              <Pressable
                key={i}
                onPress={() => setExpandedClient(expandedClient === c.name ? null : c.name)}
                style={styles.tableRow}
              >
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar name={c.name} size={32} />
                  <View style={{ flex: 1 }}>
                    <BText variant="smallMedium" numberOfLines={1}>
                      {t(c.name)}
                    </BText>
                    {!c.userId && (
                      <BText variant="tiny">{t('Walk-in')}</BText>
                    )}
                  </View>
                </View>
                {isDesktop && (
                  <BText variant="small" style={{ width: 70 }}>
                    {c.visits}
                  </BText>
                )}
                <BText variant="smallMedium" style={{ width: 100 }}>
                  {formatPrice(c.spend, currency)}
                </BText>
                {isDesktop && (
                  <BText variant="small" style={{ width: 120 }}>
                    {formatDate(lang, new Date(c.last), { day: 'numeric', month: 'short' })}
                  </BText>
                )}
                <View style={{ width: 90, alignItems: 'flex-end' }}>
                  {c.userId ? (
                    <Button
                      title={t('Message')}
                      size="sm"
                      variant="secondary"
                      onPress={() => {
                        setMessageTarget({ userId: c.userId!, userName: c.name });
                        setSection('messages');
                      }}
                    />
                  ) : null}
                </View>
              </Pressable>
            ))}
            {expandedClient != null && (() => {
              const c = clients.find((x) => x.name === expandedClient);
              if (!c) return null;
              const history = visibleBookings
                .filter((b) => (b.customer_name ?? t('Guest customer')) === c.name)
                .sort((a, b) => b.starts_at.localeCompare(a.starts_at));
              return (
                <View style={styles.clientHistory}>
                  <BText variant="smallMedium">{t('Visit history - {name}', { name: t(c.name) })}</BText>
                  {history.map((b) => (
                    <View key={b.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                      <BText variant="tiny" style={{ width: 100 }}>
                        {formatDate(lang, new Date(b.starts_at), { day: 'numeric', month: 'short', year: 'numeric' })}
                      </BText>
                      <BText variant="small" style={{ flex: 1 }} numberOfLines={1}>
                        {b.items.map((i) => t(i.service_name)).join('، ')}
                        {b.staff_name ? ` · ${t(b.staff_name)}` : ''}
                      </BText>
                      <StatusTag status={b.status} />
                      <BText variant="smallMedium" style={{ width: 84, textAlign: 'right' }}>
                        {formatPrice(b.total_cents, currency)}
                      </BText>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
        )}
      </View>
    );
  } else if (section === 'reviews') {
    const revs = venue!.reviews;
    const dist = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: revs.filter((r) => Math.round(r.rating) === star).length,
    }));
    const maxDist = Math.max(...dist.map((d) => d.count), 1);
    body = (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
          <View style={[styles.card, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
            <BText style={{ fontFamily: font.extrabold, fontSize: 44, lineHeight: 54, color: colors.ink }}>
              {venue!.rating_count ? venue!.rating_avg.toFixed(1) : '-'}
            </BText>
            <Rating value={venue!.rating_avg} />
            <BText variant="small" style={{ marginTop: 6 }}>
              {t('{count} reviews', { count: String(venue!.rating_count) })}
            </BText>
          </View>
          <View style={[styles.card, { flex: 1.6 }]}>
            <BText variant="h3">{t('Rating breakdown')}</BText>
            <View style={{ gap: 8, marginTop: 12 }}>
              {dist.map((d) => (
                <View key={d.star} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <BText variant="tiny" style={{ width: 26 }}>
                    {d.star} ★
                  </BText>
                  <View style={{ flex: 1, height: 12, backgroundColor: colors.bgSubtle, borderRadius: radius.pill }}>
                    <View
                      style={{
                        width: `${(d.count / maxDist) * 100}%`,
                        height: 12,
                        borderRadius: radius.pill,
                        backgroundColor: colors.star,
                        minWidth: d.count > 0 ? 6 : 0,
                      }}
                    />
                  </View>
                  <BText variant="tiny" style={{ width: 24, textAlign: 'right' }}>
                    {d.count}
                  </BText>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.card}>
          <BText variant="h3">{t('All reviews')}</BText>
          {revs.length === 0 ? (
            <BText variant="small" style={{ marginTop: 12 }}>
              {t('No reviews yet.')}
            </BText>
          ) : (
            revs.map((r) => (
              <View key={r.id} style={styles.reviewRow}>
                <Avatar name={r.author_name} size={36} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <BText variant="smallMedium">{t(r.author_name)}</BText>
                    <Rating value={r.rating} />
                    <BText variant="tiny">{formatDateLong(r.created_at)}</BText>
                  </View>
                  {r.comment ? (
                    <BText variant="small" style={{ marginTop: 4 }}>
                      {r.comment}
                    </BText>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    );
  } else if (section === 'messages') {
    body = (
      <VenueMessages
        venue={venue!}
        allowedUserIds={memberCustomerIds}
        target={messageTarget}
        onTargetConsumed={() => setMessageTarget(null)}
      />
    );
  } else if (section === 'sales') {
    const summary = salesSummary(transactions);
    const escrow = escrowSummary(transactions);
    body = (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <StatCard label={t('Gross sales')} value={formatPrice(summary.gross_cents, summary.currency)} icon="trending-up-outline" />
          <StatCard label={t('In escrow')} value={formatPrice(escrow.held_cents, escrow.currency)} icon="lock-closed-outline" />
          <StatCard label={t('Released to you')} value={formatPrice(escrow.released_cents, escrow.currency)} icon="checkmark-done-outline" />
          <StatCard label={t('Refunds')} value={formatPrice(summary.refunds_cents, summary.currency)} icon="return-down-back-outline" />
        </View>
        <View style={styles.escrowExplain}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.info} />
          <BText variant="tiny" color={colors.info} style={{ flex: 1 }}>
            {t('Online payments are held by Bink in escrow. They are released to you once you mark the booking completed and the customer confirms their visit.')}
          </BText>
        </View>
        <View style={styles.card}>
          <BText variant="h3">{t('Transactions')}</BText>
          {transactions.length === 0 ? (
            <BText variant="small" style={{ marginTop: 10 }}>
              {t('No online payments yet. Card and Apple Pay payments will appear here; pay-at-venue bookings are listed under Bookings.')}
            </BText>
          ) : (
            transactions.map((tx) => (
              <View key={tx.id} style={styles.bookingRow}>
                <View style={{ flex: 1 }}>
                  <BText variant="smallMedium">
                    {t(tx.customer_name || 'Customer')} ·{' '}
                    {tx.method === 'apple_pay' ? 'Apple Pay' : tx.method === 'card' ? t('Card') : t('At venue')}
                  </BText>
                  <BText variant="tiny">
                    {formatDateLong(tx.created_at)} · {tx.gateway}
                    {tx.gateway_ref ? ` · ${tx.gateway_ref}` : ''}
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
              </View>
            ))
          )}
        </View>
      </View>
    );
  } else if (section === 'analytics') {
    body = <AnalyticsSection bookings={bookings} venue={venue!} isDesktop={isDesktop} />;
  } else if (section === 'services') {
    if (canManage) {
      body = <ServicesEditor venue={venue!} onChanged={reload} />;
    } else if (memberStaffId) {
      body = <MemberServicesEditor venue={venue!} staffId={memberStaffId} onChanged={reload} />;
    } else {
      body = (
        <View style={styles.card}>
          <BText variant="small">{t('You can be booked for any service.')}</BText>
        </View>
      );
    }
  } else if (section === 'packages') {
    body = <PackagesEditor venue={venue!} onChanged={reload} />;
  } else if (section === 'staff') {
    body = (
      <StaffEditor
        venue={venue!}
        onChanged={reload}
        onViewAs={(m) => setViewAsStaff({ id: m.id, name: m.name })}
      />
    );
  } else {
    body = <SettingsEditor venue={venue!} onChanged={reload} />;
  }

  const memberSections: Section[] = ['bookings', 'messages', 'services'];
  const navItems = SECTIONS.filter((s) => canManage || memberSections.includes(s.key));
  const navInner = (
    <View style={styles.topNavRow}>
      {navItems.map((s) => {
        const active = section === s.key;
        return (
          <Pressable
            key={s.key}
            onPress={() => setSection(s.key)}
            style={[styles.topNavItem, active && { backgroundColor: colors.ink }]}
          >
            <Ionicons name={s.icon as any} size={16} color={active ? colors.white : colors.ink} />
            <BText
              style={{
                fontFamily: active ? font.bold : font.medium,
                fontSize: 14,
                color: active ? colors.white : colors.ink,
              }}
            >
              {t(s.label)}
            </BText>
          </Pressable>
        );
      })}
    </View>
  );
  const nav = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.topNavScroll}>
      {navInner}
    </ScrollView>
  );

  const sectionLabel = SECTIONS.find((x) => x.key === section)?.label ?? 'Overview';
  const todayLabel = formatDate(lang, new Date(), { weekday: 'long', day: 'numeric', month: 'long' });

  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPage }}>
        {/* The standard app header stays - the dashboard is a section of the
            same app, not a separate takeover. */}
        <WebHeader />
        <View style={{ flex: 1, flexDirection: 'row' }}>
        {/* sidebar */}
        <View style={[styles.sidebar, { paddingTop: 16 }]}>
          <View style={[styles.venueBlock, { marginTop: 0 }]}>
            <Image
              source={{ uri: venue!.images[0]?.url }}
              style={{ width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.bgSubtle }}
              contentFit="cover"
            />
            <View style={{ flex: 1 }}>
              <BText variant="smallMedium" numberOfLines={1}>
                {t(venue!.name)}
              </BText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <StatusTag status={venue!.status ?? 'approved'} />
                {access === 'member' && (
                  <BText variant="tiny" color={colors.info}>
                    {t('Team member')}
                  </BText>
                )}
              </View>
            </View>
          </View>
          {accessibleVenues.length > 1 && (
            <View style={{ paddingHorizontal: 20, marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {accessibleVenues.map((v) => (
                <Chip key={v.id} label={v.name} selected={venue!.id === v.id} onPress={() => setVenueId(v.id)} />
              ))}
            </View>
          )}
          <ScrollView style={{ flex: 1, marginTop: 14 }} contentContainerStyle={{ paddingBottom: 12 }}>
            {NAV_GROUPS.map((g) => {
              const items = navItems.filter((x) => g.keys.includes(x.key));
              if (!items.length) return null;
              return (
                <View key={g.title} style={{ marginBottom: 14 }}>
                  <BText style={styles.navGroupTitle}>{t(g.title)}</BText>
                  {items.map((x) => {
                    const active = section === x.key;
                    return (
                      <Pressable
                        key={x.key}
                        onPress={() => setSection(x.key)}
                        style={({ hovered }: any) => [
                          styles.sideNavItem,
                          hovered && !active && { backgroundColor: colors.bgPage },
                          active && { backgroundColor: colors.ink },
                        ]}
                      >
                        <Ionicons name={x.icon as any} size={16} color={active ? colors.white : colors.ink} />
                        <BText
                          style={{
                            fontFamily: active ? font.bold : font.medium,
                            fontSize: 14,
                            color: active ? colors.white : colors.ink,
                          }}
                        >
                          {t(x.label)}
                        </BText>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.sidebarFooter}>
            <Pressable style={styles.footerLink} onPress={() => router.push(`/venue/${venue!.slug}`)}>
              <Ionicons name="open-outline" size={15} color={colors.gray} />
              <BText variant="small">{t('View public page')}</BText>
            </Pressable>
            <Pressable style={styles.footerLink} onPress={() => router.replace('/')}>
              <Ionicons name="storefront-outline" size={15} color={colors.gray} />
              <BText variant="small">{t('Back to Bink')}</BText>
            </Pressable>
          </View>
        </View>

        {/* main */}
        <View style={{ flex: 1 }}>
          <View style={[styles.topBar, { paddingTop: 14 }]}>
            <View>
              <BText variant="h2">{t(sectionLabel)}</BText>
              <BText variant="tiny">{todayLabel}</BText>
            </View>
            <View style={{ flex: 1 }} />
            {canManage && (
              <Button
                title={t('Add booking')}
                size="sm"
                onPress={() => {
                  setSection('bookings');
                  setShowWalkIn(true);
                }}
              />
            )}
          </View>
          <ScrollView contentContainerStyle={{ padding: 28, paddingBottom: 60 }}>
            {access === 'admin' && (
              <View style={[styles.emulateBanner, { marginBottom: 16 }]}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.info} />
                <BText variant="tiny" color={colors.info} style={{ flex: 1 }}>
                  {t('Admin view - you are managing this business on behalf of its owner.')}
                </BText>
                <SmallPillBtn label={t('Exit')} color={colors.info} onPress={() => openAdminConsole()} />
              </View>
            )}
            {viewAsStaff && (
              <View style={[styles.emulateBanner, { marginBottom: 16 }]}>
                <Ionicons name="eye-outline" size={16} color={colors.info} />
                <BText variant="tiny" color={colors.info} style={{ flex: 1 }}>
                  {t('Viewing as {name}', { name: t(viewAsStaff.name) })}
                </BText>
                <SmallPillBtn label={t('Exit')} color={colors.info} onPress={() => setViewAsStaff(null)} />
              </View>
            )}
            {body}
          </ScrollView>
        </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPage }}>
      {/* header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerInner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Logo size={22} />
            <View style={styles.bizTag}>
              <BText style={{ fontFamily: font.bold, fontSize: 11, color: colors.accent }}>{t('BUSINESS')}</BText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {accessibleVenues.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {accessibleVenues.map((v) => (
                  <Chip key={v.id} label={v.name} selected={venue!.id === v.id} onPress={() => setVenueId(v.id)} />
                ))}
              </ScrollView>
            )}
            <NotificationsBell />
            <Pressable onPress={() => router.replace('/')} hitSlop={8} accessibilityLabel={t('Back to Bink')}>
              <Ionicons name="storefront-outline" size={22} color={colors.ink} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={styles.contentWrap}>
          {nav}
          <View style={{ flex: 1, gap: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <Image
                source={{ uri: venue!.images[0]?.url }}
                style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.bgSubtle }}
                contentFit="cover"
              />
              <View>
                <BText variant="h2">{t(venue!.name)}</BText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <BText variant="small">
                    {venue!.area ? `${t(venue!.area)}, ` : ''}
                    {t(venue!.city)}
                  </BText>
                  <StatusTag status={venue!.status ?? 'approved'} />
                  {access === 'member' && (
                    <View style={{ backgroundColor: colors.infoBg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <BText style={{ fontFamily: font.semibold, fontSize: 11, color: colors.info }}>{t('Team member')}</BText>
                    </View>
                  )}
                </View>
              </View>
            </View>
            {access === 'admin' && (
              <View style={styles.emulateBanner}>
                <Ionicons name="shield-checkmark-outline" size={16} color={colors.info} />
                <BText variant="tiny" color={colors.info} style={{ flex: 1 }}>
                  {t('Admin view - you are managing this business on behalf of its owner.')}
                </BText>
                <SmallPillBtn label={t('Exit')} color={colors.info} onPress={() => openAdminConsole()} />
              </View>
            )}
            {viewAsStaff && (
              <View style={styles.emulateBanner}>
                <Ionicons name="eye-outline" size={16} color={colors.info} />
                <BText variant="tiny" color={colors.info} style={{ flex: 1 }}>
                  {t('Viewing as {name}', { name: t(viewAsStaff.name) })}
                </BText>
                <SmallPillBtn label={t('Exit')} color={colors.info} onPress={() => setViewAsStaff(null)} />
              </View>
            )}
            {body}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
const CAL_START = 10 * 60; // 10:00
const CAL_END = 22 * 60; // 22:00
const PX_PER_MIN = 1.4;

function DayCalendar({ bookings }: { bookings: Booking[] }) {
  const { t } = useI18n();
  const hours = Array.from({ length: (CAL_END - CAL_START) / 60 + 1 }, (_, i) => CAL_START + i * 60);
  return (
    <View style={{ flexDirection: 'row', marginTop: 8 }}>
      <View style={{ width: 52 }}>
        {hours.map((m) => (
          <BText key={m} variant="tiny" style={{ height: 60 * PX_PER_MIN }}>
            {`${String(Math.floor(m / 60)).padStart(2, '0')}:00`}
          </BText>
        ))}
      </View>
      <View style={{ flex: 1, height: (CAL_END - CAL_START) * PX_PER_MIN, borderLeftWidth: 1, borderLeftColor: colors.divider }}>
        {hours.map((m) => (
          <View key={m} style={{ position: 'absolute', top: (m - CAL_START) * PX_PER_MIN, left: 0, right: 0, height: 1, backgroundColor: colors.divider }} />
        ))}
        {bookings.map((b) => {
          const st = new Date(b.starts_at);
          const en = new Date(b.ends_at);
          const startMin = Math.max(st.getHours() * 60 + st.getMinutes(), CAL_START);
          const dur = Math.max(30, (en.getTime() - st.getTime()) / 60000);
          return (
            <View
              key={b.id}
              style={{
                position: 'absolute',
                top: (startMin - CAL_START) * PX_PER_MIN,
                left: 8,
                right: 8,
                height: Math.min(dur, CAL_END - startMin) * PX_PER_MIN - 3,
                backgroundColor: colors.accentSoft,
                borderLeftWidth: 3,
                borderLeftColor: colors.accent,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
                overflow: 'hidden',
              }}
            >
              <BText variant="smallMedium" numberOfLines={1}>
                {formatTimeOfDate(b.starts_at)} · {t(b.customer_name || 'Guest customer')}
              </BText>
              <BText variant="tiny" numberOfLines={1}>
                {b.items.map((i) => t(i.service_name)).join('، ')}
                {b.staff_name ? ` · ${t('with {name}', { name: t(b.staff_name) })}` : ''}
              </BText>
            </View>
          );
        })}
        {bookings.length === 0 && (
          <BText variant="small" style={{ padding: 16 }}>
            {t('No appointments this day.')}
          </BText>
        )}
      </View>
    </View>
  );
}

function WalkInForm({ venue, onDone }: { venue: Venue; onDone: () => void }) {
  const { t, lang } = useI18n();
  const [name, setName] = useState('');
  const [serviceId, setServiceId] = useState<string | null>(venue.services[0]?.id ?? null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [day, setDay] = useState<Date | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const service = venue.services.find((sv) => sv.id === serviceId);
    if (!name.trim() || !service || !day || !time) {
      setError(t('Fill the name, service, day and time.'));
      return;
    }
    setBusy(true);
    const [h, m] = time.split(':').map(Number);
    const startsAt = new Date(day);
    startsAt.setHours(h, m, 0, 0);
    const ok = await createWalkInBooking(venue, { name: name.trim(), service, staffId, startsAt });
    setBusy(false);
    if (ok) onDone();
    else setError(t('Could not create the booking.'));
  };

  return (
    <View style={styles.card}>
      <BText variant="h3">{t('New walk-in booking')}</BText>
      <View style={{ gap: 12, marginTop: 14 }}>
        <Field label={t('Customer name')} placeholder={t('e.g. Sara')} value={name} onChangeText={setName} />
        <View style={{ gap: 6 }}>
          <BText variant="smallMedium">{t('Service')}</BText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {venue.services.map((sv) => (
              <Chip key={sv.id} label={t(sv.name)} selected={serviceId === sv.id} onPress={() => setServiceId(sv.id)} />
            ))}
          </View>
        </View>
        {venue.staff.length > 0 && (
          <View style={{ gap: 6 }}>
            <BText variant="smallMedium">{t('Professional (optional)')}</BText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {venue.staff.map((m) => (
                <Chip key={m.id} label={t(m.name)} selected={staffId === m.id} onPress={() => setStaffId(staffId === m.id ? null : m.id)} />
              ))}
            </View>
          </View>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {Array.from({ length: 14 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            d.setHours(0, 0, 0, 0);
            return (
              <Chip
                key={i}
                label={i === 0 ? t('Today') : formatDate(lang, d, { weekday: 'short', day: 'numeric' })}
                selected={day?.toDateString() === d.toDateString()}
                onPress={() => setDay(d)}
              />
            );
          })}
        </ScrollView>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {Array.from({ length: 24 }, (_, i) => {
            const slot = `${String(10 + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
            return <Chip key={slot} label={slot} selected={time === slot} onPress={() => setTime(slot)} />;
          })}
        </View>
        {error ? (
          <BText variant="small" color={colors.danger}>
            {error}
          </BText>
        ) : null}
        <Button title={t('Create booking')} loading={busy} onPress={submit} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
function StatusTag({ status }: { status: string }) {
  const { t } = useI18n();
  const map: Record<string, { label: string; color: string; bg: string }> = {
    approved: { label: 'Live', color: colors.green, bg: colors.greenBg },
    pending: { label: 'Pending review', color: colors.warning, bg: colors.warningBg },
    suspended: { label: 'Suspended', color: colors.danger, bg: colors.dangerBg },
  };
  const m = map[status] ?? map.approved;
  return (
    <View style={{ backgroundColor: m.bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
      <BText style={{ fontFamily: font.semibold, fontSize: 11, color: m.color }}>{t(m.label)}</BText>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [styles.quickAction, hovered && { backgroundColor: colors.bgSubtle }]}
    >
      <Ionicons name={icon as any} size={16} color={colors.accent} />
      <BText variant="smallMedium">{label}</BText>
    </Pressable>
  );
}

function StatCard({
  label,
  value,
  icon,
  delta,
  sub,
}: {
  label: string;
  value: string;
  icon: string;
  delta?: number | null;
  sub?: string;
}) {
  const { t } = useI18n();
  const up = (delta ?? 0) >= 0;
  return (
    <View style={[styles.card, { flex: 1, minWidth: 150, flexBasis: '18%' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Ionicons name={icon as any} size={18} color={colors.gray} />
        {delta != null && (
          <View style={[styles.deltaPill, { backgroundColor: up ? colors.greenBg : colors.dangerBg }]}>
            <Ionicons name={up ? 'trending-up' : 'trending-down'} size={12} color={up ? colors.green : colors.danger} />
            <BText style={{ fontFamily: font.semibold, fontSize: 11, color: up ? colors.green : colors.danger }}>
              {`${Math.abs(delta)}%`}
            </BText>
          </View>
        )}
      </View>
      <BText style={{ fontFamily: font.extrabold, fontSize: 24, lineHeight: 32, color: colors.ink, marginTop: 8 }} numberOfLines={1}>
        {value}
      </BText>
      <BText variant="tiny" style={{ marginTop: 2 }} numberOfLines={1}>
        {label}
      </BText>
      {sub ? (
        <BText variant="tiny" numberOfLines={1}>
          {sub}
        </BText>
      ) : delta != null ? (
        <BText variant="tiny" numberOfLines={1}>
          {t('vs last week')}
        </BText>
      ) : null}
    </View>
  );
}

function BookingRow({
  booking,
  venue,
  onRefund,
  onChanged,
  onMessage,
  canOperate,
}: {
  booking: Booking;
  venue?: Venue;
  onRefund?: () => void;
  onChanged?: () => void;
  onMessage?: (b: Booking) => void;
  canOperate?: boolean;
}) {
  const { t, lang } = useI18n();
  const [refunding, setRefunding] = useState(false);
  const [resched, setResched] = useState(false);
  const [reschedDay, setReschedDay] = useState<Date | null>(null);
  const canManage = (onRefund || canOperate) && (booking.status === 'confirmed' || booking.status === 'pending');
  const durationMin = Math.max(
    15,
    Math.round((new Date(booking.ends_at).getTime() - new Date(booking.starts_at).getTime()) / 60000)
  );

  const doReschedule = async (slot: Date) => {
    await rescheduleBooking(booking.id, slot, durationMin);
    if (booking.user_id) {
      await pushNotification({
        audience: 'customer',
        userId: booking.user_id,
        venueId: booking.venue_id,
        title: 'Appointment rescheduled',
        body: `${venue?.name ?? 'The salon'} moved your appointment to ${formatDateLong(slot.toISOString())} · ${formatTimeOfDate(slot.toISOString())}.`,
      });
    }
    setResched(false);
    setReschedDay(null);
    onChanged?.();
  };
  return (
    <View style={[styles.bookingRow, { flexWrap: 'wrap' }]}>
      <View style={{ flex: 1, minWidth: 220 }}>
        <BText variant="smallMedium">
          {t(booking.customer_name || 'Guest customer')} · {booking.items.map((i) => t(i.service_name)).join('، ')}
        </BText>
        <BText variant="tiny" style={{ marginTop: 2 }}>
          {t('{date} at {time}', { date: formatDateLong(booking.starts_at), time: formatTimeOfDate(booking.starts_at) })}
          {booking.staff_name ? ` · ${t('with {name}', { name: booking.staff_name })}` : ''}
          {booking.status === 'completed' ? ` · ${t('completed')}` : ''}
          {booking.status === 'no_show' ? ` · ${t('no-show')}` : ''}
          {booking.status === 'cancelled' ? ` · ${t('cancelled')}` : ''}
        </BText>
        {/* Running behind, or the customer is. Up to 15 minutes without a full
            reschedule; the other side has to agree. */}
        {canOperate && (
          <DelayControls booking={booking} side="venue" onChanged={() => onChanged?.()} />
        )}
        {booking.notes ? (
          <BText variant="tiny" color={colors.accent} style={{ marginTop: 2 }}>
            {t('Note:')} {booking.notes}
          </BText>
        ) : null}
      </View>
      <BText variant="smallMedium">{formatPrice(booking.total_cents, booking.currency)}</BText>
      <PaymentPill
        status={booking.payment_status ?? 'unpaid'}
        escrow={
          booking.payment_status === 'paid'
            ? booking.status === 'completed' && booking.customer_confirmed_at
              ? 'released'
              : 'held'
            : undefined
        }
      />
      {canManage ? (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          <SmallPillBtn
            label={t('Complete')}
            color={colors.green}
            onPress={async () => {
              await setBookingStatus(booking.id, 'completed');
              (onRefund ?? onChanged)?.();
            }}
          />
          <SmallPillBtn
            label={t('No-show')}
            color={colors.gray}
            onPress={async () => {
              await setBookingStatus(booking.id, 'no_show');
              (onRefund ?? onChanged)?.();
            }}
          />
          <SmallPillBtn label={resched ? t('Close') : t('Reschedule')} color={colors.ink} onPress={() => setResched(!resched)} />
        </View>
      ) : null}
      {onMessage && booking.user_id ? (
        <SmallPillBtn label={t('Message')} color={colors.accent} onPress={() => onMessage(booking)} />
      ) : null}
      {resched && (
        <View style={{ width: '100%', marginTop: 10, gap: 10 }}>
          <BText variant="smallMedium">{t('Pick a new day')}</BText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {Array.from({ length: 14 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() + 1 + i);
              d.setHours(0, 0, 0, 0);
              const sel = reschedDay?.toDateString() === d.toDateString();
              return (
                <Chip
                  key={i}
                  label={formatDate(lang, d, { weekday: 'short', day: 'numeric', month: 'short' })}
                  selected={sel}
                  onPress={() => setReschedDay(d)}
                />
              );
            })}
          </ScrollView>
          {reschedDay && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {Array.from({ length: 12 }, (_, i) => {
                const slot = new Date(reschedDay);
                slot.setHours(10 + Math.floor(i / 2), (i % 2) * 30, 0, 0);
                const label = `${String(slot.getHours()).padStart(2, '0')}:${String(slot.getMinutes()).padStart(2, '0')}`;
                return <Chip key={label} label={label} onPress={() => doReschedule(slot)} />;
              })}
            </View>
          )}
        </View>
      )}
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
            {refunding ? t('Refunding…') : t('Refund')}
          </BText>
        </Pressable>
      ) : null}
    </View>
  );
}

function VenueMessages({
  venue,
  allowedUserIds,
  target,
  onTargetConsumed,
}: {
  venue: Venue;
  allowedUserIds?: string[] | null;
  target?: { userId: string; userName: string } | null;
  onTargetConsumed?: () => void;
}) {
  const { t, isRTL } = useI18n();
  const isDesktop = useIsDesktop();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);

  useEffect(() => {
    const load = () =>
      getConversationsForVenue(venue.id).then(
        (all) => setConversations(allowedUserIds ? all.filter((c) => allowedUserIds.includes(c.user_id)) : all),
        () => {}
      );
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [venue.id, allowedUserIds?.join(',')]);

  // "Message" from a booking opens (or starts) that customer's thread
  useEffect(() => {
    if (target) {
      setActive({
        venue_id: venue.id,
        venue_name: venue.name,
        user_id: target.userId,
        user_name: target.userName,
        last_text: '',
        last_at: new Date().toISOString(),
        unread: 0,
      });
      onTargetConsumed?.();
    }
  }, [target?.userId]);

  // Open the most recent conversation by default - desktop only; the phone
  // starts on the chat list, like any messaging app.
  useEffect(() => {
    if (isDesktop && !active && conversations.length) setActive(conversations[0]);
  }, [conversations.length, isDesktop]);

  // Phone: chat list -> full-screen thread with a back button
  if (!isDesktop) {
    return (
      <View style={[styles.card, { padding: 0, overflow: 'hidden', minHeight: 520 }]}>
        {active ? (
          <>
            <View style={styles.chatMobileHeader}>
              <Pressable onPress={() => setActive(null)} hitSlop={10}>
                <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={colors.ink} />
              </Pressable>
              <Avatar name={t(active.user_name || 'Customer')} size={34} />
              <BText variant="title" numberOfLines={1} style={{ flex: 1 }}>
                {t(active.user_name || 'Customer')}
              </BText>
            </View>
            <ChatThread
              venueId={venue.id}
              venueName={venue.name}
              userId={active.user_id}
              userName={active.user_name}
              perspective="venue"
            />
          </>
        ) : (
          <ScrollView>
            <ConversationList conversations={conversations} perspective="venue" onSelect={setActive} />
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.card, { padding: 0, overflow: 'hidden', minHeight: 460, flexDirection: 'row' }]}>
      <ScrollView style={{ width: 280, maxWidth: 280, flexGrow: 0, flexShrink: 0, borderRightWidth: 1, borderRightColor: colors.divider }}>
        <ConversationList
          conversations={conversations}
          perspective="venue"
          activeKey={active ? `${active.venue_id}|${active.user_id}` : null}
          onSelect={setActive}
        />
      </ScrollView>
      <View style={{ flex: 1, minWidth: 0 }}>
        {active ? (
          <ChatThread
            venueId={venue.id}
            venueName={venue.name}
            userId={active.user_id}
            userName={active.user_name}
            perspective="venue"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 }}>
            <Ionicons name="chatbubbles-outline" size={40} color={colors.grayLight} />
            <BText variant="small">{t('Select a conversation to reply to your customers.')}</BText>
          </View>
        )}
      </View>
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
  const { t, lang } = useI18n();
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const DAY = 86400000;
  const from = Date.now() - range * DAY;
  const inRange = bookings.filter((b) => new Date(b.starts_at).getTime() >= from);
  const active = inRange.filter((b) => b.status !== 'cancelled' && b.status !== 'no_show');

  // Business health for the selected range
  const revenue = active.reduce((c, b) => c + b.total_cents, 0);
  const avgTicket = active.length ? Math.round(revenue / active.length) : 0;
  const cancelRate = inRange.length ? Math.round((inRange.filter((b) => b.status === 'cancelled').length / inRange.length) * 100) : 0;
  const noShowRate = inRange.length ? Math.round((inRange.filter((b) => b.status === 'no_show').length / inRange.length) * 100) : 0;
  const clientCounts = new Map<string, number>();
  for (const b of active) {
    const key = b.user_id ?? `w:${b.customer_name ?? ''}`;
    clientCounts.set(key, (clientCounts.get(key) ?? 0) + 1);
  }
  const returningRate = clientCounts.size
    ? Math.round(([...clientCounts.values()].filter((n) => n > 1).length / clientCounts.size) * 100)
    : 0;

  // Revenue chart: daily for 7 days, weekly buckets beyond
  const days: { label: string; value: number }[] = [];
  if (range === 7) {
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      days.push({
        label: formatDate(lang, d, { weekday: 'short', day: 'numeric' }),
        value: active
          .filter((b) => new Date(b.starts_at).toDateString() === key)
          .reduce((c, b) => c + b.total_cents, 0),
      });
    }
  } else {
    const weeks = range / 7;
    for (let w = weeks - 1; w >= 0; w--) {
      const start = Date.now() - (w + 1) * 7 * DAY;
      const end = Date.now() - w * 7 * DAY;
      days.push({
        label: formatDate(lang, new Date(start), { day: 'numeric', month: 'short' }),
        value: active
          .filter((b) => {
            const ts = new Date(b.starts_at).getTime();
            return ts >= start && ts < end;
          })
          .reduce((c, b) => c + b.total_cents, 0),
      });
    }
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
    .map(([label, value]) => ({ label: t(label), value }));

  // Team performance
  const team = venue.staff.map((m) => ({
    label: m.name,
    value: active.filter((b) => b.staff_id === m.id).length,
  }));
  const anyPro = active.filter((b) => !b.staff_id).length;
  if (anyPro) team.push({ label: t('Any professional'), value: anyPro });

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {([7, 30, 90] as const).map((r) => (
          <Chip key={r} label={t('{n} days', { n: r })} selected={range === r} onPress={() => setRange(r)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label={t('Revenue')} value={formatPrice(revenue, venue.services[0]?.currency ?? 'SAR')} icon="cash-outline" />
        <StatCard label={t('Average ticket')} value={formatPrice(avgTicket, venue.services[0]?.currency ?? 'SAR')} icon="receipt-outline" />
        <StatCard label={t('Returning clients')} value={`${returningRate}%`} icon="repeat-outline" />
        <StatCard label={t('Cancellation rate')} value={`${cancelRate}%`} icon="close-circle-outline" />
        <StatCard label={t('No-show rate')} value={`${noShowRate}%`} icon="eye-off-outline" />
      </View>
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
        <View style={[styles.card, { flex: 1 }]}>
          <BText variant="h3">{range === 7 ? t('Revenue by day') : t('Revenue by week')}</BText>
          <BarChart data={days} unit="money" />
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <BText variant="h3">{t('Peak hours')}</BText>
          <BarChart data={hours} />
        </View>
      </View>
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
        <View style={[styles.card, { flex: 1 }]}>
          <BText variant="h3">{t('Top services')}</BText>
          {topServices.length ? (
            <BarChart data={topServices} />
          ) : (
            <BText variant="small" style={{ marginTop: 10 }}>
              {t('No bookings yet.')}
            </BText>
          )}
        </View>
        <View style={[styles.card, { flex: 1 }]}>
          <BText variant="h3">{t('Team performance')}</BText>
          {team.length ? (
            <BarChart data={team} />
          ) : (
            <BText variant="small" style={{ marginTop: 10 }}>
              {t('Add team members to see their bookings.')}
            </BText>
          )}
        </View>
      </View>
    </View>
  );
}

function TxStatusPill({ status }: { status: string }) {
  const { t } = useI18n();
  const map: Record<string, { label: string; color: string; bg: string }> = {
    succeeded: { label: 'Succeeded', color: colors.green, bg: colors.greenBg },
    held: { label: 'In escrow', color: colors.info, bg: colors.infoBg },
    released: { label: 'Released', color: colors.green, bg: colors.greenBg },
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

function MemberServicesEditor({
  venue,
  staffId,
  onChanged,
}: {
  venue: Venue;
  staffId: string;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const me = venue.staff.find((m) => m.id === staffId);
  const explicit = me?.service_ids ?? [];
  const providesAll = explicit.length === 0;
  const providedSet = new Set(providesAll ? venue.services.map((s) => s.id) : explicit);

  const [savingId, setSavingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [group, setGroup] = useState('Featured');
  const [duration, setDuration] = useState('60');
  const [price, setPrice] = useState('');
  const [adding, setAdding] = useState(false);

  const toggle = async (id: string) => {
    const next = new Set(providedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSavingId(id);
    // An empty list means "provides everything"; keep that shorthand when the
    // member has (re)selected every service.
    const list = next.size === venue.services.length ? [] : [...next];
    await setStaffServices(staffId, list);
    setSavingId(null);
    onChanged();
  };

  const addNew = async () => {
    if (!name.trim() || !price.trim()) return;
    setAdding(true);
    const beforeIds = new Set(venue.services.map((s) => s.id));
    const updated = await addService(venue, {
      name: name.trim(),
      group_name: group.trim() || 'Featured',
      duration_minutes: Math.max(5, parseInt(duration, 10) || 30),
      price_cents: Math.round(parseFloat(price) * 100),
    });
    // Assign the newly created service to this member (unless they already
    // provide everything, in which case it's covered automatically).
    if (!providesAll) {
      const added = updated.services.find((s) => !beforeIds.has(s.id));
      if (added) await setStaffServices(staffId, [...explicit, added.id]);
    }
    setName('');
    setPrice('');
    setDuration('60');
    setGroup('Featured');
    setAdding(false);
    onChanged();
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <BText variant="h3">{t('Add a service')}</BText>
        <BText variant="tiny" style={{ marginTop: 4 }}>
          {t('New services join the salon menu and are added to the ones you provide.')}
        </BText>
        <View style={{ gap: 12, marginTop: 16 }}>
          <Field label={t('Service name')} placeholder={t('e.g. Gel Manicure')} value={name} onChangeText={setName} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label={t('Group')} placeholder={t('Featured')} value={group} onChangeText={setGroup} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('Duration (min)')} keyboardType="numeric" value={duration} onChangeText={setDuration} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('Price')} keyboardType="numeric" placeholder="150" value={price} onChangeText={setPrice} />
            </View>
          </View>
          <View style={{ flexDirection: 'row' }}>
            <Button title={t('Add service')} loading={adding} onPress={addNew} />
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <BText variant="h3">{t('Services you provide')}</BText>
        <BText variant="tiny" style={{ marginTop: 4 }}>
          {t('Tap to choose which services you can be booked for.')}
        </BText>
        <View style={{ marginTop: 8 }}>
          {venue.services.map((sv) => {
            const on = providedSet.has(sv.id);
            return (
              <Pressable key={sv.id} onPress={() => toggle(sv.id)} disabled={savingId === sv.id} style={styles.tableRow}>
                <View style={{ flex: 1 }}>
                  <BText variant="smallMedium">{t(sv.name)}</BText>
                  <BText variant="tiny">
                    {t(sv.group_name)} · {formatDuration(sv.duration_minutes)} · {formatPrice(sv.price_cents, sv.currency)}
                  </BText>
                </View>
                <Ionicons
                  name={on ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={on ? colors.accent : colors.gray}
                />
              </Pressable>
            );
          })}
          {venue.services.length === 0 && (
            <BText variant="small" style={{ marginTop: 10 }}>
              {t('No services yet - add your first one above.')}
            </BText>
          )}
        </View>
      </View>
    </View>
  );
}

function PackagesEditor({ venue, onChanged }: { venue: Venue; onChanged: () => void }) {
  const { t } = useI18n();
  const packages = venue.packages ?? [];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [desc, setDesc] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [price, setPrice] = useState('');
  const [wasPrice, setWasPrice] = useState('');
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) =>
    setServiceIds((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const reset = () => {
    setEditingId(null);
    setName('');
    setNameAr('');
    setDesc('');
    setServiceIds([]);
    setPrice('');
    setWasPrice('');
  };

  const startEdit = (p: NonNullable<Venue['packages']>[number]) => {
    setEditingId(p.id);
    setName(p.name);
    setNameAr(p.name_ar ?? '');
    setDesc(p.description ?? '');
    setServiceIds(p.service_ids ?? []);
    setPrice(String(p.price_cents / 100));
    setWasPrice(p.original_price_cents ? String(p.original_price_cents / 100) : '');
  };

  const save = async () => {
    if (!name.trim() || !price.trim() || serviceIds.length === 0) return;
    setBusy(true);
    // The bundle's duration is the sum of its services
    const duration = venue.services
      .filter((s) => serviceIds.includes(s.id))
      .reduce((c, s) => c + s.duration_minutes, 0);
    const payload = {
      name: name.trim(),
      name_ar: nameAr.trim() || null,
      description: desc.trim(),
      service_ids: serviceIds,
      duration_minutes: Math.max(15, duration),
      price_cents: Math.round(parseFloat(price) * 100),
      original_price_cents: wasPrice.trim() ? Math.round(parseFloat(wasPrice) * 100) : null,
    };
    if (editingId) await updatePackage(editingId, payload);
    else await addPackage(venue, payload);
    reset();
    setBusy(false);
    onChanged();
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <BText variant="h3">{editingId ? t('Edit package') : t('Create a package')}</BText>
        <BText variant="tiny" style={{ marginTop: 4 }}>
          {t('Bundle a few services at one price. Customers book the whole package in one tap.')}
        </BText>
        <View style={{ gap: 12, marginTop: 16 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label={t('Package name')} placeholder={t('e.g. Bridal Glow')} value={name} onChangeText={setName} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('Name in Arabic')} value={nameAr} onChangeText={setNameAr} />
            </View>
          </View>
          <Field label={t('Description')} placeholder={t('What is included')} value={desc} onChangeText={setDesc} />
          <View style={{ gap: 6 }}>
            <BText variant="smallMedium">{t('Services in this package')}</BText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {venue.services.map((sv) => (
                <Chip key={sv.id} label={t(sv.name)} selected={serviceIds.includes(sv.id)} onPress={() => toggle(sv.id)} />
              ))}
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label={t('Package price')} keyboardType="numeric" placeholder="450" value={price} onChangeText={setPrice} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('Original price (optional)')} keyboardType="numeric" placeholder="600" value={wasPrice} onChangeText={setWasPrice} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title={editingId ? t('Save changes') : t('Add package')} loading={busy} onPress={save} />
            {editingId ? <Button title={t('Cancel')} variant="secondary" onPress={reset} /> : null}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <BText variant="h3">{t('Your packages ({n})', { n: packages.length })}</BText>
        {packages.map((p) => (
          <View key={p.id} style={styles.bookingRow}>
            <View style={{ flex: 1 }}>
              <BText variant="smallMedium">{t(p.name)}</BText>
              <BText variant="tiny">
                {p.service_ids.length === 1 ? t('1 service') : t('{n} services', { n: p.service_ids.length })} ·{' '}
                {formatDuration(p.duration_minutes)} · {formatPrice(p.price_cents, p.currency)}
                {p.original_price_cents ? ` · ${t('was {price}', { price: formatPrice(p.original_price_cents, p.currency) })}` : ''}
              </BText>
            </View>
            <Pressable onPress={() => startEdit(p)} hitSlop={8}>
              <Ionicons name="pencil-outline" size={18} color={colors.ink} />
            </Pressable>
            <Pressable
              onPress={async () => {
                await deletePackage(p.id);
                if (editingId === p.id) reset();
                onChanged();
              }}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </View>
        ))}
        {packages.length === 0 && (
          <BText variant="small" style={{ marginTop: 10 }}>
            {t('No packages yet. Bundle your popular services to sell more.')}
          </BText>
        )}
      </View>
    </View>
  );
}

function ServicesEditor({ venue, onChanged }: { venue: Venue; onChanged: () => void }) {
  const { t } = useI18n();
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
        <BText variant="h3">{editingId ? t('Edit service') : t('Add a service')}</BText>
        <View style={{ gap: 12, marginTop: 16 }}>
          <Field label={t('Service name')} placeholder={t('e.g. Gel Manicure')} value={name} onChangeText={setName} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label={t('Group')} placeholder={t('Featured')} value={group} onChangeText={setGroup} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('Duration (min)')} keyboardType="numeric" value={duration} onChangeText={setDuration} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('Price')} keyboardType="numeric" placeholder="150" value={price} onChangeText={setPrice} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('Discount %')} keyboardType="numeric" value={discount} onChangeText={setDiscount} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title={editingId ? t('Save changes') : t('Add service')} loading={busy} onPress={save} />
            {editingId ? <Button title={t('Cancel')} variant="secondary" onPress={resetForm} /> : null}
          </View>
        </View>
      </View>
      <View style={styles.card}>
        <BText variant="h3">{t('Your services ({n})', { n: venue.services.length })}</BText>
        {venue.services.map((s) => (
          <View key={s.id} style={styles.bookingRow}>
            <View style={{ flex: 1 }}>
              <BText variant="smallMedium">{t(s.name)}</BText>
              <BText variant="tiny">
                {t(s.group_name)} · {formatDuration(s.duration_minutes)} · {formatPrice(s.price_cents, s.currency)}
                {s.discount_pct ? ` · ${t('{pct}% off', { pct: s.discount_pct })}` : ''}
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
            {t('Add your first service so customers can book you.')}
          </BText>
        )}
      </View>
    </View>
  );
}

function StaffEditor({
  venue,
  onChanged,
  onViewAs,
}: {
  venue: Venue;
  onChanged: () => void;
  onViewAs?: (m: Venue['staff'][number]) => void;
}) {
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [venueRole, setVenueRole] = useState<'manager' | 'member'>('member');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [hoursFor, setHoursFor] = useState<Venue['staff'][number] | null>(null);
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const toggleServiceId = (id: string) =>
    setServiceIds((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setRole('');
    setEmail('');
    setVenueRole('member');
    setServiceIds([]);
  };

  const startEdit = (m: Venue['staff'][number]) => {
    setEditingId(m.id);
    setName(m.name);
    setRole(m.role);
    setEmail(m.email ?? '');
    setVenueRole(m.venue_role ?? 'member');
    setServiceIds(m.service_ids ?? []);
  };

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    let staffId = editingId;
    if (editingId) {
      await updateStaff(venue, editingId, {
        name: name.trim(),
        role: role.trim() || 'Specialist',
        email: email.trim() || null,
        venue_role: venueRole,
      });
    } else {
      const updated = await addStaff(venue, name.trim(), role.trim() || 'Specialist', email.trim() || null, venueRole);
      staffId = updated.staff[updated.staff.length - 1]?.id ?? null;
    }
    if (staffId) await setStaffServices(staffId, serviceIds);
    resetForm();
    setBusy(false);
    onChanged();
  };

  const sendInvite = async (staffId: string) => {
    setInviting(staffId);
    setInviteError(null);
    const err = await inviteTeamMember(staffId);
    setInviting(null);
    if (err) setInviteError(err);
    else onChanged();
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <BText variant="h3">{editingId ? t('Edit team member') : t('Add a team member')}</BText>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
          <View style={{ flex: 1 }}>
            <Field label={t('Name')} placeholder={t('e.g. Sara')} value={name} onChangeText={setName} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t('Role')} placeholder={t('Stylist')} value={role} onChangeText={setRole} />
          </View>
        </View>
        <View style={{ marginTop: 12 }}>
          <Field
            label={t('Email (for their own sign-in)')}
            placeholder="team@salon.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        <View style={{ gap: 6, marginTop: 12 }}>
          <BText variant="smallMedium">{t('Access level')}</BText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label={t('Team member - sees only their own work')} selected={venueRole === 'member'} onPress={() => setVenueRole('member')} />
            <Chip label={t('Manager - sees everything')} selected={venueRole === 'manager'} onPress={() => setVenueRole('manager')} />
          </View>
        </View>
        {venue.services.length > 0 && (
          <View style={{ gap: 6, marginTop: 12 }}>
            <BText variant="smallMedium">{t('Services they provide')}</BText>
            <BText variant="tiny">{t('Leave empty if they can be booked for any service.')}</BText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {venue.services.map((sv) => (
                <Chip key={sv.id} label={t(sv.name)} selected={serviceIds.includes(sv.id)} onPress={() => toggleServiceId(sv.id)} />
              ))}
            </View>
          </View>
        )}
        {inviteError ? (
          <BText variant="small" color={colors.danger} style={{ marginTop: 10 }}>
            {inviteError}
          </BText>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Button title={editingId ? t('Save') : t('Add')} loading={busy} onPress={save} />
          {editingId ? <Button title={t('Cancel')} variant="secondary" onPress={resetForm} /> : null}
        </View>
      </View>
      <View style={styles.card}>
        <BText variant="h3">{t('Your team ({n})', { n: venue.staff.length })}</BText>
        {venue.staff.map((m) => (
          <View key={m.id} style={styles.bookingRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BText variant="smallMedium">{m.name}</BText>
                {m.venue_role === 'manager' && (
                  <View style={{ backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <BText style={{ fontFamily: font.semibold, fontSize: 11, color: colors.accent }}>{t('Manager')}</BText>
                  </View>
                )}
                {m.invite_status === 'invited' && (
                  <View style={{ backgroundColor: colors.warningBg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <BText style={{ fontFamily: font.semibold, fontSize: 11, color: colors.warning }}>{t('Invited')}</BText>
                  </View>
                )}
                {m.invite_status === 'joined' && (
                  <View style={{ backgroundColor: colors.greenBg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <BText style={{ fontFamily: font.semibold, fontSize: 11, color: colors.green }}>{t('Has account')}</BText>
                  </View>
                )}
              </View>
              <BText variant="tiny">
                {m.role}
                {m.email ? ` · ${m.email}` : ''}
              </BText>
            </View>
            {m.email && !m.user_id ? (
              <SmallPillBtn
                label={inviting === m.id ? t('Sending…') : t('Email invite')}
                color={colors.accent}
                onPress={() => sendInvite(m.id)}
              />
            ) : null}
            {onViewAs ? (
              <SmallPillBtn label={t('View as')} color={colors.info} onPress={() => onViewAs(m)} />
            ) : null}
            <Pressable onPress={() => setHoursFor(m)} hitSlop={8} accessibilityLabel={t('Working hours')}>
              <Ionicons name="time-outline" size={18} color={colors.ink} />
            </Pressable>
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
            {t('Add your team so clients can choose their favorite professional.')}
          </BText>
        )}
      </View>
      <StaffHoursModal member={hoursFor} onClose={() => setHoursFor(null)} onSaved={onChanged} />
    </View>
  );
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function StaffHoursModal({
  member,
  onClose,
  onSaved,
}: {
  member: Venue['staff'][number] | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<{ open: string; close: string; off: boolean }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!member) return;
    const existing = member.hours ?? [];
    setRows(
      Array.from({ length: 7 }, (_, wd) => {
        const h = existing.find((x) => x.weekday === wd);
        return {
          open: h?.open_time?.slice(0, 5) ?? '10:00',
          close: h?.close_time?.slice(0, 5) ?? '20:00',
          off: h ? h.is_off : false,
        };
      })
    );
  }, [member?.id]);

  const save = async () => {
    if (!member) return;
    setBusy(true);
    await setStaffHours(
      member.id,
      rows.map((r, wd) => ({
        weekday: wd,
        open_time: r.off ? null : `${r.open}:00`,
        close_time: r.off ? null : `${r.close}:00`,
        is_off: r.off,
      }))
    );
    setBusy(false);
    onSaved();
    onClose();
  };

  return (
    <Modal visible={!!member} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.chatBackdrop}>
        <View style={[styles.card, { width: '100%', maxWidth: 460, maxHeight: '85%' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <BText variant="h3" style={{ flex: 1 }}>
              {t('Working hours')}{member ? ` - ${t(member.name)}` : ''}
            </BText>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView>
            {rows.map((r, wd) => (
              <View key={wd} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                <BText variant="smallMedium" style={{ width: 84 }}>
                  {t(WEEKDAYS[wd])}
                </BText>
                {r.off ? (
                  <BText variant="small" style={{ flex: 1 }} color={colors.gray}>
                    {t('Day off')}
                  </BText>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <TextInput
                      value={r.open}
                      onChangeText={(v: string) => setRows((rs) => rs.map((x, i) => (i === wd ? { ...x, open: v } : x)))}
                      style={styles.hoursInput}
                      placeholder="10:00"
                      placeholderTextColor={colors.gray}
                    />
                    <BText variant="small">-</BText>
                    <TextInput
                      value={r.close}
                      onChangeText={(v: string) => setRows((rs) => rs.map((x, i) => (i === wd ? { ...x, close: v } : x)))}
                      style={styles.hoursInput}
                      placeholder="20:00"
                      placeholderTextColor={colors.gray}
                    />
                  </View>
                )}
                <Chip
                  label={r.off ? t('Closed') : t('Open')}
                  selected={!r.off}
                  onPress={() => setRows((rs) => rs.map((x, i) => (i === wd ? { ...x, off: !x.off } : x)))}
                />
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Button title={t('Save changes')} loading={busy} onPress={save} />
            <Button title={t('Cancel')} variant="secondary" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
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

function Collapse({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
      <Pressable
        onPress={onToggle}
        style={({ hovered }: any) => [styles.collapseHeader, hovered && { backgroundColor: colors.bgPage }]}
      >
        <View style={{ flex: 1 }}>
          <BText variant="title">{title}</BText>
          {subtitle ? (
            <BText variant="tiny" style={{ marginTop: 2 }}>
              {subtitle}
            </BText>
          ) : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.gray} />
      </Pressable>
      {open && <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>{children}</View>}
    </View>
  );
}

function SettingsEditor({ venue, onChanged }: { venue: Venue; onChanged: () => void }) {
  const { t } = useI18n();
  const { categories } = useAppData();
  const [name, setName] = useState(venue.name);
  const [description, setDescription] = useState(venue.description);
  const [address, setAddress] = useState(venue.address);
  const [area, setArea] = useState(venue.area);
  const [city, setCity] = useState(venue.city);
  const [categoryId, setCategoryId] = useState(venue.category_id);
  const [mapsUrl, setMapsUrl] = useState(venue.maps_url ?? '');
  const [highlights, setHighlights] = useState<string[]>(venue.highlights);
  const [cancelPolicy, setCancelPolicy] = useState(venue.cancellation_policy ?? '');
  const [cancelFee, setCancelFee] = useState(String(venue.cancellation_fee_pct ?? 0));
  const [deposit, setDeposit] = useState(venue.deposit_cents ? String(venue.deposit_cents / 100) : '');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState<string>('details');
  const toggle = (key: string) => setOpen((cur) => (cur === key ? '' : key));

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
      maps_url: mapsUrl.trim() || null,
      highlights,
      cancellation_policy: cancelPolicy.trim(),
      cancellation_fee_pct: Math.min(100, Math.max(0, parseInt(cancelFee, 10) || 0)),
      deposit_cents: Math.max(0, Math.round((parseFloat(deposit) || 0) * 100)),
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onChanged();
  };

  const saveBtn = <Button title={saved ? t('Saved ✓') : t('Save changes')} loading={busy} onPress={save} />;

  return (
    <View style={{ gap: 12 }}>
      <Collapse title={t('Business details')} subtitle={t('Name, about and category')} open={open === 'details'} onToggle={() => toggle('details')}>
        <View style={{ gap: 12 }}>
          <Field label={t('Business name')} value={name} onChangeText={setName} />
          <Field
            label={t('About')}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={{ minHeight: 100 }}
          />
          <View style={{ gap: 6 }}>
            <BText variant="smallMedium">{t('Category')}</BText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {categories.map((c) => (
                <Chip key={c.id} label={t(c.name)} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
              ))}
            </View>
          </View>
          {saveBtn}
        </View>
      </Collapse>

      <Collapse title={t('Location')} subtitle={t('Address and directions')} open={open === 'location'} onToggle={() => toggle('location')}>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label={t('City')} value={city} onChangeText={setCity} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('Area')} value={area} onChangeText={setArea} />
            </View>
          </View>
          <Field label={t('Street address')} value={address} onChangeText={setAddress} />
          <Field
            label={t('Google Maps link')}
            placeholder="https://maps.app.goo.gl/…"
            value={mapsUrl}
            onChangeText={setMapsUrl}
            autoCapitalize="none"
          />
          {saveBtn}
        </View>
      </Collapse>

      <Collapse
        title={t('Booking policies')}
        subtitle={t('Cancellation rules and reservation deposit')}
        open={open === 'policies'}
        onToggle={() => toggle('policies')}
      >
        <View style={{ gap: 12 }}>
          <Field
            label={t('Cancellation policy')}
            placeholder={t('e.g. Free cancellation up to 24 hours before your appointment.')}
            value={cancelPolicy}
            onChangeText={setCancelPolicy}
            multiline
            numberOfLines={3}
            style={{ minHeight: 80 }}
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Field label={t('Cancellation fee (% of paid amount)')} keyboardType="numeric" value={cancelFee} onChangeText={setCancelFee} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('Reservation deposit (SAR)')} keyboardType="numeric" placeholder="0" value={deposit} onChangeText={setDeposit} />
            </View>
          </View>
          <BText variant="tiny">
            {t('The deposit is charged when customers reserve with “pay at venue” and is held in escrow like any online payment. Set 0 to disable.')}
          </BText>
          {saveBtn}
        </View>
      </Collapse>

      <Collapse title={t('Amenities')} subtitle={t('Shown on your public page')} open={open === 'amenities'} onToggle={() => toggle('amenities')}>
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {HIGHLIGHT_OPTIONS.map((h) => (
              <Chip key={h} label={t(h)} selected={highlights.includes(h)} onPress={() => toggleHighlight(h)} />
            ))}
          </View>
          {saveBtn}
        </View>
      </Collapse>

      <Collapse title={t('Opening hours')} subtitle={t('Weekly schedule')} open={open === 'hours'} onToggle={() => toggle('hours')}>
        <HoursEditor venue={venue} onChanged={onChanged} />
      </Collapse>

      <Collapse title={t('Gallery')} subtitle={t('Photos on your page')} open={open === 'gallery'} onToggle={() => toggle('gallery')}>
        <GalleryEditor venue={venue} onChanged={onChanged} />
      </Collapse>
    </View>
  );
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function HoursEditor({ venue, onChanged }: { venue: Venue; onChanged: () => void }) {
  const { t } = useI18n();
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
      <BText variant="h3">{t('Opening hours')}</BText>
      <View style={{ gap: 10, marginTop: 16 }}>
        {[1, 2, 3, 4, 5, 6, 0].map((w) => {
          const h = hours.find((x) => x.weekday === w)!;
          return (
            <View key={w} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BText variant="smallMedium" style={{ width: 92 }}>
                {t(WEEKDAY_NAMES[w])}
              </BText>
              {h.is_closed ? (
                <BText variant="small" style={{ flex: 1 }}>
                  {t('Closed')}
                </BText>
              ) : (
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Field
                    value={h.open_time ?? '10:00'}
                    onChangeText={(v) => patch(w, { open_time: v })}
                    style={{ minHeight: 38, width: 74, paddingHorizontal: 8 }}
                  />
                  <BText variant="tiny">{t('to')}</BText>
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
                  {h.is_closed ? t('Open this day') : t('Mark closed')}
                </BText>
              </Pressable>
            </View>
          );
        })}
      </View>
      <View style={{ marginTop: 16, alignItems: 'flex-start' }}>
        <Button title={saved ? t('Saved ✓') : t('Save hours')} size="sm" loading={busy} onPress={save} />
      </View>
    </View>
  );
}

function GalleryEditor({ venue, onChanged }: { venue: Venue; onChanged: () => void }) {
  const { t } = useI18n();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  return (
    <View style={[styles.card, { marginTop: 16 }]}>
      <BText variant="h3">{t('Gallery ({n})', { n: venue.images.length })}</BText>
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
      <BText variant="tiny" style={{ marginTop: 10 }}>
        {t('Photos must not show people, faces or body parts - interiors, tools and products only.')}
      </BText>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <Button
          title={t('Upload photo')}
          size="sm"
          variant="secondary"
          loading={uploading}
          onPress={async () => {
            const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
            if (res.canceled || !res.assets?.[0]?.uri) return;
            setUploading(true);
            const url = await uploadVenuePhoto(res.assets[0].uri);
            if (url) {
              await addVenueImage(venue, url);
              onChanged();
            }
            setUploading(false);
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Field label={t('Image URL')} placeholder="https://…" value={url} onChangeText={setUrl} autoCapitalize="none" />
        </View>
        <Button
          title={t('Add photo')}
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
  chatBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,17,17,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  hoursInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    height: 38,
    width: 64,
    textAlign: 'center',
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.ink,
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
  chatMobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.bgPage,
  },
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
  bizTag: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  contentWrap: {
    width: '100%',
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  sidebar: {
    width: 250,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  venueBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    marginHorizontal: 12,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.bgPage,
  },
  navGroupTitle: {
    fontFamily: font.semibold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.gray,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sideNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    marginHorizontal: 12,
    height: 40,
    borderRadius: radius.md,
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingVertical: 10,
    gap: 2,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    height: 36,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    paddingHorizontal: 28,
    paddingBottom: 14,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 40,
  },
  weekCol: {
    width: 148,
    gap: 6,
  },
  weekBlock: {
    backgroundColor: colors.accentSoft,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  clientHistory: {
    backgroundColor: colors.bgPage,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 10,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  reviewRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  topNav: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  topNavRow: { flexDirection: 'row', gap: 8 },
  topNavScroll: { marginBottom: 16, flexGrow: 0 },
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
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  emulateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: 4,
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
  escrowExplain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
    padding: 12,
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
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
});
