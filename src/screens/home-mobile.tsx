import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { Logo } from '../components/logo';
import { NotificationsBell } from '../components/notifications-bell';
import { Onboarding } from '../components/onboarding';
import { SectionRail } from '../components/section-rail';
import { HeroSearchMobile } from '../components/search-bar';
import { BText } from '../components/ui/text';
import { SkeletonRail } from '../components/skeleton';
import { useAppData } from '../lib/app-data-context';
import { useI18n } from '../lib/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font } from '../lib/theme';

export function HomeMobile() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { venues, loading } = useAppData();
  const featured = venues.filter((v) => v.is_featured);
  const fresh = venues.filter((v) => v.is_new);
  const trending = venues.filter((v) => v.is_trending);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ backgroundColor: colors.white }} contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 32 }}>
        <LinearGradient
          colors={['#FFFFFF', '#FFE9EF', '#FFC7D8', '#FFE6E8', '#FFFBFA', 'rgba(255,255,255,0)']}
          locations={[0, 0.1, 0.28, 0.5, 0.74, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1150 }}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(255,56,92,0.08)', 'rgba(255,255,255,0)', 'rgba(255,148,94,0.09)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 700 }}
          pointerEvents="none"
        />
        <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Logo />
            <NotificationsBell />
          </View>
          <BText style={{ fontFamily: font.bold, fontSize: 34, lineHeight: 42, color: colors.ink, marginTop: 20 }}>
            {t('Book your salon visit in seconds')}
          </BText>
          <BText variant="body" style={{ marginTop: 8, marginBottom: 20 }}>
            {t('Discover and book top-rated hair salons, barbershops and beauty studios near you')}
          </BText>
          <HeroSearchMobile />
        </View>

        {loading ? (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <SkeletonRail count={2} cardWidth={240} />
          </View>
        ) : (
          <>
            <SectionRail title={t('Recommended')} venues={featured} badge={() => t('Featured')} cardWidth={240} paddingHorizontal={20} />
            <SectionRail title={t('New to Bink')} venues={fresh} badge={() => t('New')} cardWidth={240} paddingHorizontal={20} />
            <SectionRail title={t('Trending')} venues={trending} cardWidth={240} paddingHorizontal={20} />
          </>
        )}
      </ScrollView>
      <BottomTabs />
      <Onboarding />
    </View>
  );
}
