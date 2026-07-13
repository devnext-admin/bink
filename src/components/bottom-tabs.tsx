import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppData } from '../lib/app-data-context';
import { useAuth } from '../lib/auth-context';
import { useI18n } from '../lib/i18n';
import { getUnreadMessageCount } from '../lib/messages';
import { colors, font } from '../lib/theme';
import { BText } from './ui/text';

const TABS = [
  { href: '/', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { href: '/search', label: 'Search', icon: 'search-outline', activeIcon: 'search' },
  { href: '/appointments', label: 'Appointments', icon: 'calendar-outline', activeIcon: 'calendar' },
  { href: '/messages', label: 'Messages', icon: 'chatbubble-ellipses-outline', activeIcon: 'chatbubble-ellipses' },
  { href: '/profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
] as const;

// Custom bottom tab bar shown on mobile (native + narrow web).
export function BottomTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user } = useAuth();
  const { allVenues } = useAppData();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    const ownedIds = allVenues.filter((v) => v.owner_id === user.id).map((v) => v.id);
    const load = () => getUnreadMessageCount(user.id, ownedIds).then(setUnread).catch(() => {});
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [user?.id, allVenues.length]);

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const showBadge = tab.href === '/messages' && unread > 0;
        return (
          <Pressable
            key={tab.href}
            onPress={() => router.replace(tab.href as any)}
            style={styles.tab}
            hitSlop={4}
          >
            <View>
              <Ionicons
                name={(active ? tab.activeIcon : tab.icon) as any}
                size={24}
                color={active ? colors.accent : colors.gray}
              />
              {showBadge && (
                <View style={styles.badge}>
                  <BText style={{ fontFamily: font.bold, fontSize: 9, color: colors.white }}>
                    {unread > 9 ? '9+' : unread}
                  </BText>
                </View>
              )}
            </View>
            <BText
              style={{
                fontFamily: active ? font.bold : font.medium,
                fontSize: 11,
                color: active ? colors.accent : colors.gray,
              }}
            >
              {t(tab.label)}
            </BText>
          </Pressable>
        );
      })}
    </View>
  );
}

export const TAB_BAR_HEIGHT = 64;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.accent,
    borderRadius: 999,
    minWidth: 15,
    height: 15,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
