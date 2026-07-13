import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useAppData } from '../lib/app-data-context';
import { useAuth } from '../lib/auth-context';
import { useI18n } from '../lib/i18n';
import { colors, font, radius } from '../lib/theme';
import { SignInGate } from './signin-gate';
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

/**
 * Desktop account shell: header + left sidebar nav + content, Fresha-style.
 * The shell spans the full viewport; the content column stays at a readable
 * width, centered in the space right of the sidebar. `wide` is for two-pane
 * screens like Messages.
 */
export function AccountLayout({
  title,
  children,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const { user } = useAuth();
  const { allVenues } = useAppData();
  const ownsVenues = user ? allVenues.some((v) => v.owner_id === user.id) : false;

  // The account area only exists for signed-in people (guests included —
  // they opted in and their data lives on this device).
  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.white }}>
        <WebHeader showSearch />
        <SignInGate title={title} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <WebHeader showSearch />
      <View style={styles.body}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <BText variant="h2" style={{ paddingHorizontal: 14, marginBottom: 16 }}>
            {user?.name ?? t('Your account')}
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
                  {t(item.label)}
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
              {t(ownsVenues ? 'Business dashboard' : 'Bink for Business')}
            </BText>
          </Pressable>
          {user?.role === 'admin' && (
            <Pressable
              onPress={() => router.push('/admin')}
              style={({ hovered }: any) => [styles.navItem, hovered && { backgroundColor: colors.bgPage }]}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.ink} />
              <BText style={{ fontFamily: font.regular, fontSize: 15, color: colors.ink }}>{t('Admin')}</BText>
            </Pressable>
          )}
        </View>

        {/* Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
          <View style={[styles.inner, wide && styles.innerWide]}>
            <BText variant="h1" style={{ marginBottom: 24 }}>
              {title}
            </BText>
            {children}
          </View>
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
    paddingHorizontal: 48,
    paddingBottom: 60,
    width: '100%',
    alignItems: 'center',
  },
  inner: { width: '100%', maxWidth: 720 },
  innerWide: { maxWidth: 1160 },
});
