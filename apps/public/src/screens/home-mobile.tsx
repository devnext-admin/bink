import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { CategoryRail } from '../components/category-rail';
import { Logo } from '@bink/shared/components/logo';
import { NotificationsBell } from '@bink/shared/components/notifications-bell';
import { Onboarding } from '../components/onboarding';
import { SectionRail } from '../components/section-rail';
import { BText } from '@bink/shared/components/ui/text';
import { SkeletonRail } from '../components/skeleton';
import { useAppData } from '@bink/shared/lib/app-data-context';
import { homeRails } from '../lib/home-rails';
import { useI18n } from '@bink/shared/lib/i18n';
import { colors, font, radius, shadow } from '@bink/shared/lib/theme';

export function HomeMobile() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const { venues, loading } = useAppData();
  const { featured, fresh, trending } = homeRails(venues);

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView
        style={{ backgroundColor: colors.white }}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
          <View style={styles.topRow}>
            <Logo />
            <NotificationsBell />
          </View>

          {/* Location selector */}
          <Pressable
            onPress={() => router.push('/search')}
            style={[styles.locationRow, isRTL && { flexDirection: 'row-reverse' }]}
            hitSlop={6}
          >
            <Ionicons name="location" size={18} color={colors.accent} />
            <BText style={{ fontFamily: font.semibold, fontSize: 15, color: colors.ink }}>
              {t('Current location')}
            </BText>
            <Ionicons name="chevron-down" size={16} color={colors.gray} />
          </Pressable>

          {/* Search bar */}
          <Pressable onPress={() => router.push('/search')} style={[styles.search, shadow.card]}>
            <Ionicons name="search" size={20} color={colors.gray} />
            <BText style={{ flex: 1, fontFamily: font.regular, fontSize: 15, color: colors.gray }} numberOfLines={1}>
              {t('Search venues, treatments')}
            </BText>
            <View style={styles.searchBtn}>
              <BText style={{ fontFamily: font.bold, fontSize: 14, color: colors.white }}>{t('Search')}</BText>
            </View>
          </Pressable>

          {/* Category shortcuts */}
          <View style={{ marginTop: 18 }}>
            <CategoryRail columns={4} />
          </View>
        </View>

        <View style={styles.divider} />

        {loading ? (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <SkeletonRail count={2} cardWidth={240} />
          </View>
        ) : (
          <>
            <SectionRail title={t('Recommended')} venues={featured} badge={() => t('Best in class')} cardWidth={240} paddingHorizontal={20} />
            <SectionRail title={t('New to Bink')} venues={fresh} badge={() => t('New')} cardWidth={240} paddingHorizontal={20} />
            <SectionRail title={t('Trending near you')} venues={trending} cardWidth={240} paddingHorizontal={20} />
          </>
        )}
      </ScrollView>
      <BottomTabs />
      <Onboarding />
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    height: 58,
    paddingLeft: 18,
    paddingRight: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  searchBtn: {
    height: 42,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 8, backgroundColor: colors.bgPage, marginTop: 20, marginBottom: 4 },
});
