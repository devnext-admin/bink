import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatThread, ConversationList } from '../../components/chat';
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
} from '../../lib/business';
import { formatDateLong, formatDuration, formatPrice, formatTimeOfDate } from '../../lib/format';
import { formatDate, useI18n } from '../../lib/i18n';
import { Conversation, getConversationsForVenue } from '../../lib/messages';
import { rescheduleBooking, setBookingStatus } from '../../lib/ops';
import { pushNotification } from '../../lib/notifications';
import { escrowSummary, getVenueTransactions, refundBooking, salesSummary } from '../../lib/payments';
import { colors, font, radius } from '../../lib/theme';
import type { Booking, Transaction, Venue } from '../../lib/types';
import { useIsDesktop } from '../../lib/use-layout';

type Section = 'overview' | 'bookings' | 'messages' | 'sales' | 'analytics' | 'services' | 'staff' | 'settings';
const SECTIONS: { key: Section; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: 'grid-outline' },
  { key: 'bookings', label: 'Bookings', icon: 'calendar-outline' },
  { key: 'messages', label: 'Messages', icon: 'chatbubble-ellipses-outline' },
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
  const { t } = useI18n();
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
        .then(setStaffAccess)
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
  const access: 'owner' | 'admin' | 'manager' | 'member' = !venue
    ? 'owner'
    : emulated && venue.id === emulated.id
      ? 'admin'
      : venue.owner_id === user?.id
        ? 'owner'
        : staffAccess.find((a) => a.venueId === venue.id)?.venueRole === 'manager'
          ? 'manager'
          : 'member';
  const canManage = access !== 'member';
  const memberStaffId = access === 'member'
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
  const openChatWith = (b: Booking) => {
    if (!b.user_id) return;
    setMessageTarget({ userId: b.user_id, userName: b.customer_name ?? t('Customer') });
    setSection('messages');
  };

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

  if (loading || (user && !staffLoaded)) return null;

  if (!user || accessibleVenues.length === 0) {
    return (
      <View style={[styles.emptyWrap, { paddingTop: insets.top + 40 }]}>
        <Logo />
        <BText variant="h2" style={{ marginTop: 32 }}>
          {t('No business yet')}
        </BText>
        <BText variant="small" style={{ marginTop: 8, textAlign: 'center', maxWidth: 320 }}>
          {user
            ? t('List your salon on Bink to get your business dashboard.')
            : t('Log in and list your salon to get your business dashboard.')}
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
    body = (
      <View style={{ gap: 24 }}>
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
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
          <StatCard label={t('Upcoming bookings')} value={String(upcoming.length)} icon="calendar-outline" />
          <StatCard label={t('Total revenue')} value={formatPrice(revenue, currency)} icon="cash-outline" />
          <StatCard
            label={t('Rating')}
            value={venue!.rating_count ? `${venue!.rating_avg.toFixed(1)} ★` : t('No reviews yet')}
            icon="star-outline"
          />
          <StatCard label={t('Services listed')} value={String(venue!.services.length)} icon="pricetags-outline" />
        </View>
        <View style={styles.card}>
          <BText variant="h3">{t('Next appointments')}</BText>
          {upcoming.length === 0 ? (
            <BText variant="small" style={{ marginTop: 10 }}>
              {t('Nothing booked yet. Share your Bink page to start filling the calendar.')}
            </BText>
          ) : (
            upcoming.slice(0, 5).map((b) => <BookingRow key={b.id} booking={b} venue={venue!} onMessage={openChatWith} onChanged={reload} />)
          )}
        </View>
        <View style={styles.card}>
          <BText variant="h3">{t('Your public page')}</BText>
          <BText variant="small" style={{ marginTop: 6 }}>
            bink.app/venue/{venue!.slug}
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
    );
  } else if (section === 'bookings') {
    body = (
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
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 12 }}>
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
                    {tx.customer_name || t('Customer')} ·{' '}
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
    } else {
      const me = venue!.staff.find((m) => m.id === memberStaffId);
      const mine = (me?.service_ids?.length
        ? venue!.services.filter((sv) => me.service_ids!.includes(sv.id))
        : venue!.services);
      body = (
        <View style={styles.card}>
          <BText variant="h3">{t('Services you provide')}</BText>
          {!me?.service_ids?.length && (
            <BText variant="tiny" style={{ marginTop: 4 }}>
              {t('No specific services assigned yet — you can be booked for any service.')}
            </BText>
          )}
          {mine.map((sv) => (
            <View key={sv.id} style={styles.bookingRow}>
              <View style={{ flex: 1 }}>
                <BText variant="smallMedium">{sv.name}</BText>
                <BText variant="tiny">
                  {sv.group_name} · {formatDuration(sv.duration_minutes)} · {formatPrice(sv.price_cents, sv.currency)}
                </BText>
              </View>
            </View>
          ))}
        </View>
      );
    }
  } else if (section === 'staff') {
    body = <StaffEditor venue={venue!} onChanged={reload} />;
  } else {
    body = <SettingsEditor venue={venue!} onChanged={reload} />;
  }

  const memberSections: Section[] = ['bookings', 'messages', 'services'];
  const nav = (
    <View style={isDesktop ? styles.sideNav : styles.topNav}>
      {SECTIONS.filter((s) => canManage || memberSections.includes(s.key)).map((s) => {
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
              {t(s.label)}
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
              <BText style={{ fontFamily: font.bold, fontSize: 11, color: colors.accent }}>{t('BUSINESS')}</BText>
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
                  {t('Admin view — you are managing this business on behalf of its owner.')}
                </BText>
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
          {booking.customer_name || t('Guest customer')} · {booking.items.map((i) => i.service_name).join(', ')}
        </BText>
        <BText variant="tiny" style={{ marginTop: 2 }}>
          {t('{date} at {time}', { date: formatDateLong(booking.starts_at), time: formatTimeOfDate(booking.starts_at) })}
          {booking.staff_name ? ` · ${t('with {name}', { name: booking.staff_name })}` : ''}
          {booking.status === 'completed' ? ` · ${t('completed')}` : ''}
          {booking.status === 'no_show' ? ` · ${t('no-show')}` : ''}
          {booking.status === 'cancelled' ? ` · ${t('cancelled')}` : ''}
        </BText>
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
  const { t } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);

  useEffect(() => {
    const load = () =>
      getConversationsForVenue(venue.id).then((all) =>
        setConversations(allowedUserIds ? all.filter((c) => allowedUserIds.includes(c.user_id)) : all)
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

  // Open the most recent conversation by default
  useEffect(() => {
    if (!active && conversations.length) setActive(conversations[0]);
  }, [conversations.length]);

  return (
    <View style={[styles.card, { padding: 0, overflow: 'hidden', minHeight: 460, flexDirection: 'row' }]}>
      <ScrollView style={{ width: 300, borderRightWidth: 1, borderRightColor: colors.divider }}>
        <ConversationList
          conversations={conversations}
          perspective="venue"
          activeKey={active ? `${active.venue_id}|${active.user_id}` : null}
          onSelect={setActive}
        />
      </ScrollView>
      <View style={{ flex: 1 }}>
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
  const active = bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'no_show');

  // Revenue: last 7 days
  const days: { label: string; value: number }[] = [];
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
  if (anyPro) team.push({ label: t('Any professional'), value: anyPro });

  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
        <View style={[styles.card, { flex: 1 }]}>
          <BText variant="h3">{t('Revenue — last 7 days')}</BText>
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
              <BText variant="smallMedium">{s.name}</BText>
              <BText variant="tiny">
                {s.group_name} · {formatDuration(s.duration_minutes)} · {formatPrice(s.price_cents, s.currency)}
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

function StaffEditor({ venue, onChanged }: { venue: Venue; onChanged: () => void }) {
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [venueRole, setVenueRole] = useState<'manager' | 'member'>('member');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
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
            <Chip label={t('Team member — sees only their own work')} selected={venueRole === 'member'} onPress={() => setVenueRole('member')} />
            <Chip label={t('Manager — sees everything')} selected={venueRole === 'manager'} onPress={() => setVenueRole('manager')} />
          </View>
        </View>
        {venue.services.length > 0 && (
          <View style={{ gap: 6, marginTop: 12 }}>
            <BText variant="smallMedium">{t('Services they provide')}</BText>
            <BText variant="tiny">{t('Leave empty if they can be booked for any service.')}</BText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {venue.services.map((sv) => (
                <Chip key={sv.id} label={sv.name} selected={serviceIds.includes(sv.id)} onPress={() => toggleServiceId(sv.id)} />
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
    backgroundColor: colors.white,
    paddingHorizontal: 24,
  },
});
