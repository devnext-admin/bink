import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { requestBookingDelay, respondBookingDelay } from '../lib/ops';
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
 * Short delay requests on a booking, from either side.
 *
 * Three states: nothing pending (offer to ask), our own request pending (wait),
 * or the other side's request pending (accept or decline). Anything longer than
 * MAX_DELAY_MINUTES is a reschedule, which is a separate flow.
 */
export function DelayControls({ booking, side, onChanged }: DelayControlsProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // We already asked; nothing to do but wait.
  if (pending) {
    return (
      <View style={[styles.card, { backgroundColor: colors.bgSubtle }]}>
        <View style={styles.row}>
          <Ionicons name="hourglass-outline" size={16} color={colors.gray} />
          <BText style={[styles.title, { color: colors.gray }]}>
            {t('Waiting on a reply to your {n} min delay', { n: String(mins) })}
          </BText>
        </View>
      </View>
    );
  }

  if (!picking) {
    return (
      <Pressable onPress={() => setPicking(true)} style={styles.link}>
        <Ionicons name="time-outline" size={15} color={colors.accent} />
        <BText style={styles.linkText}>{t('Request a short delay')}</BText>
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
            onPress={() => run(() => requestBookingDelay(booking.id, m, side))}
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
