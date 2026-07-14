import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ServiceRow } from '../../components/service-row';
import { Avatar } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Chip } from '../../components/ui/chip';
import { Rating } from '../../components/ui/rating';
import { BText } from '../../components/ui/text';
import { useAppData } from '../../lib/app-data-context';
import { useAuth } from '../../lib/auth-context';
import { useBooking } from '../../lib/booking-context';
import { createBooking } from '../../lib/data';
import { formatDuration, formatPrice } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { getBusyIntervals, isSlotFree, validatePromo, type BusyInterval } from '../../lib/ops';
import { markPayAtVenue, payDeposit, payForBooking, paymentsGateway } from '../../lib/payments';
import { colors, font, radius, shadow } from '../../lib/theme';
import type { PaymentMethod, PromoCode } from '../../lib/types';
import { useIsDesktop } from '../../lib/use-layout';

type Step = 'services' | 'professional' | 'time' | 'confirm' | 'done';
const STEPS: { key: Step; label: string }[] = [
  { key: 'services', label: 'Services' },
  { key: 'professional', label: 'Professional' },
  { key: 'time', label: 'Time' },
  { key: 'confirm', label: 'Confirm' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function nextDays(count: number): { date: string; day: string; num: number; month: string }[] {
  const out = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i + 1);
    out.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      day: DAYS[d.getDay()],
      num: d.getDate(),
      month: MONTHS[d.getMonth()],
    });
  }
  return out;
}

const TIME_SLOTS = Array.from({ length: 22 }, (_, i) => {
  const minutes = 10 * 60 + i * 30; // 10:00 → 20:30
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
});

export default function BookingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const tt = t;
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const { allVenues } = useAppData();
  const { user } = useAuth();
  const booking = useBooking();
  const venue = allVenues.find((v) => v.slug === slug) ?? booking.venue;

  const [step, setStep] = useState<Step>('services');
  const [group, setGroup] = useState('Featured');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('pay_at_venue');
  const [payError, setPayError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState<BusyInterval[]>([]);
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState<PromoCode | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Live availability for the selected day
  useEffect(() => {
    if (venue && booking.date) getBusyIntervals(venue.id, booking.date).then(setBusy);
    else setBusy([]);
  }, [venue?.id, booking.date]);

  const days = useMemo(() => nextDays(14), []);

  if (!venue) return null;

  const groups = [...new Set(venue.services.map((s) => s.group_name))];
  const visibleServices = venue.services.filter((s) => s.group_name === group);
  const stepIndex = STEPS.findIndex((s) => s.key === step);
  const depositCents = venue?.deposit_cents ?? 0;
  const finalTotal = promo
    ? Math.round(booking.totalCents * (1 - promo.pct_off / 100))
    : booking.totalCents;

  const applyPromo = async () => {
    setPromoError(null);
    if (!promoInput.trim()) return;
    const p = await validatePromo(promoInput);
    if (p) {
      setPromo(p);
      setPromoInput('');
    } else {
      setPromoError(t('This code is invalid or expired.'));
    }
  };

  const canContinue =
    (step === 'services' && booking.services.length > 0) ||
    step === 'professional' ||
    (step === 'time' && booking.date && booking.time) ||
    step === 'confirm';

  const goNext = async () => {
    if (step === 'services') setStep('professional');
    else if (step === 'professional') setStep('time');
    else if (step === 'time') setStep('confirm');
    else if (step === 'confirm') {
      setSubmitting(true);
      setPayError(null);
      const [h, m] = booking.time!.split(':').map(Number);
      const [y, mo, d] = booking.date!.split('-').map(Number);
      const startsAt = new Date(y, mo - 1, d, h, m);
      const created = await createBooking({
        venue,
        staffId: booking.staff?.id ?? null,
        staffName: booking.staff?.name ?? null,
        customerName: user?.name ?? user?.email ?? null,
        userId: user?.id ?? null,
        notes: notes.trim() || null,
        startsAt,
        currency: booking.currency,
        promoCode: promo?.code ?? null,
        promoPctOff: promo?.pct_off,
        items: booking.services.map((s) => ({
          service_id: s.id,
          service_name: s.name,
          duration_minutes: s.duration_minutes,
          price_cents: Math.round(s.price_cents * (1 - s.discount_pct / 100)),
        })),
      });
      try {
        if (payMethod === 'pay_at_venue') {
          await markPayAtVenue(created.id);
          if (depositCents > 0) {
            await payDeposit({
              bookingId: created.id,
              venueId: venue!.id,
              venueName: venue!.name,
              depositCents,
              currency: booking.currency,
              userId: user?.id ?? null,
            });
          }
          setPaid(false);
        } else {
          await payForBooking({
            booking: { ...created, payment_method: payMethod },
            method: payMethod,
            customerName: user?.name ?? user?.email ?? null,
            userId: user?.id ?? null,
          });
          setPaid(true);
        }
      } catch (e: any) {
        // Booking stays confirmed as pay-at-venue if the charge fails
        await markPayAtVenue(created.id);
        setPaid(false);
        setPayError(e?.message ?? t('Payment failed — your booking is confirmed as pay at venue.'));
      }
      setSubmitting(false);
      setConfirmedId(created.id);
      setStep('done');
    }
  };

  const goBack = () => {
    if (step === 'services' || step === 'done') router.back();
    else if (step === 'professional') setStep('services');
    else if (step === 'time') setStep('professional');
    else if (step === 'confirm') setStep('time');
  };

  // ------- step content -------
  let content: React.ReactNode = null;
  if (step === 'services') {
    content = (
      <View>
        <BText variant="h1">{t('Select services')}</BText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 16 }}>
          {groups.map((g) => (
            <Chip key={g} label={t(g)} selected={group === g} onPress={() => setGroup(g)} />
          ))}
        </ScrollView>
        <View style={{ gap: 12 }}>
          {visibleServices.map((s) => (
            <ServiceRow
              key={s.id}
              service={s}
              mode="add"
              showDescription
              selected={booking.services.some((x) => x.id === s.id)}
              onAction={() => booking.toggleService(s)}
            />
          ))}
        </View>
      </View>
    );
  } else if (step === 'professional') {
    content = (
      <View>
        <BText variant="h1">{t('Select professional')}</BText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
          <ProCard
            label={t('Any professional')}
            sub={t('for maximum availability')}
            icon
            selected={!booking.staff}
            onPress={() => booking.setStaff(null)}
          />
          {venue.staff.map((m) => (
            <ProCard
              key={m.id}
              label={m.name}
              sub={m.role}
              rating={m.rating}
              selected={booking.staff?.id === m.id}
              onPress={() => booking.setStaff(m)}
            />
          ))}
        </View>
      </View>
    );
  } else if (step === 'time') {
    content = (
      <View>
        <BText variant="h1">{t('Select time')}</BText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 20 }}>
          {days.map((d) => {
            const selected = booking.date === d.date;
            return (
              <Pressable
                key={d.date}
                onPress={() => booking.setDateTime(d.date, booking.time ?? '')}
                style={[styles.dayCell, selected && { backgroundColor: colors.accent, borderColor: colors.accent }]}
              >
                <BText variant="tiny" color={selected ? 'rgba(255,255,255,0.7)' : colors.gray}>
                  {t(d.day)}
                </BText>
                <BText
                  style={{ fontFamily: font.bold, fontSize: 18, color: selected ? colors.white : colors.ink }}
                >
                  {d.num}
                </BText>
                <BText variant="tiny" color={selected ? 'rgba(255,255,255,0.7)' : colors.gray}>
                  {t(d.month)}
                </BText>
              </Pressable>
            );
          })}
        </ScrollView>
        {([
          ['Morning', (h: number) => h < 12],
          ['Afternoon', (h: number) => h >= 12 && h < 17],
          ['Evening', (h: number) => h >= 17],
        ] as const).map(([groupLabel, match]) => {
          const groupSlots = TIME_SLOTS.filter((slot) => match(Number(slot.split(':')[0])));
          if (!groupSlots.length) return null;
          return (
            <View key={groupLabel} style={{ marginBottom: 14 }}>
              <BText variant="smallMedium" style={{ marginBottom: 8 }}>
                {tt(groupLabel)}
              </BText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {groupSlots.map((t) => {
            const selected = booking.time === t;
            const [sh, sm] = t.split(':').map(Number);
            const taken =
              !!booking.date &&
              !isSlotFree(busy, sh * 60 + sm, booking.totalMinutes || 30, booking.staff?.id ?? null, venue.staff.length);
            const disabled = !booking.date || taken;
            return (
              <Pressable
                key={t}
                disabled={disabled}
                onPress={() => booking.setDateTime(booking.date!, t)}
                style={[
                  styles.timeSlot,
                  selected && { backgroundColor: colors.accent, borderColor: colors.accent },
                  disabled && { opacity: 0.4 },
                  taken && { backgroundColor: colors.bgSubtle, borderColor: colors.bgSubtle },
                ]}
              >
                <BText
                  style={{
                    fontFamily: font.semibold,
                    fontSize: 14,
                    color: selected ? colors.white : taken ? colors.grayLight : colors.ink,
                    textDecorationLine: taken ? 'line-through' : 'none',
                  }}
                >
                  {t}
                </BText>
              </Pressable>
            );
          })}
              </View>
            </View>
          );
        })}
        {!booking.date ? (
          <BText variant="small" style={{ marginTop: 16 }}>
            {t('Pick a date first, then choose a time.')}
          </BText>
        ) : null}
      </View>
    );
  } else if (step === 'confirm') {
    content = (
      <View>
        <BText variant="h1">{t('Review and confirm')}</BText>
        <View style={{ gap: 12, marginTop: 20 }}>
          <InfoRow icon="calendar-outline" text={t('{date} at {time}', { date: booking.date!, time: booking.time! })} />
          <InfoRow icon="time-outline" text={t('{duration} total duration', { duration: formatDuration(booking.totalMinutes) })} />
          <InfoRow icon="person-outline" text={booking.staff ? `${booking.staff.name} — ${booking.staff.role}` : t('Any professional')} />
          <InfoRow icon="location-outline" text={`${venue.name}, ${venue.area}, ${venue.city}`} />
        </View>
        <View style={{ marginTop: 28, gap: 12 }}>
          {booking.services.map((s) => (
            <View key={s.id} style={styles.confirmRow}>
              <View style={{ flex: 1 }}>
                <BText variant="title">{s.name}</BText>
                <BText variant="small">{formatDuration(s.duration_minutes)}</BText>
              </View>
              <BText variant="smallMedium">
                {formatPrice(Math.round(s.price_cents * (1 - s.discount_pct / 100)), s.currency)}
              </BText>
            </View>
          ))}
          {promo ? (
            <View style={styles.confirmRow}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <BText variant="smallMedium" color={colors.green}>
                  {promo.code} · {t('{pct}% off', { pct: promo.pct_off })}
                </BText>
                <Pressable onPress={() => setPromo(null)} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color={colors.gray} />
                </Pressable>
              </View>
              <BText variant="smallMedium" color={colors.green}>
                −{formatPrice(booking.totalCents - finalTotal, booking.currency)}
              </BText>
            </View>
          ) : (
            <View style={[styles.confirmRow, { gap: 10 }]}>
              <TextInput
                placeholder={t('Promo code')}
                placeholderTextColor={colors.gray}
                value={promoInput}
                onChangeText={setPromoInput}
                autoCapitalize="characters"
                style={styles.promoInput}
              />
              <Pressable onPress={applyPromo} style={styles.promoBtn}>
                <BText style={{ fontFamily: font.semibold, fontSize: 13, color: colors.ink }}>{t('Apply')}</BText>
              </Pressable>
            </View>
          )}
          {promoError ? (
            <BText variant="tiny" color={colors.danger}>
              {promoError}
            </BText>
          ) : null}
          <View style={[styles.confirmRow, { borderBottomWidth: 0 }]}>
            <BText variant="h3" style={{ flex: 1 }}>
              {t('Total')}
            </BText>
            <BText variant="h3">{formatPrice(finalTotal, booking.currency)}</BText>
          </View>
        </View>
        <View style={{ marginTop: 24 }}>
          <BText variant="h3">{t('Notes for the salon')}</BText>
          <TextInput
            placeholder={t('Anything they should know? Allergies, preferences, parking…')}
            placeholderTextColor={colors.gray}
            value={notes}
            onChangeText={setNotes}
            multiline
            style={styles.notesInput}
          />
        </View>
        <View style={{ marginTop: 28 }}>
          <BText variant="h3">{t('Payment')}</BText>
          <View style={{ gap: 10, marginTop: 14 }}>
            <PayOption
              icon="cash-outline"
              title={t('Pay at venue')}
              sub={
                depositCents > 0
                  ? t('Reservation deposit {amount} charged now — the rest at the venue', {
                      amount: formatPrice(depositCents, booking.currency),
                    })
                  : t('No payment needed today')
              }
              selected={payMethod === 'pay_at_venue'}
              onPress={() => setPayMethod('pay_at_venue')}
            />
            <PayOption
              icon="card-outline"
              title={t('Pay by card')}
              sub={paymentsGateway === 'demo' ? t('Test gateway — no real charge') : t('mada, Visa, Mastercard')}
              selected={payMethod === 'card'}
              onPress={() => setPayMethod('card')}
            />
            <PayOption
              icon="logo-apple"
              title={t('Apple Pay')}
              sub={paymentsGateway === 'demo' ? t('Test gateway — no real charge') : t('Pay with Apple Pay')}
              selected={payMethod === 'apple_pay'}
              onPress={() => setPayMethod('apple_pay')}
            />
          </View>
          {payMethod !== 'pay_at_venue' ? (
            <View style={styles.payNote}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.ink} />
              <BText variant="small" color={colors.ink}>
                {t(
                  '{amount} is charged now and held securely in escrow by Bink. It is only released to the salon after your visit is completed and you confirm it. Includes 15% VAT — a tax invoice is issued automatically.',
                  { amount: formatPrice(finalTotal, booking.currency) }
                )}
              </BText>
            </View>
          ) : null}
        </View>
        {!user ? (
          <BText variant="small" style={{ marginTop: 16 }}>
            {t('Booking as guest. You can create an account from the Profile tab to keep your appointments synced.')}
          </BText>
        ) : null}
      </View>
    );
  } else {
    content = (
      <View style={{ alignItems: 'center', paddingTop: 48 }}>
        <View style={styles.doneCircle}>
          <Ionicons name="checkmark" size={40} color={colors.white} />
        </View>
        <BText variant="h1" style={{ marginTop: 24, textAlign: 'center' }}>
          {t('Booking confirmed')}
        </BText>
        <BText variant="body" style={{ marginTop: 8, textAlign: 'center', maxWidth: 400 }}>
          {venue.name} · {t('{date} at {time}', { date: booking.date!, time: booking.time! })}. {t('We can’t wait to see you!')}
        </BText>
        {paid ? (
          <View style={[styles.paidPill, { backgroundColor: colors.greenBg }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.green} />
            <BText variant="smallMedium" color={colors.green}>
              {t('Paid {amount} · tax invoice issued', { amount: formatPrice(booking.totalCents, booking.currency) })}
            </BText>
          </View>
        ) : (
          <View style={[styles.paidPill, { backgroundColor: colors.bgSubtle }]}>
            <Ionicons name="cash-outline" size={16} color={colors.ink} />
            <BText variant="smallMedium">{t('Pay at venue')}</BText>
          </View>
        )}
        {payError ? (
          <BText variant="small" color={colors.danger} style={{ marginTop: 10, textAlign: 'center', maxWidth: 400 }}>
            {payError}
          </BText>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 32 }}>
          <Button
            title={t('View appointments')}
            onPress={() => {
              booking.reset();
              router.dismissAll?.();
              router.replace('/appointments');
            }}
          />
          <Button
            title={t('Done')}
            variant="secondary"
            onPress={() => {
              booking.reset();
              router.dismissAll?.();
              router.replace('/');
            }}
          />
        </View>
      </View>
    );
  }

  // ------- summary card (desktop sidebar / mobile bottom bar) -------
  const summary = (
    <View style={[styles.summaryCard, shadow.card]}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Image
          source={{ uri: venue.images[0]?.url }}
          style={{ width: 56, height: 56, borderRadius: radius.sm, backgroundColor: colors.bgSubtle }}
          contentFit="cover"
        />
        <View style={{ flex: 1 }}>
          <BText variant="title" numberOfLines={1}>
            {venue.name}
          </BText>
          <Rating value={venue.rating_avg} count={venue.rating_count} size={12} />
          <BText variant="tiny" numberOfLines={1}>
            {venue.area}, {venue.city}
          </BText>
        </View>
      </View>
      <View style={styles.summaryDivider} />
      {booking.services.length === 0 ? (
        <BText variant="small">{t('No services selected')}</BText>
      ) : (
        <View style={{ gap: 10 }}>
          {booking.services.map((s) => (
            <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <BText variant="smallMedium" numberOfLines={1}>
                  {s.name}
                </BText>
                <BText variant="tiny">{formatDuration(s.duration_minutes)}</BText>
              </View>
              <BText variant="smallMedium">
                {formatPrice(Math.round(s.price_cents * (1 - s.discount_pct / 100)), s.currency)}
              </BText>
            </View>
          ))}
        </View>
      )}
      <View style={styles.summaryDivider} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <BText variant="title">{t('Total')}</BText>
        <BText variant="title">
          {booking.services.length ? formatPrice(finalTotal, booking.currency) : t('free')}
        </BText>
      </View>
      <View style={{ marginTop: 20 }}>
        <Button
          title={
            step === 'confirm'
              ? payMethod === 'pay_at_venue'
                ? depositCents > 0
                  ? t('Reserve for {amount}', { amount: formatPrice(depositCents, booking.currency) })
                  : t('Confirm booking')
                : t('Pay {amount}', { amount: formatPrice(finalTotal, booking.currency) })
              : t('Continue')
          }
          fullWidth
          size="lg"
          disabled={!canContinue}
          loading={submitting}
          onPress={goNext}
        />
      </View>
    </View>
  );

  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgPage }}>
        {/* top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={goBack} style={[styles.roundBtn, shadow.card]}>
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          {step !== 'done' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {STEPS.map((s, i) => (
                <React.Fragment key={s.key}>
                  <BText
                    variant="small"
                    style={{ fontFamily: i === stepIndex ? font.bold : font.regular }}
                    color={i <= stepIndex ? colors.ink : colors.gray}
                  >
                    {t(s.label)}
                  </BText>
                  {i < STEPS.length - 1 && <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color={colors.gray} />}
                </React.Fragment>
              ))}
            </View>
          )}
          <Pressable
            onPress={() => {
              booking.reset();
              router.back();
            }}
            style={[styles.roundBtn, shadow.card]}
          >
            <Ionicons name="close" size={20} color={colors.ink} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
          <View style={styles.desktopColumns}>
            <View style={{ flex: 1, maxWidth: 640 }}>{content}</View>
            {step !== 'done' && <View style={{ width: 380 }}>{summary}</View>}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      {/* mobile top bar */}
      <View style={[styles.mobileTop, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={goBack} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
        {step !== 'done' && (
          <BText variant="smallMedium">
            {t(STEPS[stepIndex]?.label ?? '')} · {t('step {n} of {m}', { n: stepIndex + 1, m: STEPS.length })}
          </BText>
        )}
        <Pressable
          onPress={() => {
            booking.reset();
            router.back();
          }}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 180 }}>{content}</ScrollView>

      {step !== 'done' && (
        <View style={[styles.mobileBottom, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={{ flex: 1 }}>
            <BText variant="title">
              {booking.services.length ? formatPrice(booking.totalCents, booking.currency) : t('Select services')}
            </BText>
            <BText variant="tiny">
              {booking.services.length === 1 ? t('1 service') : t('{n} services', { n: booking.services.length })}
              {booking.totalMinutes ? ` · ${formatDuration(booking.totalMinutes)}` : ''}
            </BText>
          </View>
          <Button
            title={step === 'confirm' ? (payMethod === 'pay_at_venue' ? t('Confirm') : t('Pay now')) : t('Continue')}
            size="lg"
            disabled={!canContinue}
            loading={submitting}
            onPress={goNext}
          />
        </View>
      )}
    </View>
  );
}

function ProCard({
  label,
  sub,
  rating,
  icon,
  selected,
  onPress,
}: {
  label: string;
  sub: string;
  rating?: number;
  icon?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.proCard, selected && { borderColor: colors.accent, borderWidth: 2 }]}
    >
      {icon ? (
        <View style={styles.anyPro}>
          <Ionicons name="people-outline" size={26} color={colors.ink} />
        </View>
      ) : (
        <Avatar name={label} size={56} />
      )}
      {rating != null && (
        <View style={styles.proRating}>
          <BText variant="tiny" style={{ fontFamily: font.bold, color: colors.ink }}>
            {rating.toFixed(1)}
          </BText>
          <Ionicons name="star" size={10} color={colors.star} />
        </View>
      )}
      <BText variant="smallMedium" style={{ marginTop: 10, textAlign: 'center' }} numberOfLines={1}>
        {label}
      </BText>
      <BText variant="tiny" style={{ textAlign: 'center' }} numberOfLines={1}>
        {sub}
      </BText>
    </Pressable>
  );
}

function PayOption({
  icon,
  title,
  sub,
  selected,
  onPress,
}: {
  icon: any;
  title: string;
  sub: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.payOption, selected && { borderColor: colors.accent, borderWidth: 2 }]}
    >
      <Ionicons name={icon} size={20} color={colors.ink} />
      <View style={{ flex: 1 }}>
        <BText variant="smallMedium">{title}</BText>
        <BText variant="tiny">{sub}</BText>
      </View>
      <View style={[styles.radio, selected && { borderColor: colors.accent }]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

function InfoRow({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name={icon} size={18} color={colors.ink} />
      <BText variant="body">{text}</BText>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopColumns: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 40,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 20,
    position: 'sticky' as any,
    top: 24,
  },
  summaryDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 16 },
  dayCell: {
    width: 64,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.white,
  },
  timeSlot: {
    paddingHorizontal: 18,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  proCard: {
    width: 150,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  anyPro: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: -12,
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  payNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 16,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 72,
    padding: 12,
    marginTop: 12,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.ink,
    textAlignVertical: 'top',
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    height: 40,
    paddingHorizontal: 14,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.ink,
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
  promoBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    height: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    padding: 14,
    backgroundColor: colors.white,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  paidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 16,
  },
  doneCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  mobileBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
