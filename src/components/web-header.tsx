import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '../lib/auth-context';
import { colors, font, maxContentWidth, radius } from '../lib/theme';
import { Logo } from './logo';
import { CompactSearch } from './search-bar';
import { BText } from './ui/text';

interface WebHeaderProps {
  transparent?: boolean; // over the hero gradient
  showSearch?: boolean;
}

export function WebHeader({ transparent, showSearch }: WebHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View style={[styles.wrap, !transparent && styles.solid]}>
      <View style={styles.inner}>
        <Logo />
        {showSearch ? (
          <View style={{ flex: 1, maxWidth: 520, marginHorizontal: 24 }}>
            <CompactSearch />
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <HeaderPill
            label={user ? (user.name ?? 'Account') : 'Log in'}
            onPress={() => router.push(user ? '/profile' : '/auth')}
          />
          <HeaderPill label="For business" onPress={() => router.push('/business')} />
          {user?.role === 'admin' && <HeaderPill label="Admin" onPress={() => router.push('/admin')} />}
          <Pressable
            onPress={() => router.push('/appointments')}
            style={({ hovered }: any) => [styles.menuPill, hovered && { backgroundColor: colors.bgSubtle }]}
          >
            <BText style={{ fontFamily: font.semibold, fontSize: 14, color: colors.ink }}>Menu</BText>
            <Ionicons name="menu" size={16} color={colors.ink} />
          </Pressable>
        </View>
      </View>
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
  wrap: { width: '100%', zIndex: 10 },
  solid: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.divider },
  inner: {
    width: '100%',
    maxWidth: maxContentWidth + 48,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    height: 68,
  },
  pill: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
});
