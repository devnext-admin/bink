import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useAppData } from '../lib/app-data-context';
import { useAuth } from '../lib/auth-context';
import { colors, font, radius } from '../lib/theme';
import { BText } from './ui/text';
import { WebHeader } from './web-header';

const NAV = [
  { href: '/profile', label: 'Profile', icon: 'person-outline' },
  { href: '/appointments', label: 'Appointments', icon: 'calendar-outline' },
  { href: '/messages', label: 'Messages', icon: 'chatbubble-ellipses-outline' },
  { href: '/invoices', label: 'Invoices', icon: 'receipt-outline' },
  { href: '/favorites', label: 'Favorites', icon: 'heart-outline' },
  { href: '/notifications', label: 'Notifications', icon: 'notifications-outline' },
  { href: '/settings', label: 'Settings', icon: 'settings-outline' },
  { href: '/support', label: 'Help and support', icon: 'help-circle-outline' },
] as const;

/** Desktop account shell: header + left sidebar nav + content, Fresha-style. */
export function AccountLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { allVenues } = useAppData();
  const ownsVenues = user ? allVenues.some((v) => v.owner_id === user.id) : false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <WebHeader showSearch />
      <View style={styles.body}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <BText variant="h2" style={{ paddingHorizontal: 14, marginBottom: 16 }}>
            {user?.name ?? 'Your account'}
          </BText>
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Pressable
                key={item.href}
                onPress={() => router.push(item.href as any)}
                style={({ hovered }: any) => [
                  styles.navItem,
                  active && { backgroundColor: colors.accentSoft },
                  hovered && !active && { backgroundColor: colors.bgPage },
                ]}
              >
                <Ionicons name={item.icon as any} size={18} color={active ? colors.accent : colors.ink} />
                <BText
                  style={{
                    fontFamily: active ? font.semibold : font.regular,
                    fontSize: 15,
                    color: active ? colors.accent : colors.ink,
                  }}
                >
                  {item.label}
                </BText>
              </Pressable>
            );
          })}
          <View style={styles.sideDivider} />
          <Pressable
            onPress={() => router.push(ownsVenues ? '/business/dashboard' : '/business')}
            style={({ hovered }: any) => [styles.navItem, hovered && { backgroundColor: colors.bgPage }]}
          >
            <Ionicons name="storefront-outline" size={18} color={colors.ink} />
            <BText style={{ fontFamily: font.regular, fontSize: 15, color: colors.ink }}>
              {ownsVenues ? 'Business dashboard' : 'Bink for Business'}
            </BText>
          </Pressable>
          {user?.role === 'admin' && (
            <Pressable
              onPress={() => router.push('/admin')}
              style={({ hovered }: any) => [styles.navItem, hovered && { backgroundColor: colors.bgPage }]}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.ink} />
              <BText style={{ fontFamily: font.regular, fontSize: 15, color: colors.ink }}>Admin</BText>
            </Pressable>
          )}
        </View>

        {/* Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          <BText variant="h1" style={{ marginBottom: 24 }}>
            {title}
          </BText>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
  },
  sidebar: {
    width: 280,
    paddingTop: 40,
    paddingLeft: 32,
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: colors.divider,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    height: 46,
    borderRadius: radius.md,
    marginBottom: 2,
  },
  sideDivider: { height: 1, backgroundColor: colors.divider, marginVertical: 12, marginHorizontal: 14 },
  content: {
    paddingTop: 40,
    paddingLeft: 48,
    paddingRight: 48,
    paddingBottom: 60,
    width: '100%',
    maxWidth: 1400,
  },
});
