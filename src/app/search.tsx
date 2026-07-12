import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { Chip } from '../components/ui/chip';
import { BText } from '../components/ui/text';
import { VenueCard } from '../components/venue-card';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '../components/web-header';
import { useAppData } from '../lib/app-data-context';
import { searchVenues } from '../lib/data';
import { useI18n } from '../lib/i18n';
import { colors, font, maxContentWidth, radius } from '../lib/theme';
import { useIsDesktop } from '../lib/use-layout';

export default function Search() {
  const { t } = useI18n();
  const isDesktop = useIsDesktop();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const { venues, categories } = useAppData();
  const [query, setQuery] = useState(params.q ?? '');
  const [categorySlug, setCategorySlug] = useState<string | undefined>(params.category);
  const [sortBy, setSortBy] = useState<'recommended' | 'rating' | 'reviews' | 'price'>('recommended');
  const [priceBand, setPriceBand] = useState<0 | 1 | 2 | 3>(0); // 0 = any
  const insets = useSafeAreaInsets();

  const avgPrice = (v: (typeof venues)[number]) =>
    v.services.length ? v.services.reduce((c, x) => c + x.price_cents, 0) / v.services.length : 0;

  const results = useMemo(() => {
    let out = searchVenues(venues, query, categorySlug, categories);
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
    return out;
  }, [venues, query, categorySlug, categories, sortBy, priceBand]);

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
        <Chip label={t('Top rated')} selected={sortBy === 'rating'} onPress={() => setSortBy(sortBy === 'rating' ? 'recommended' : 'rating')} />
        <Chip label={t('Most reviewed')} selected={sortBy === 'reviews'} onPress={() => setSortBy(sortBy === 'reviews' ? 'recommended' : 'reviews')} />
        <Chip label={t('Lowest price')} selected={sortBy === 'price'} onPress={() => setSortBy(sortBy === 'price' ? 'recommended' : 'price')} />
        <Chip label="﷼" selected={priceBand === 1} onPress={() => setPriceBand(priceBand === 1 ? 0 : 1)} />
        <Chip label="﷼﷼" selected={priceBand === 2} onPress={() => setPriceBand(priceBand === 2 ? 0 : 2)} />
        <Chip label="﷼﷼﷼" selected={priceBand === 3} onPress={() => setPriceBand(priceBand === 3 ? 0 : 3)} />
      </ScrollView>
    </View>
  );

  const searchInput = (
    <View style={styles.searchField}>
      <Ionicons name="search" size={18} color={colors.ink} />
      <TextInput
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
          <View style={styles.grid}>
            {results.map((v) => (
              <VenueCard key={v.id} venue={v} width={276} />
            ))}
          </View>
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
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20, gap: 12 }}>
        <BText variant="h1">{t('Search')}</BText>
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
        {results.map((v) => (
          <VenueCard key={v.id} venue={v} />
        ))}
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
