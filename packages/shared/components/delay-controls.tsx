import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { applyBookingDelay, requestBookingDelay, respondBookingDelay } from '../lib/ops';
import { colors, font, radius } from '../lib/theme';
import { MAX_DELAY_MINUTES } from '../lib/types';
import type { Booking, DelaySide } from '../lib/types';
import { BText } from './ui/text';

const OPTIONS = [5, 10, MAX_DELAY_MINUTES];

interface DelayControlsProps {
  booking: Booking;
  /** Which side the current viewer is on. */
  side: DelaySide;
  /** Called after a successful change so the parent can refresh. */
  onChanged: () => void;
}

/**
 * Short delays on a booking.
 *
 * The customer asks and waits for the salon to accept or decline. The salon
 * applies its own delay DIRECTLY - it is running behind in its own house, so
 * there is nobody to ask - and answers the customer's pending requests.
 * Anything longer than MAX_DELAY_MINUTES is a reschedule, a separate flow.
 */
export function DelayControls({ booking, side, onChanged }: DelayControlsProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<number | null>(null);
  // The salon applies delays immediately; only customers file requests.
  const direct = side === 'venue';

  if (booking.status === 'cancelled' || booking.status === 'completed') return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setPicking(false);
      onChanged();
    } catch (e: any) {
      setError(e?.message ?? t('Something went wrong'));
    } finally {
      setBusy(false);
    }
  };

  const pending = booking.delay_minutes != null && booking.delay_by != null;
  const theirs = pending && booking.delay_by !== side;
  const mins = booking.delay_minutes ?? 0;

  // The other side is waiting on us.
  if (theirs) {
    const who = booking.delay_by === 'venue' ? t('The salon') : t('The customer');
    return (
      <View style={[styles.card, { backgroundColor: colors.warningBg }]}>
        <View style={styles.row}>
          <Ionicons name="time-outline" size={16} color={colors.warning} />
          <BText style={styles.title}>
            {who} {t('asked to start {n} min later', { n: String(mins) })}
          </BText>
        </View>
        {error && <BText style={styles.error}>{error}</BText>}
        <View style={styles.row}>
          <Pressable
            disabled={busy}
            onPress={() => run(() => respondBookingDelay(booking.id, true, side))}
            style={({ hovered }: any) => [styles.btn, styles.accept, hovered && { opacity: 0.9 }]}
          >
            {busy ? <ActivityIndicator size="small" color={colors.white} /> : (
              <BText style={[styles.btnText, { color: colors.white }]}>{t('Accept')}</BText>
            )}
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => run(() => respondBookingDelay(booking.id, false, side))}
            style={({ hovered }: any) => [styles.btn, styles.decline, hovered && { backgroundColor: colors.bgSubtle }]}
          >
            <BText style={[styles.btnText, { color: colors.ink }]}>{t('Decline')}</BText>
          </Pressable>
        </View>
      </View>
    );
  }

  // We already asked; nothing to do but wait for the salon's answer.
  if (pending) {
    return (
      <View style={[styles.card, { backgroundColor: colors.bgSubtle }]}>
        <View style={styles.row}>
          <Ionicons name="checkmark-circle" size={16} color={colors.green} />
          <BText style={[styles.title, { color: colors.gray }]}>
            {t('Your {n} min delay request was sent - waiting for a response', { n: String(mins) })}
          </BText>
        </View>
      </View>
    );
  }

  // The salon just applied a delay - brief confirmation, then business as usual.
  if (direct && applied != null) {
    return (
      <View style={[styles.card, { backgroundColor: colors.bgSubtle }]}>
        <View style={styles.row}>
          <Ionicons name="checkmark-circle" size={16} color={colors.green} />
          <BText style={[styles.title, { color: colors.gray }]}>
            {t('Delay applied - the booking moved {n} min later and the customer was notified', {
              n: String(applied),
            })}
          </BText>
        </View>
      </View>
    );
  }

  if (!picking) {
    return (
      <Pressable onPress={() => setPicking(true)} style={styles.link}>
        <Ionicons name="time-outline" size={15} color={colors.accent} />
        <BText style={styles.linkText}>{direct ? t('Delay this booking') : t('Request a short delay')}</BText>
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.bgSubtle }]}>
      <BText style={styles.title}>{t('Push this booking back by')}</BText>
      {error && <BText style={styles.error}>{error}</BText>}
      <View style={styles.row}>
        {OPTIONS.map((m) => (
          <Pressable
            key={m}
            disabled={busy}
            onPress={() =>
              run(async () => {
                if (direct) {
                  await applyBookingDelay(booking.id, m);
                  setApplied(m);
                } else {
                  await requestBookingDelay(booking.id, m, side);
                }
              })
            }
            style={({ hovered }: any) => [styles.btn, styles.option, hovered && { borderColor: colors.accent }]}
          >
            <BText style={[styles.btnText, { color: colors.ink }]}>{t('{n} min', { n: String(m) })}</BText>
          </Pressable>
        ))}
        <Pressable disabled={busy} onPress={() => setPicking(false)} style={styles.btn}>
          <BText style={[styles.btnText, { color: colors.gray }]}>{t('Cancel')}</BText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, padding: 12, gap: 10, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  title: { fontFamily: font.semibold, fontSize: 14, color: colors.ink, flexShrink: 1 },
  error: { fontFamily: font.regular, fontSize: 13, color: colors.danger },
  btn: {
    minHeight: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  option: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  accept: { backgroundColor: colors.ink },
  decline: { borderWidth: 1, borderColor: colors.border },
  btnText: { fontFamily: font.semibold, fontSize: 14 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingVertical: 6 },
  linkText: { fontFamily: font.semibold, fontSize: 14, color: colors.accent },
});
