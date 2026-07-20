import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SectionRail } from '../components/section-rail';
import { HeroSearchDesktop } from '../components/search-bar';
import { RatingStars } from '../components/ui/rating';
import { BText } from '../components/ui/text';
import { Avatar } from '../components/ui/avatar';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '../components/web-header';
import { SkeletonRail } from '../components/skeleton';
import { HeroGradient } from '../components/hero-gradient';
import { useAppData } from '../lib/app-data-context';
import { homeRails } from '../lib/home-rails';
import { useI18n } from '../lib/i18n';
import { colors, font, maxContentWidth, radius, shadow } from '../lib/theme';

const TESTIMONIALS = [
  { title: 'The best booking system', body: 'Great experience, easy to book. Paying for my salon visits is so convenient — no cash or cards needed!', name: 'Sara', place: 'Riyadh' },
  { title: 'Easy to use & explore', body: 'Bink’s reminders make life so much easier. I also found a few good salons near me that I didn’t know existed.', name: 'Nouf', place: 'Jeddah' },
  { title: 'Great for finding barbers', body: 'Booking my barber takes seconds now, and paying through the app means no waiting at the till. Highly recommend it!', name: 'Khalid', place: 'Al Khobar' },
  { title: 'My go-to for hair & nails', body: 'Bink is my go-to app for hair appointments and nails. I can easily find and book salons near me — I love it!', name: 'Reem', place: 'Dammam' },
];

export function HomeDesktop() {
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const { venues, loading } = useAppData();
  const { featured, fresh, trending } = homeRails(venues);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.white }}>
      {/* Pink → ivory → orange wash, contained to the hero/header only */}
      <HeroGradient style={styles.hero}>
        <WebHeader transparent />
        <View style={styles.heroInner}>
          <BText variant="display" style={{ textAlign: 'center' }}>
            {t('Book your salon visit in seconds')}
          </BText>
          <BText variant="body" style={{ textAlign: 'center', marginTop: 12 }}>
            {t('Discover and book top-rated hair salons, barbershops and beauty studios near you')}
          </BText>
          <View style={{ marginTop: 32, width: '100%', alignItems: 'center' }}>
            <HeroSearchDesktop />
          </View>
          <View style={[styles.appPill, shadow.card]}>
            <BText variant="smallMedium">{t('Get the app')}</BText>
            <Ionicons name="qr-code-outline" size={16} color={colors.ink} />
          </View>
        </View>
      </HeroGradient>

      <View style={styles.content}>
        {loading ? (
          <View style={{ gap: 40 }}>
            <SkeletonRail />
            <SkeletonRail />
          </View>
        ) : (
          <>
            <SectionRail title={t('Recommended')} venues={featured} badge={(v) => (v.is_featured ? t('Featured') : null)} />
            <SectionRail title={t('New to Bink')} venues={fresh} badge={() => t('New')} />
            <SectionRail title={t('Trending')} venues={trending} />
          </>
        )}
      </View>

      {/* Reviews */}
      <View style={[styles.content, { marginTop: 72 }]}>
        <BText variant="h2">{t('Reviews')}</BText>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 20 }}>
          {TESTIMONIALS.map((tm) => (
            <View key={tm.name} style={styles.testimonial}>
              <RatingStars value={5} size={16} />
              <BText variant="h3" style={{ marginTop: 14 }}>
                {t(tm.title)}
              </BText>
              <BText variant="small" style={{ marginTop: 8, flex: 1 }}>
                {t(tm.body)}
              </BText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 }}>
                <Avatar name={tm.name} size={36} />
                <View>
                  <BText variant="smallMedium">{tm.name}</BText>
                  <BText variant="tiny">{t(tm.place)}</BText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* For business */}
      <View style={[styles.content, { marginTop: 120 }]}>
        <View style={styles.bizCard}>
          <BText style={{ fontFamily: font.extrabold, fontSize: 44, lineHeight: 52, color: colors.ink }}>
            {t('Bink for business')}
          </BText>
          <BText variant="body" style={{ marginTop: 16, maxWidth: 480 }}>
            {t('Online bookings around the clock, escrow-protected payments and a full dashboard for your team — built for salons and freelancers in Saudi Arabia.')}
          </BText>
          <Pressable
            style={({ hovered }: any) => [styles.bizBtn, hovered && { backgroundColor: colors.accentDark }]}
            onPress={() => router.push('/business')}
          >
            <BText style={{ fontFamily: font.bold, fontSize: 15, color: colors.white }}>{t('Find out more')}</BText>
            <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={16} color={colors.white} />
          </Pressable>
        </View>
      </View>

      <WebFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', paddingBottom: 72 },
  heroInner: {
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
    maxWidth: maxContentWidth + 48,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  appPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    height: 44,
    marginTop: 24,
  },
  testimonial: {
    flex: 1,
    backgroundColor: colors.bgPage,
    borderRadius: radius.lg,
    padding: 24,
  },
  bizCard: {
    backgroundColor: colors.bgPage,
    borderRadius: radius.xl,
    padding: 56,
  },
  bizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 48,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
    marginTop: 28,
  },
});
