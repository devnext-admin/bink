import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { colors, font, radius, shadow } from '../lib/theme';
import { BText } from './ui/text';

// Desktop hero search: single white pill, segmented inputs, round black button.
export function HeroSearchDesktop() {
  const router = useRouter();
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');

  const submit = () => router.push({ pathname: '/search', params: query ? { q: query } : {} });

  return (
    <View style={[styles.pill, shadow.card]}>
      <View style={styles.segment}>
        <Ionicons name="search" size={18} color={colors.ink} />
        <TextInput
          placeholder={t('All treatments')}
          placeholderTextColor={colors.ink}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          style={styles.input}
        />
      </View>
      <View style={styles.dividerV} />
      <View style={styles.segment}>
        <Ionicons name="location-outline" size={18} color={colors.ink} />
        <TextInput
          placeholder={t('Current location')}
          placeholderTextColor={colors.ink}
          value={location}
          onChangeText={setLocation}
          onSubmitEditing={submit}
          style={styles.input}
        />
      </View>
      <View style={styles.dividerV} />
      <View style={[styles.segment, { flex: 0.7 }]}>
        <Ionicons name="calendar-outline" size={18} color={colors.ink} />
        <BText variant="body">{t('Any time')}</BText>
      </View>
      <Pressable onPress={submit} style={({ hovered }: any) => [styles.searchBtn, hovered && { backgroundColor: colors.accentDark }]}>
        <BText style={{ fontFamily: font.bold, fontSize: 15, color: colors.white }}>{t('Search')}</BText>
      </Pressable>
    </View>
  );
}

// Mobile hero search: stacked rounded fields + full-width black button.
export function HeroSearchMobile() {
  const router = useRouter();
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const submit = () => router.push({ pathname: '/search', params: query ? { q: query } : {} });

  return (
    <View style={[styles.mobileCard, shadow.card]}>
      <View style={styles.mobileField}>
        <Ionicons name="search" size={18} color={colors.ink} />
        <TextInput
          placeholder={t('All treatments')}
          placeholderTextColor={colors.ink}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          style={styles.input}
        />
      </View>
      <View style={styles.dividerH} />
      <View style={styles.mobileField}>
        <Ionicons name="location-outline" size={18} color={colors.ink} />
        <BText variant="body">{t('Current location')}</BText>
      </View>
      <View style={styles.dividerH} />
      <View style={styles.mobileField}>
        <Ionicons name="calendar-outline" size={18} color={colors.ink} />
        <BText variant="body">{t('Any time')}</BText>
      </View>
      <Pressable onPress={submit} style={styles.mobileBtn}>
        <BText style={{ fontFamily: font.bold, fontSize: 16, color: colors.white }}>{t('Search Bink')}</BText>
      </Pressable>
    </View>
  );
}

// Compact pill for headers (venue page, search page).
export function CompactSearch({ onPress }: { onPress?: () => void }) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Pressable
      onPress={onPress ?? (() => router.push('/search'))}
      style={({ hovered }: any) => [styles.compact, hovered && { backgroundColor: colors.bgSubtle }]}
    >
      <BText variant="small" color={colors.ink} numberOfLines={1} style={styles.compactSegment}>
        {t('All treatments')}
      </BText>
      <View style={styles.compactDivider} />
      <BText variant="small" color={colors.ink} numberOfLines={1} style={styles.compactSegment}>
        {t('Current location')}
      </BText>
      <View style={styles.compactDivider} />
      <BText variant="small" color={colors.ink} numberOfLines={1} style={styles.compactSegment}>
        {t('Any time')}
      </BText>
      <View style={styles.compactBtn}>
        <Ionicons name="search" size={14} color={colors.white} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    padding: 8,
    paddingLeft: 24,
    width: '100%',
    maxWidth: 880,
  },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 12 },
  input: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 10,
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
  dividerV: { width: 1, height: 28, backgroundColor: colors.divider, marginRight: 16 },
  dividerH: { height: 1, backgroundColor: colors.divider },
  searchBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 48,
    paddingHorizontal: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 12,
    width: '100%',
  },
  mobileField: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 8 },
  mobileBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingLeft: 18,
    paddingRight: 6,
    height: 44,
    backgroundColor: colors.white,
  },
  compactSegment: { flex: 1 },
  compactDivider: { width: 1, height: 20, backgroundColor: colors.divider },
  compactBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
