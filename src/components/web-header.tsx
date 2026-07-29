import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAppData } from '../lib/app-data-context';
import { useAuth } from '../lib/auth-context';
import { useI18n } from '../lib/i18n';
import { colors, font, radius, shadow } from '../lib/theme';
import { Logo } from './logo';
import { NotificationsBell } from './notifications-bell';
import { CompactSearch } from './search-bar';
import { Avatar } from './ui/avatar';
import { BText } from './ui/text';

interface WebHeaderProps {
  transparent?: boolean; // over the hero gradient
  showSearch?: boolean;
}

export function WebHeader({ transparent, showSearch }: WebHeaderProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const { allVenues } = useAppData();
  const [menuOpen, setMenuOpen] = useState(false);
  const ownsVenues = user ? allVenues.some((v) => v.owner_id === user.id) : false;

  const go = (href: string) => {
    setMenuOpen(false);
    router.push(href as any);
  };

  // Role-aware menu: customers see customer things only, owners additionally
  // get their dashboard, and Bink admins get a slim staff menu.
  const logoutItem = {
    label: 'Log out',
    icon: 'log-out-outline',
    onPress: async () => {
      setMenuOpen(false);
      await signOut();
      router.replace('/');
    },
  };
  const menuItems: { label: string; icon: string; onPress: () => void }[] =
    user?.role === 'admin'
      ? [
          { label: 'Admin', icon: 'shield-checkmark-outline', onPress: () => { setMenuOpen(false); router.replace('/admin' as any); } },
          { label: 'Profile', icon: 'person-outline', onPress: () => go('/profile') },
          { label: 'Settings', icon: 'settings-outline', onPress: () => go('/settings') },
          logoutItem,
        ]
      : [
          ...(ownsVenues
            ? [{
                label: 'Business dashboard',
                icon: 'storefront-outline',
                onPress: () => { setMenuOpen(false); router.replace('/business/dashboard' as any); },
              }]
            : []),
          { label: 'Profile', icon: 'person-outline', onPress: () => go('/profile') },
          { label: 'Appointments', icon: 'calendar-outline', onPress: () => go('/appointments') },
          { label: 'Messages', icon: 'chatbubble-ellipses-outline', onPress: () => go('/messages') },
          { label: 'Favorites', icon: 'heart-outline', onPress: () => go('/favorites') },
          { label: 'Settings', icon: 'settings-outline', onPress: () => go('/settings') },
          logoutItem,
        ];

  return (
    <View style={[styles.wrap, !transparent && styles.solid]}>
      <View style={styles.inner}>
        <Logo />
        <View style={{ flex: 1 }} />
        {showSearch && (
          <View pointerEvents="box-none" style={styles.searchOverlay}>
            <View style={{ width: '100%', maxWidth: 520 }}>
              <CompactSearch />
            </View>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {/* Salon acquisition CTA - only for visitors who aren't signed in.
              Signed-in customers shouldn't be pushed business links; owners
              and admins have their own entries in the avatar menu. */}
          {!user && <HeaderPill label={t('For business')} onPress={() => router.push('/business')} />}
          {user ? (
            <>
              <NotificationsBell />
              <Pressable
                onPress={() => setMenuOpen((o) => !o)}
                style={({ hovered }: any) => [styles.avatarBtn, hovered && { backgroundColor: colors.bgSubtle }]}
              >
                <Avatar name={t(user.name ?? user.email ?? 'You')} size={32} />
                <Ionicons name={menuOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.ink} />
              </Pressable>
            </>
          ) : (
            <>
              <HeaderPill label={t('Log in')} onPress={() => router.push('/auth')} />
              <Pressable
                onPress={() => router.push('/auth?mode=signup' as any)}
                style={({ hovered }: any) => [styles.signupBtn, hovered && { backgroundColor: colors.accentDark }]}
              >
                <BText style={{ fontFamily: font.bold, fontSize: 14, color: colors.white }}>{t('Sign up')}</BText>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Avatar dropdown */}
      {menuOpen && user && (
        <>
          <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
          <View style={[styles.menu, shadow.floating]}>
            <View style={styles.menuHeader}>
              <Avatar name={t(user.name ?? user.email ?? 'You')} size={40} />
              <View style={{ flex: 1 }}>
                <BText variant="smallMedium" numberOfLines={1}>
                  {t(user.name ?? 'Welcome')}
                </BText>
                <BText variant="tiny" numberOfLines={1}>
                  {user.email ?? t('Guest account')}
                </BText>
              </View>
            </View>
            {menuItems.map((item) => (
              <Pressable
                key={item.label}
                onPress={item.onPress}
                style={({ hovered }: any) => [styles.menuItem, hovered && { backgroundColor: colors.bgPage }]}
              >
                <Ionicons name={item.icon as any} size={17} color={item.label === 'Log out' ? colors.danger : colors.ink} />
                <BText
                  variant="smallMedium"
                  color={item.label === 'Log out' ? colors.danger : colors.ink}
                >
                  {t(item.label)}
                </BText>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function HeaderPill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [styles.pill, hovered && { backgroundColor: colors.bgSubtle }]}
    >
      <BText style={{ fontFamily: font.semibold, fontSize: 14, color: colors.ink }}>{label}</BText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', zIndex: 50 },
  solid: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.divider },
  inner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    height: 68,
  },
  searchOverlay: {
    // Centered on the viewport, not the leftover flex space - the logo and
    // the right-side actions have different widths.
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingLeft: 5,
    paddingRight: 10,
    height: 44,
    backgroundColor: colors.white,
  },
  backdrop: {
    position: 'absolute',
    top: -2000,
    left: -4000,
    right: -4000,
    bottom: -4000,
    zIndex: 60,
  },
  menu: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 260,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingVertical: 8,
    zIndex: 70,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    height: 42,
  },
});
