import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font } from '../lib/theme';
import { BText } from './ui/text';

const TABS = [
  { href: '/', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
  { href: '/search', label: 'Search', icon: 'search-outline', activeIcon: 'search' },
  { href: '/appointments', label: 'Appointments', icon: 'calendar-outline', activeIcon: 'calendar' },
  { href: '/profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
] as const;

// Custom bottom tab bar shown on mobile (native + narrow web).
export function BottomTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Pressable
            key={tab.href}
            onPress={() => router.replace(tab.href as any)}
            style={styles.tab}
            hitSlop={4}
          >
            <Ionicons
              name={(active ? tab.activeIcon : tab.icon) as any}
              size={24}
              color={active ? colors.ink : colors.gray}
            />
            <BText
              style={{
                fontFamily: active ? font.bold : font.medium,
                fontSize: 11,
                color: active ? colors.ink : colors.gray,
              }}
            >
              {tab.label}
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
});
