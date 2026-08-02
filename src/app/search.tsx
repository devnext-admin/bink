import { Seo } from '../components/seo';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { Chip } from '../components/ui/chip';
import { BText } from '../components/ui/text';
import { SearchMap } from '../components/search-map';
import { VenueCard } from '../components/venue-card';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '../components/web-header';
import { useAppData } from '../lib/app-data-context';
import { distanceKm, distanceLabel, isOpenAt } from '../lib/availability';
import { searchVenues } from '../lib/data';
import { formatDate, useI18n } from '../lib/i18n';
import { getLocationIfGranted } from '../lib/location';
import { colors, font, maxContentWidth, radius } from '../lib/theme';
import { useIsDesktop } from '../lib/use-layout';

export default function Search() {
  const { t, isRTL, lang } = useI18n();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const params = useLocalSearchParams<{
    q?: string;
    category?: string;
    lat?: string;
    lng?: string;
    date?: string;
    time?: string;
  }>();
  const { venues, categories } = useAppData();
  const [query, setQuery] = useState(params.q ?? '');
  const [categorySlug, setCategorySlug] = useState<string | undefined>(params.category);
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'reviews' | 'price' | 'nearest'>('recommended');
  const [priceBand, setPriceBand] = useState<0 | 1 | 2 | 3>(0); // 0 = any
  const [showMap, setShowMap] = useState(false);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(() =>
    params.lat && params.lng ? { lat: Number(params.lat), lng: Number(params.lng) } : null
  );
  // "Open at" filter handed over from the hero search's date and time picker
  const [when, setWhen] = useState<{ date: string; time: string } | null>(
    params.date && params.time ? { date: params.date, time: params.time } : null
  );
  const insets = useSafeAreaInsets();

  // Device position for distances (web and native); never prompts on its own -
  // it only uses a permission the user already granted.
  React.useEffect(() => {
    if (myLoc) return;
    getLocationIfGranted().then((p) => {
      if (p) setMyLoc({ lat: p.lat, lng: p.lng });
    }, () => {});
  }, []);

  const distanceOf = (v: (typeof venues)[number]) =>
    myLoc && v.lat != null && v.lng != null ? distanceKm(myLoc.lat, myLoc.lng, v.lat, v.lng) : null;

  const avgPrice = (v: (typeof venues)[number]) =>
    v.services.length ? v.services.reduce((c, x) => c + x.price_cents, 0) / v.services.length : 0;

  const whenDate = useMemo(() => {
    if (!when) return null;
    const [y, m, d] = when.date.split('-').map(Number);
    const [h, min] = when.time.split(':').map(Number);
    return new Date(y, m - 1, d, h, min);
  }, [when]);

  const results = useMemo(() => {
    let out = searchVenues(venues, query, categorySlug, categories);
    if (whenDate) out = out.filter((v) => isOpenAt(v, whenDate));
    if (priceBand) {
      out = out.filter((v) => {
        const avg = avgPrice(v);
        if (priceBand === 1) return avg <= 15000;
        if (priceBand === 2) return avg > 15000 && avg <= 35000;
        return avg > 35000;
      });
    }
    if (sortBy === 'rating') out = [...out].sort((a, b) => b.rating_avg - a.rating_avg);
    else if (sortBy === 'reviews') out = [...out].sort((a, b) => b.rating_count - a.rating_count);
    else if (sortBy === 'price') out = [...out].sort((a, b) => avgPrice(a) - avgPrice(b));
    else if (sortBy === 'nearest' && myLoc)
      out = [...out].sort((a, b) => (distanceOf(a) ?? 1e9) - (distanceOf(b) ?? 1e9));
    return out;
  }, [venues, query, categorySlug, categories, sortBy, priceBand, myLoc, whenDate]);

  const chips = (
    <View style={{ gap: 8 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label={t('All')} selected={!categorySlug} onPress={() => setCategorySlug(undefined)} />
        {categories.map((c) => (
          <Chip
            key={c.slug}
            label={t(c.name)}
            selected={categorySlug === c.slug}
            onPress={() => setCategorySlug(categorySlug === c.slug ? undefined : c.slug)}
          />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {when && whenDate ? (
          <Chip
            label={`${t('Open')} ${formatDate(lang, whenDate, { weekday: 'short', day: 'numeric', month: 'short' })} · ${when.time} ✕`}
            selected
            onPress={() => setWhen(null)}
          />
        ) : null}
        <Chip label={t('Top rated')} selected={sortBy === 'rating'} onPress={() => setSortBy(sortBy === 'rating' ? 'recommended' : 'rating')} />
        <Chip label={t('Most reviewed')} selected={sortBy === 'reviews'} onPress={() => setSortBy(sortBy === 'reviews' ? 'recommended' : 'reviews')} />
        <Chip label={t('Lowest price')} selected={sortBy === 'price'} onPress={() => setSortBy(sortBy === 'price' ? 'recommended' : 'price')} />
        {myLoc ? (
          <Chip label={t('Nearest')} selected={sortBy === 'nearest'} onPress={() => setSortBy(sortBy === 'nearest' ? 'recommended' : 'nearest')} />
        ) : null}
        {Platform.OS === 'web' ? (
          <Chip label={showMap ? t('List') : t('Map')} selected={showMap} onPress={() => setShowMap(!showMap)} />
        ) : null}
        <Chip label={"\u200E0–100 ﷼"} selected={priceBand === 1} onPress={() => setPriceBand(priceBand === 1 ? 0 : 1)} />
        <Chip label={"\u200E100–250 ﷼"} selected={priceBand === 2} onPress={() => setPriceBand(priceBand === 2 ? 0 : 2)} />
        <Chip label={"\u200E250+ ﷼"} selected={priceBand === 3} onPress={() => setPriceBand(priceBand === 3 ? 0 : 3)} />
      </ScrollView>
    </View>
  );

  const searchInput = (
    <View style={styles.searchField}>
      <Ionicons name="search" size={18} color={colors.ink} />
      <TextInput
        {...({ dir: 'auto' } as any)}
        placeholder={t('Search treatments, salons or cities')}
        placeholderTextColor={colors.gray}
        value={query}
        onChangeText={setQuery}
        style={styles.input}
        autoFocus={false}
      />
      {query ? (
        <Ionicons name="close-circle" size={18} color={colors.gray} onPress={() => setQuery('')} />
      ) : null}
    </View>
  );

  if (isDesktop) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.white }}>
        <Seo title={t('Search salons, barbers & beauty')} description={t('Find and book salons near you on Bink.')} />
        <WebHeader showSearch={false} />
        <View style={styles.desktopContent}>
          <View style={{ maxWidth: 560 }}>{searchInput}</View>
          <View style={{ marginTop: 16 }}>{chips}</View>
          <BText variant="h2" style={{ marginTop: 32 }}>
            {query
              ? results.length === 1
                ? t('1 salon for “{q}”', { q: query })
                : t('{n} salons for “{q}”', { n: results.length, q: query })
              : results.length === 1
                ? t('1 salon near you')
                : t('{n} salons near you', { n: results.length })}
          </BText>
          {showMap ? (
            <View style={{ marginTop: 20 }}>
              <SearchMap venues={results} center={myLoc} />
            </View>
          ) : (
            <View style={styles.grid}>
              {results.map((v) => (
                <VenueCard key={v.id} venue={v} width={276} distance={distanceOf(v) != null ? distanceLabel(distanceOf(v)!) : null} />
              ))}
            </View>
          )}
          {!results.length && (
            <BText variant="body" style={{ marginTop: 24 }}>
              {t('No salons found. Try a different treatment or city.')}
            </BText>
          )}
        </View>
        <WebFooter />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Seo title={t('Search salons, barbers & beauty')} description={t('Find and book salons near you on Bink.')} />
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={8}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.ink} />
          </Pressable>
          <BText variant="h1">{t('Search')}</BText>
        </View>
        {searchInput}
        {chips}
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: TAB_BAR_HEIGHT + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <BText variant="small">
          {results.length === 1 ? t('1 salon found') : t('{n} salons found', { n: results.length })}
        </BText>
        {showMap ? (
          <SearchMap venues={results} center={myLoc} />
        ) : (
          results.map((v) => (
            <VenueCard key={v.id} venue={v} distance={distanceOf(v) != null ? distanceLabel(distanceOf(v)!) : null} />
          ))
        )}
      </ScrollView>
      <BottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  desktopContent: {
    width: '100%',
    maxWidth: maxContentWidth + 48,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    minHeight: 600,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    marginTop: 20,
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    height: 48,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 16,
    color: colors.ink,
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
});
