import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountLayout } from '../components/account-layout';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { SignInGate } from '../components/signin-gate';
import { PaymentPill } from '../components/payment-pill';
import { Button } from '../components/ui/button';
import { Chip } from '../components/ui/chip';
import { BText } from '../components/ui/text';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '../components/web-header';
import { useAppData } from '../lib/app-data-context';
import { useAuth } from '../lib/auth-context';
import { cancelBooking, getBookings } from '../lib/data';
import { formatPrice, formatTimeOfDate } from '../lib/format';
import { formatDate, useI18n, type Lang } from '../lib/i18n';
import { rescheduleBooking, submitReview } from '../lib/ops';
import { confirmServiceByCustomer } from '../lib/payments';
import { colors, font, radius } from '../lib/theme';
import type { Booking } from '../lib/types';
import { useIsDesktop } from '../lib/use-layout';

const RESCHEDULE_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const minutes = 10 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

function nextDays(count: number, lang: Lang) {
  const out: { date: string; label: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      label: formatDate(lang, d, { weekday: 'short', day: 'numeric', month: 'short' }),
    });
  }
  return out;
}

export default function Appointments() {
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang } = useI18n();
  const { allVenues } = useAppData();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [loaded, setLoaded] = useState(false);
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [reschedDate, setReschedDate] = useState<string | null>(null);
  const [rateBooking, setRateBooking] = useState<Booking | null>(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const refresh = useCallback(() => {
    getBookings(user?.id ?? null).then((b) => {
      setBookings(b);
      setLoaded(true);
    }, () => setLoaded(true));
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const now = Date.now();
  const isPast = (b: Booking) =>
    new Date(b.starts_at).getTime() < now ||
    b.status === 'cancelled' ||
    b.status === 'completed' ||
    b.status === 'no_show';
  const visible = bookings.filter((b) => (filter === 'upcoming' ? !isPast(b) : isPast(b)));

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    await cancelBooking(cancelTarget.id);
    setCancelling(false);
    setCancelTarget(null);
    refresh();
  };
  const onCancel = (id: string) => {
    const b = bookings.find((x) => x.id === id);
    if (b) setCancelTarget(b);
  };

  const onReschedule = async (booking: Booking, time: string) => {
    const [h, m] = time.split(':').map(Number);
    const [y, mo, d] = reschedDate!.split('-').map(Number);
    const duration = booking.items.reduce((s, i) => s + i.duration_minutes, 0) || 60;
    await rescheduleBooking(booking.id, new Date(y, mo - 1, d, h, m), duration);
    setReschedId(null);
    setReschedDate(null);
    refresh();
  };

  const onSubmitReview = async () => {
    if (!rateBooking) return;
    const venue = allVenues.find((v) => v.id === rateBooking.venue_id);
    if (!venue) return;
    setSavingReview(true);
    await submitReview({
      venue,
      bookingId: rateBooking.id,
      authorName: user?.name ?? 'Guest',
      userId: user?.id ?? null,
      rating: stars,
      comment: comment.trim(),
    });
    setSavingReview(false);
    setRateBooking(null);
    setComment('');
    setStars(5);
    refresh();
  };

  const list = (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label={t('Upcoming')} selected={filter === 'upcoming'} onPress={() => setFilter('upcoming')} />
        <Chip label={t('Past')} selected={filter === 'past'} onPress={() => setFilter('past')} />
      </View>

      {loaded && visible.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={44} color={colors.grayLight} />
          <BText variant="h3" style={{ marginTop: 16 }}>
            {filter === 'upcoming' ? t('No upcoming appointments') : t('No past appointments')}
          </BText>
          <BText variant="small" style={{ marginTop: 6, textAlign: 'center' }}>
            {t('When you book a treatment it will show up here.')}
          </BText>
          <View style={{ marginTop: 20 }}>
            <Button title={t('Find a salon')} onPress={() => router.push('/search')} />
          </View>
        </View>
      ) : (
        visible.map((b) => (
          <View key={b.id} style={styles.card}>
            <View style={{ flexDirection: 'row', gap: 14 }}>
              {b.venue_image ? (
                <Image
                  source={{ uri: b.venue_image }}
                  style={{ width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.bgSubtle }}
                  contentFit="cover"
                />
              ) : null}
              <View style={{ flex: 1, gap: 4 }}>
                <BText variant="title" numberOfLines={2}>{b.venue_name}</BText>
                <BText variant="small" numberOfLines={1}>{b.venue_area}</BText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                  <StatusPill status={b.status} />
                  <PaymentPill
                    status={b.payment_status ?? 'unpaid'}
                    escrow={
                      b.payment_status === 'paid'
                        ? b.status === 'completed' && b.customer_confirmed_at
                          ? 'released'
                          : 'held'
                        : undefined
                    }
                  />
                </View>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <Ionicons name="calendar-outline" size={16} color={colors.gray} />
              <BText variant="smallMedium">
                {formatDate(lang, b.starts_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ·{' '}
                {formatTimeOfDate(b.starts_at)}
              </BText>
            </View>
            <View style={styles.cardDivider} />
            <View style={{ gap: 6 }}>
              {b.items.map((i) => (
                <View key={i.service_id} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <BText variant="small" color={colors.ink}>
                    {i.service_name}
                  </BText>
                  <BText variant="small" color={colors.ink}>
                    {formatPrice(i.price_cents, b.currency)}
                  </BText>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <BText variant="smallMedium" style={{ fontFamily: font.bold }}>
                  {t('Total')}
                </BText>
                <BText variant="smallMedium" style={{ fontFamily: font.bold }}>
                  {formatPrice(b.total_cents, b.currency)}
                </BText>
              </View>
            </View>
            {filter === 'upcoming' && b.status !== 'cancelled' ? (
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  <Button
                    title={reschedId === b.id ? t('Close') : t('Reschedule')}
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      setReschedId(reschedId === b.id ? null : b.id);
                      setReschedDate(null);
                    }}
                  />
                  <Button title={t('Cancel booking')} variant="secondary" size="sm" onPress={() => onCancel(b.id)} />
                  <Button
                    title={t('Message')}
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      const v = allVenues.find((x) => x.id === b.venue_id);
                      if (v) router.push(`/messages?venue=${v.slug}`);
                    }}
                  />
                </View>
                {reschedId === b.id && (
                  <View style={{ marginTop: 14, gap: 10 }}>
                    <BText variant="smallMedium">{t('Pick a new day')}</BText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {nextDays(14, lang).map((d) => (
                        <Chip
                          key={d.date}
                          label={d.label}
                          selected={reschedDate === d.date}
                          onPress={() => setReschedDate(d.date)}
                        />
                      ))}
                    </ScrollView>
                    {reschedDate && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {RESCHEDULE_SLOTS.map((t) => (
                          <Pressable key={t} onPress={() => onReschedule(b, t)} style={styles.slot}>
                            <BText style={{ fontFamily: font.semibold, fontSize: 13, color: colors.ink }}>{t}</BText>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            ) : null}
            {filter === 'past' &&
            (b.status === 'completed' || b.status === 'confirmed') &&
            b.payment_status === 'paid' &&
            !b.customer_confirmed_at ? (
              <View style={styles.escrowNote}>
                <BText variant="tiny" color={colors.info} style={{ flex: 1 }}>
                  {t('Your payment is held in escrow by Bink. Confirm the service was completed to release it to the salon.')}
                </BText>
                <Button
                  title={t('Confirm visit')}
                  size="sm"
                  onPress={async () => {
                    await confirmServiceByCustomer(b.id);
                    refresh();
                  }}
                />
              </View>
            ) : null}
            {filter === 'past' && (b.status === 'completed' || b.status === 'confirmed') && !b.rated ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Button title={t('Rate your visit')} size="sm" onPress={() => setRateBooking(b)} />
              </View>
            ) : null}
            {b.rated ? (
              <BText variant="tiny" color={colors.green} style={{ marginTop: 12 }}>
                {t('✓ Thanks for your review')}
              </BText>
            ) : null}
          </View>
        ))
      )}
    </View>
  );

  const cancelModal = (
    <Modal visible={!!cancelTarget} transparent animationType="fade" onRequestClose={() => setCancelTarget(null)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Ionicons name="alert-circle-outline" size={30} color={colors.danger} />
          <BText variant="h3" style={{ marginTop: 10 }}>
            {t('Cancel this booking?')}
          </BText>
          {cancelTarget && (
            <>
              <BText variant="small" style={{ marginTop: 6, textAlign: 'center' }}>
                {cancelTarget.venue_name} ·{' '}
                {formatDate(lang, cancelTarget.starts_at, { weekday: 'long', month: 'long', day: 'numeric' })}
              </BText>
              {(() => {
                const v = allVenues.find((x) => x.id === cancelTarget.venue_id);
                const feePct = v?.cancellation_fee_pct ?? 0;
                const paidBase =
                  cancelTarget.payment_status === 'paid'
                    ? cancelTarget.total_cents
                    : cancelTarget.deposit_cents ?? 0;
                const fee = Math.round((paidBase * feePct) / 100);
                return (
                  <>
                    {v?.cancellation_policy ? (
                      <View style={styles.policyBox}>
                        <BText variant="tiny">{v.cancellation_policy}</BText>
                      </View>
                    ) : null}
                    {fee > 0 ? (
                      <BText variant="small" color={colors.danger} style={{ marginTop: 10, textAlign: 'center' }}>
                        {t('A cancellation fee of {amount} ({pct}% of what you paid) may apply.', {
                          amount: `SAR ${(fee / 100).toFixed(0)}`,
                          pct: feePct,
                        })}
                      </BText>
                    ) : null}
                  </>
                );
              })()}
            </>
          )}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18 }}>
            <Button title={t('Keep booking')} variant="secondary" onPress={() => setCancelTarget(null)} />
            <Button title={t('Yes, cancel it')} loading={cancelling} onPress={confirmCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );

  const ratingModal = (
    <Modal visible={!!rateBooking} transparent animationType="fade" onRequestClose={() => setRateBooking(null)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <BText variant="h2">{t('How was your visit?')}</BText>
          <BText variant="small" style={{ marginTop: 4 }}>
            {rateBooking?.venue_name}
          </BText>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 20, justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Pressable key={i} onPress={() => setStars(i)} hitSlop={6}>
                <Ionicons name={stars >= i ? 'star' : 'star-outline'} size={34} color={colors.star} />
              </Pressable>
            ))}
          </View>
          <TextInput
        {...({ dir: 'auto' } as any)}
            placeholder={t('Tell others about your experience (optional)')}
            placeholderTextColor={colors.gray}
            value={comment}
            onChangeText={setComment}
            multiline
            style={styles.reviewInput}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <Button title={t('Submit review')} fullWidth loading={savingReview} onPress={onSubmitReview} />
            </View>
            <Button title={t('Later')} variant="secondary" onPress={() => setRateBooking(null)} />
          </View>
        </View>
      </View>
    </Modal>
  );

  if (!user && !isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.white }}>
        <SignInGate icon="calendar-outline" title={t('Appointments')} />
        <BottomTabs />
      </View>
    );
  }

  if (isDesktop) {
    return (
      <>
        <AccountLayout title={t('Appointments')}>{list}</AccountLayout>
        {ratingModal}
        {cancelModal}
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: TAB_BAR_HEIGHT + 32,
        }}
      >
        <BText variant="h1" style={{ marginBottom: 20 }}>
          {t('Appointments')}
        </BText>
        {list}
      </ScrollView>
      <BottomTabs />
      {ratingModal}
        {cancelModal}
    </View>
  );
}

function StatusPill({ status }: { status: Booking['status'] }) {
  const { t } = useI18n();
  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    confirmed: { label: 'Confirmed', color: colors.green, bg: colors.greenBg },
    pending: { label: 'Pending', color: colors.warning, bg: colors.warningBg },
    completed: { label: 'Completed', color: colors.gray, bg: colors.bgSubtle },
    cancelled: { label: 'Cancelled', color: colors.danger, bg: colors.dangerBg },
    no_show: { label: 'No-show', color: colors.gray, bg: colors.bgSubtle },
  };
  const map = statusMap[status] ?? statusMap.confirmed;
  return (
    <View style={{ backgroundColor: map.bg, borderRadius: radius.pill, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}>
      <BText style={{ fontFamily: font.semibold, fontSize: 12, color: map.color }}>{t(map.label)}</BText>
    </View>
  );
}

const styles = StyleSheet.create({
  policyBox: {
    backgroundColor: colors.bgPage,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 12,
    width: '100%',
  },

  card: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    padding: 16,
    backgroundColor: colors.white,
  },
  cardDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 12 },
  empty: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 24,
  },
  escrowNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 16,
  },
  slot: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(19,19,19,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 24,
    width: '100%',
    maxWidth: 420,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 90,
    padding: 12,
    marginTop: 16,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.ink,
    textAlignVertical: 'top',
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
});
