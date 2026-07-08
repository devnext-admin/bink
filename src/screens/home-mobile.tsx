import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { Logo } from '../components/logo';
import { Onboarding } from '../components/onboarding';
import { SectionRail } from '../components/section-rail';
import { HeroSearchMobile } from '../components/search-bar';
import { BText } from '../components/ui/text';
import { useAppData } from '../lib/app-data-context';
import { colors, font } from '../lib/theme';

export function HomeMobile() {
  const insets = useSafeAreaInsets();
  const { venues } = useAppData();
  const featured = venues.filter((v) => v.is_featured);
  const fresh = venues.filter((v) => v.is_new);
  const trending = venues.filter((v) => v.is_trending);

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 32 }}>
        <LinearGradient
          colors={[...colors.heroGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 32 }}
        >
          <Logo />
          <BText style={{ fontFamily: font.bold, fontSize: 34, lineHeight: 42, color: colors.ink, marginTop: 20 }}>
            Book your salon visit in seconds
          </BText>
          <BText variant="body" style={{ marginTop: 8, marginBottom: 20 }}>
            Discover top-rated hair salons, barbershops, nail studios and beauty salons trusted by millions
            worldwide
          </BText>
          <HeroSearchMobile />
          <BText variant="smallMedium" style={{ textAlign: 'center', marginTop: 16 }}>
            <BText style={{ fontFamily: font.bold, fontSize: 14 }}>399,588</BText> appointments booked today
          </BText>
        </LinearGradient>

        <SectionRail title="Recommended" venues={featured} badge={() => 'Featured'} cardWidth={240} paddingHorizontal={20} />
        <SectionRail title="New to Bink" venues={fresh} badge={() => 'New'} cardWidth={240} paddingHorizontal={20} />
        <SectionRail title="Trending" venues={trending} cardWidth={240} paddingHorizontal={20} />
      </ScrollView>
      <BottomTabs />
      <Onboarding />
    </View>
  );
}
