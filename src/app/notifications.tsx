import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountLayout } from '../components/account-layout';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { BText } from '../components/ui/text';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '../components/web-header';
import { useAppData } from '../lib/app-data-context';
import { useAuth } from '../lib/auth-context';
import { formatDate, useI18n, type Lang } from '../lib/i18n';
import { AppNotification, getNotifications, markAllRead } from '../lib/notifications';
import { colors, radius } from '../lib/theme';
import { useIsDesktop } from '../lib/use-layout';

const TYPE_ICONS: { match: string; icon: string; bg: string; tint: string }[] = [
  { match: 'Booking confirmed', icon: 'calendar-outline', bg: '#E9F7EE', tint: '#10A660' },
  { match: 'New booking', icon: 'calendar-outline', bg: '#E9F7EE', tint: '#10A660' },
  { match: 'Payment', icon: 'card-outline', bg: '#EAF4FF', tint: '#194F8A' },
  { match: 'Refund', icon: 'return-down-back-outline', bg: '#FEECEB', tint: '#E83550' },
  { match: 'cancelled', icon: 'close-circle-outline', bg: '#FEECEB', tint: '#E83550' },
  { match: 'rescheduled', icon: 'time-outline', bg: '#FEF4E6', tint: '#E18308' },
  { match: 'review', icon: 'star-outline', bg: '#FEF4E6', tint: '#E18308' },
  { match: 'live', icon: 'checkmark-circle-outline', bg: '#E9F7EE', tint: '#10A660' },
];

function iconFor(title: string) {
  return (
    TYPE_ICONS.find((t) => title.toLowerCase().includes(t.match.toLowerCase())) ?? {
      icon: 'notifications-outline',
      bg: colors.accentSoft,
      tint: colors.accent,
    }
  );
}

function timeAgo(
  iso: string,
  lang: Lang,
  t: (s: string, vars?: Record<string, string | number>) => string
) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return t('{n}m ago', { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t('{n}h ago', { n: hours });
  return formatDate(lang, iso, { day: 'numeric', month: 'short' });
}

export default function Notifications() {
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, isRTL } = useI18n();
  const { user } = useAuth();
  const { allVenues } = useAppData();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loaded, setLoaded] = useState(false);

  const ownedIds = useMemo(
    () => (user ? allVenues.filter((v) => v.owner_id === user.id).map((v) => v.id) : []),
    [user, allVenues]
  );

  useFocusEffect(
    useCallback(() => {
      getNotifications(user?.id ?? null, ownedIds).then((list) => {
        setItems(list);
        setLoaded(true);
        // Mark read after showing, so badges clear on next visit anywhere
        markAllRead(user?.id ?? null, ownedIds);
      });
    }, [user?.id, ownedIds])
  );

  const list = (
    <View style={{ gap: 10 }}>
      {loaded && items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-outline" size={44} color={colors.grayLight} />
          <BText variant="h3" style={{ marginTop: 16 }}>
            {t('No notifications yet')}
          </BText>
          <BText variant="small" style={{ marginTop: 6, textAlign: 'center' }}>
            {t('Booking updates, payments and salon news will appear here.')}
          </BText>
        </View>
      ) : (
        items.map((n) => {
          const ic = iconFor(n.title);
          return (
            <View key={n.id} style={[styles.card, !n.is_read && { backgroundColor: colors.accentSoft }]}>
              <View style={[styles.iconCircle, { backgroundColor: ic.bg }]}>
                <Ionicons name={ic.icon as any} size={18} color={ic.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <BText variant="smallMedium" style={{ flex: 1 }}>
                    {n.title}
                  </BText>
                  <BText variant="tiny">{timeAgo(n.created_at, lang, t)}</BText>
                </View>
                {n.body ? (
                  <BText variant="small" style={{ marginTop: 2 }}>
                    {n.body}
                  </BText>
                ) : null}
                {n.audience === 'venue' ? (
                  <BText variant="tiny" color={colors.accent} style={{ marginTop: 4 }}>
                    {allVenues.find((v) => v.id === n.venue_id)?.name ?? t('Your salon')}
                  </BText>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  if (isDesktop) {
    return <AccountLayout title={t('Notifications')}>{list}</AccountLayout>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: TAB_BAR_HEIGHT + 32 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.ink} />
          </Pressable>
          <BText variant="h1">{t('Notifications')}</BText>
        </View>
        {list}
      </ScrollView>
      <BottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    padding: 14,
    backgroundColor: colors.white,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
});
