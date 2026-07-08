import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { PaymentPill } from '../components/payment-pill';
import { Button } from '../components/ui/button';
import { Chip } from '../components/ui/chip';
import { BText } from '../components/ui/text';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '../components/web-header';
import { useAppData } from '../lib/app-data-context';
import { useAuth } from '../lib/auth-context';
import { cancelBooking, getBookings } from '../lib/data';
import { formatDateLong, formatPrice, formatTimeOfDate } from '../lib/format';
import { rescheduleBooking, submitReview } from '../lib/ops';
import { colors, font, maxContentWidth, radius } from '../lib/theme';
import type { Booking } from '../lib/types';
import { useIsDesktop } from '../lib/use-layout';

const RESCHEDULE_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const minutes = 10 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

function nextDays(count: number) {
  const out: { date: string; label: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    out.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
    });
  }
  return out;
}

export default function Appointments() {
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const router = useRouter();
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
    getBookings().then((b) => {
      setBookings(b);
      setLoaded(true);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const now = Date.now();
  const visible = bookings.filter((b) =>
    filter === 'upcoming'
      ? new Date(b.starts_at).getTime() >= now && b.status !== 'cancelled'
      : new Date(b.starts_at).getTime() < now || b.status === 'cancelled'
  );

  const onCancel = async (id: string) => {
    await cancelBooking(id);
    refresh();
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
        <Chip label="Upcoming" selected={filter === 'upcoming'} onPress={() => setFilter('upcoming')} />
        <Chip label="Past" selected={filter === 'past'} onPress={() => setFilter('past')} />
      </View>

      {loaded && visible.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="calendar-outline" size={44} color={colors.grayLight} />
          <BText variant="h3" style={{ marginTop: 16 }}>
            No {filter} appointments
          </BText>
          <BText variant="small" style={{ marginTop: 6, textAlign: 'center' }}>
            When you book a treatment it will show up here.
          </BText>
          <View style={{ marginTop: 20 }}>
            <Button title="Find a salon" onPress={() => router.push('/search')} />
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
              <View style={{ flex: 1, gap: 2 }}>
                <BText variant="title">{b.venue_name}</BText>
                <BText variant="small">{b.venue_area}</BText>
                <BText variant="smallMedium" style={{ marginTop: 4 }}>
                  {formatDateLong(b.starts_at)} · {formatTimeOfDate(b.starts_at)}
                </BText>
              </View>
              <View style={{ gap: 4, alignItems: 'flex-end' }}>
                <StatusPill status={b.status} />
                <PaymentPill status={b.payment_status ?? 'unpaid'} />
              </View>
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
                  Total
                </BText>
                <BText variant="smallMedium" style={{ fontFamily: font.bold }}>
                  {formatPrice(b.total_cents, b.currency)}
                </BText>
              </View>
            </View>
            {filter === 'upcoming' && b.status !== 'cancelled' ? (
              <View style={{ marginTop: 16 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button
                    title={reschedId === b.id ? 'Close' : 'Reschedule'}
                    variant="secondary"
                    size="sm"
                    onPress={() => {
                      setReschedId(reschedId === b.id ? null : b.id);
                      setReschedDate(null);
                    }}
                  />
                  <Button title="Cancel booking" variant="secondary" size="sm" onPress={() => onCancel(b.id)} />
                </View>
                {reschedId === b.id && (
                  <View style={{ marginTop: 14, gap: 10 }}>
                    <BText variant="smallMedium">Pick a new day</BText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {nextDays(14).map((d) => (
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
            {filter === 'past' && (b.status === 'completed' || b.status === 'confirmed') && !b.rated ? (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Button title="Rate your visit" size="sm" onPress={() => setRateBooking(b)} />
              </View>
            ) : null}
            {b.rated ? (
              <BText variant="tiny" color={colors.green} style={{ marginTop: 12 }}>
                ✓ Thanks for your review
              </BText>
            ) : null}
          </View>
        ))
      )}
    </View>
  );

  const ratingModal = (
    <Modal visible={!!rateBooking} transparent animationType="fade" onRequestClose={() => setRateBooking(null)}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <BText variant="h2">How was your visit?</BText>
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
            placeholder="Tell others about your experience (optional)"
            placeholderTextColor={colors.gray}
            value={comment}
            onChangeText={setComment}
            multiline
            style={styles.reviewInput}
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <Button title="Submit review" fullWidth loading={savingReview} onPress={onSubmitReview} />
            </View>
            <Button title="Later" variant="secondary" onPress={() => setRateBooking(null)} />
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isDesktop) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.white }}>
        <WebHeader showSearch />
        <View style={styles.desktopContent}>
          <BText variant="h1" style={{ marginBottom: 24 }}>
            Appointments
          </BText>
          <View style={{ maxWidth: 720 }}>{list}</View>
        </View>
        <WebFooter />
        {ratingModal}
      </ScrollView>
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
          Appointments
        </BText>
        {list}
      </ScrollView>
      <BottomTabs />
      {ratingModal}
    </View>
  );
}

function StatusPill({ status }: { status: Booking['status'] }) {
  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    confirmed: { label: 'Confirmed', color: colors.green, bg: '#E9F7EE' },
    pending: { label: 'Pending', color: '#B77400', bg: '#FFF7E8' },
    completed: { label: 'Completed', color: colors.gray, bg: colors.bgSubtle },
    cancelled: { label: 'Cancelled', color: colors.danger, bg: '#FDEBEC' },
    no_show: { label: 'No-show', color: colors.gray, bg: colors.bgSubtle },
  };
  const map = statusMap[status] ?? statusMap.confirmed;
  return (
    <View style={{ backgroundColor: map.bg, borderRadius: radius.pill, paddingHorizontal: 10, height: 24, justifyContent: 'center' }}>
      <BText style={{ fontFamily: font.semibold, fontSize: 12, color: map.color }}>{map.label}</BText>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopContent: {
    width: '100%',
    maxWidth: maxContentWidth + 48,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    minHeight: 600,
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
