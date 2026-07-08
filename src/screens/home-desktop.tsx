import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SectionRail } from '../components/section-rail';
import { HeroSearchDesktop } from '../components/search-bar';
import { RatingStars } from '../components/ui/rating';
import { BText } from '../components/ui/text';
import { Avatar } from '../components/ui/avatar';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '../components/web-header';
import { useAppData } from '../lib/app-data-context';
import { colors, font, maxContentWidth, radius, shadow } from '../lib/theme';

const TESTIMONIALS = [
  { title: 'The best booking system', body: 'Great experience, easy to book. Paying for my salon visits is so convenient — no cash or cards needed!', name: 'Lucy', place: 'London, UK' },
  { title: 'Easy to use & explore', body: 'Bink’s reminders make life so much easier. I also found a few good barbershops that I didn’t know existed.', name: 'Dan', place: 'New York, USA' },
  { title: 'Great for finding barbers', body: 'I’ve been using Bink for two years and it’s by far the best salon booking platform I’ve used. Highly recommend it!', name: 'Dale', place: 'Sydney, Australia' },
  { title: 'My go-to for hair & nails', body: 'Bink is my go-to app for hair appointments and nails. I can easily find and book salons near me — I love it!', name: 'Cameron', place: 'Edinburgh, UK' },
];

const STATS = [
  { big: '130,000+', small: 'partner salons' },
  { big: '120+ countries', small: 'using Bink' },
  { big: '450,000+', small: 'stylists and professionals' },
];

export function HomeDesktop() {
  const { venues } = useAppData();
  const featured = venues.filter((v) => v.is_featured);
  const fresh = venues.filter((v) => v.is_new);
  const trending = venues.filter((v) => v.is_trending);
  const bookedToday = 397267;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.white }}>
      <LinearGradient
        colors={[...colors.heroGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <WebHeader transparent />
        <View style={styles.heroInner}>
          <BText variant="display" style={{ textAlign: 'center' }}>
            Book your salon visit in seconds
          </BText>
          <BText variant="body" style={{ textAlign: 'center', marginTop: 12 }}>
            Discover top-rated hair salons, barbershops, nail studios and beauty salons trusted by millions
          </BText>
          <View style={{ marginTop: 32, width: '100%', alignItems: 'center' }}>
            <HeroSearchDesktop />
          </View>
          <BText variant="bodyMedium" style={{ marginTop: 28 }}>
            <BText style={{ fontFamily: font.bold, fontSize: 16 }}>{bookedToday.toLocaleString()}</BText>{' '}
            appointments booked today
          </BText>
          <View style={[styles.appPill, shadow.card]}>
            <BText variant="smallMedium">Get the app</BText>
            <Ionicons name="qr-code-outline" size={16} color={colors.ink} />
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <SectionRail title="Recommended" venues={featured} badge={(v) => (v.is_featured ? 'Featured' : null)} />
        <SectionRail title="New to Bink" venues={fresh} badge={() => 'New'} />
        <SectionRail title="Trending" venues={trending} />
      </View>

      {/* Reviews */}
      <View style={[styles.content, { marginTop: 72 }]}>
        <BText variant="h2">Reviews</BText>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 20 }}>
          {TESTIMONIALS.map((t) => (
            <View key={t.name} style={styles.testimonial}>
              <RatingStars value={5} size={16} />
              <BText variant="h3" style={{ marginTop: 14 }}>
                {t.title}
              </BText>
              <BText variant="small" style={{ marginTop: 8, flex: 1 }}>
                {t.body}
              </BText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 }}>
                <Avatar name={t.name} size={36} />
                <View>
                  <BText variant="smallMedium">{t.name}</BText>
                  <BText variant="tiny">{t.place}</BText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Stats band */}
      <View style={{ alignItems: 'center', marginTop: 96, paddingHorizontal: 24 }}>
        <BText variant="h1" style={{ textAlign: 'center' }}>
          The top-rated destination for salons
        </BText>
        <BText variant="body" style={{ marginTop: 8, textAlign: 'center' }}>
          One solution, one software. Trusted by the best salons in the industry
        </BText>
        <BText style={{ fontFamily: font.extrabold, fontSize: 72, lineHeight: 84, color: colors.pink, marginTop: 40 }}>
          1 billion+
        </BText>
        <BText variant="bodyMedium">appointments booked on Bink</BText>
        <View style={{ flexDirection: 'row', gap: 96, marginTop: 56 }}>
          {STATS.map((s) => (
            <View key={s.big} style={{ alignItems: 'center' }}>
              <BText style={{ fontFamily: font.extrabold, fontSize: 28, lineHeight: 36, color: colors.ink }}>
                {s.big}
              </BText>
              <BText variant="body" style={{ marginTop: 4 }}>
                {s.small}
              </BText>
            </View>
          ))}
        </View>
      </View>

      {/* For business */}
      <View style={[styles.content, { marginTop: 120 }]}>
        <View style={styles.bizCard}>
          <BText style={{ fontFamily: font.extrabold, fontSize: 44, lineHeight: 52, color: colors.ink }}>
            Bink for business
          </BText>
          <BText variant="body" style={{ marginTop: 16, maxWidth: 480 }}>
            Supercharge your salon with the world’s top booking platform for salons and barbershops.
            Independently voted no. 1 by industry professionals.
          </BText>
          <View style={styles.bizBtn}>
            <BText style={{ fontFamily: font.bold, fontSize: 15, color: colors.white }}>Find out more</BText>
            <Ionicons name="arrow-forward" size={16} color={colors.white} />
          </View>
          <View style={{ marginTop: 48 }}>
            <BText variant="h3">Excellent 5/5</BText>
            <View style={{ marginTop: 8 }}>
              <RatingStars value={5} size={18} />
            </View>
            <BText variant="small" style={{ marginTop: 8 }}>
              Over 1250 reviews
            </BText>
          </View>
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
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    height: 48,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
    marginTop: 28,
  },
});
