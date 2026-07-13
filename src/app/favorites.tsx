import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountLayout } from '../components/account-layout';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { SignInGate } from '../components/signin-gate';
import { Button } from '../components/ui/button';
import { BText } from '../components/ui/text';
import { VenueCard } from '../components/venue-card';
import { useAppData } from '../lib/app-data-context';
import { useAuth } from '../lib/auth-context';
import { useI18n } from '../lib/i18n';
import { colors } from '../lib/theme';
import { useIsDesktop } from '../lib/use-layout';

export default function Favorites() {
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const { venues, favorites } = useAppData();
  const favVenues = venues.filter((v) => favorites.includes(v.id));

  const content = favVenues.length ? (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
      {favVenues.map((v) => (
        <VenueCard key={v.id} venue={v} width={isDesktop ? 226 : undefined} />
      ))}
    </View>
  ) : (
    <View style={styles.empty}>
      <Ionicons name="heart-outline" size={44} color={colors.grayLight} />
      <BText variant="h3" style={{ marginTop: 16 }}>
        {t('No favorites yet')}
      </BText>
      <BText variant="small" style={{ marginTop: 6, textAlign: 'center' }}>
        {t('Tap the heart on any salon to save it here.')}
      </BText>
      <View style={{ marginTop: 20 }}>
        <Button title={t('Find a salon')} onPress={() => router.push('/search')} />
      </View>
    </View>
  );

  if (!user && !isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.white }}>
        <SignInGate icon="heart-outline" title={t('Favorites')} />
        <BottomTabs />
      </View>
    );
  }

  if (isDesktop) {
    return <AccountLayout title={t('Favorites')}>{content}</AccountLayout>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: TAB_BAR_HEIGHT + 32 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.ink} />
          </Pressable>
          <BText variant="h1">{t('Favorites')}</BText>
        </View>
        {content}
      </ScrollView>
      <BottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
});
