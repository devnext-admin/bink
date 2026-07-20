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
import { HeroGradient } from '../components/hero-gradient';
import { useAppData } from '../lib/app-data-context';
import { homeRails } from '../lib/home-rails';
import { useI18n } from '../lib/i18n';
import { colors, font } from '../lib/theme';

export function HomeMobile() {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { venues, loading } = useAppData();
  const { featured, fresh, trending } = homeRails(venues);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ backgroundColor: colors.white }} contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 32 }}>
        {/* Pink → ivory → orange wash, contained to the hero/header only */}
        <HeroGradient style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 32 }}>
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
        </HeroGradient>

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
