import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { useI18n } from '../lib/i18n';
import { colors, font, radius } from '../lib/theme';
import { BText } from './ui/text';

/** Floating pill shown while an admin is viewing the app as a customer. */
export function EmulationBanner() {
  const { emulating, stopEmulating } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!emulating) return null;

  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <View style={styles.pill}>
        <Ionicons name="eye-outline" size={15} color={colors.white} />
        <BText style={{ fontFamily: font.semibold, fontSize: 13, color: colors.white }}>
          {t('Viewing as {name}', { name: emulating.name ?? t('Customer') })}
        </BText>
        <Pressable
          onPress={async () => {
            await stopEmulating();
            router.replace('/admin');
          }}
          style={({ hovered }: any) => [styles.exit, hovered && { backgroundColor: 'rgba(255,255,255,0.3)' }]}
        >
          <BText style={{ fontFamily: font.bold, fontSize: 12, color: colors.white }}>{t('Exit')}</BText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingLeft: 14,
    paddingRight: 6,
    height: 36,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  exit: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
