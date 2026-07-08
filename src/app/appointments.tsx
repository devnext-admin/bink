import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { PaymentPill } from '../components/payment-pill';
import { Button } from '../components/ui/button';
import { Chip } from '../components/ui/chip';
import { BText } from '../components/ui/text';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '../components/web-header';
import { cancelBooking, getBookings } from '../lib/data';
import { formatDateLong, formatPrice, formatTimeOfDate } from '../lib/format';
import { colors, font, maxContentWidth, radius } from '../lib/theme';
import type { Booking } from '../lib/types';
import { useIsDesktop } from '../lib/use-layout';

export default function Appointments() {
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [loaded, setLoaded] = useState(false);

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
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <Button title="Cancel booking" variant="secondary" size="sm" onPress={() => onCancel(b.id)} />
              </View>
            ) : null}
          </View>
        ))
      )}
    </View>
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
    </View>
  );
}

function StatusPill({ status }: { status: Booking['status'] }) {
  const map = {
    confirmed: { label: 'Confirmed', color: colors.green, bg: '#E9F7EE' },
    pending: { label: 'Pending', color: '#B77400', bg: '#FFF7E8' },
    completed: { label: 'Completed', color: colors.gray, bg: colors.bgSubtle },
    cancelled: { label: 'Cancelled', color: colors.danger, bg: '#FDEBEC' },
  }[status];
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
});
