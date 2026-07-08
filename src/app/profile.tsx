import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { Avatar } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { BText } from '../components/ui/text';
import { VenueCard } from '../components/venue-card';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '../components/web-header';
import { useAppData } from '../lib/app-data-context';
import { useAuth } from '../lib/auth-context';
import { colors, maxContentWidth, radius } from '../lib/theme';
import { useIsDesktop } from '../lib/use-layout';

const BASE_MENU = [
  { icon: 'calendar-outline', label: 'Appointments', href: '/appointments' },
  { icon: 'receipt-outline', label: 'Invoices', href: '/invoices' },
  { icon: 'heart-outline', label: 'Favorites', href: null },
  { icon: 'storefront-outline', label: 'Bink for Business', href: '/business' },
  { icon: 'settings-outline', label: 'Settings', href: '/settings' },
  { icon: 'help-circle-outline', label: 'Help and support', href: '/support' },
];

export default function Profile() {
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { venues, allVenues, favorites } = useAppData();
  const favVenues = venues.filter((v) => favorites.includes(v.id));

  const ownsVenues = user ? allVenues.some((v) => v.owner_id === user.id) : false;
  const MENU = [
    ...BASE_MENU.map((m) =>
      m.label === 'Bink for Business' && ownsVenues ? { ...m, href: '/business/dashboard' } : m
    ),
    ...(user?.role === 'admin'
      ? [{ icon: 'shield-checkmark-outline', label: 'Admin dashboard', href: '/admin' }]
      : []),
  ];

  const content = (
    <View style={{ gap: 24 }}>
      {user ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <Avatar name={user.name ?? user.email ?? 'You'} size={64} />
          <View style={{ flex: 1 }}>
            <BText variant="h2">{user.name ?? 'Welcome'}</BText>
            <BText variant="small">{user.email ?? (user.isGuest ? 'Guest account' : '')}</BText>
          </View>
        </View>
      ) : (
        <View style={styles.signInCard}>
          <BText variant="h2">Your beauty, booked</BText>
          <BText variant="small" style={{ marginTop: 6 }}>
            Sign up to keep your appointments and favorites in one place.
          </BText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Button title="Log in or sign up" onPress={() => router.push('/auth')} />
          </View>
        </View>
      )}

      <View style={styles.menuCard}>
        {MENU.map((m, i) => (
          <Pressable
            key={m.label}
            onPress={() => (m.href ? router.push(m.href as any) : null)}
            style={({ hovered }: any) => [
              styles.menuRow,
              i < MENU.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider },
              hovered && { backgroundColor: colors.bgPage },
            ]}
          >
            <Ionicons name={m.icon as any} size={20} color={colors.ink} />
            <BText variant="bodyMedium" style={{ flex: 1 }}>
              {m.label}
            </BText>
            <Ionicons name="chevron-forward" size={16} color={colors.gray} />
          </Pressable>
        ))}
      </View>

      {favVenues.length ? (
        <View>
          <BText variant="h2" style={{ marginBottom: 16 }}>
            Favorites
          </BText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
            {favVenues.map((v) => (
              <VenueCard key={v.id} venue={v} width={isDesktop ? 268 : undefined} />
            ))}
          </View>
        </View>
      ) : null}

      {user ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button title="Log out" variant="secondary" onPress={signOut} />
        </View>
      ) : null}
    </View>
  );

  if (isDesktop) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.white }}>
        <WebHeader showSearch />
        <View style={styles.desktopContent}>
          <BText variant="h1" style={{ marginBottom: 24 }}>
            Profile
          </BText>
          <View style={{ maxWidth: 720 }}>{content}</View>
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
          Profile
        </BText>
        {content}
      </ScrollView>
      <BottomTabs />
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
  signInCard: {
    backgroundColor: colors.bgPage,
    borderRadius: radius.lg,
    padding: 24,
  },
  menuCard: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: colors.white,
  },
});
