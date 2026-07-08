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
import { colors, font, maxContentWidth, radius } from '../lib/theme';
import { useIsDesktop } from '../lib/use-layout';

export default function Search() {
  const isDesktop = useIsDesktop();
  const params = useLocalSearchParams<{ q?: string; category?: string }>();
  const { venues, categories } = useAppData();
  const [query, setQuery] = useState(params.q ?? '');
  const [categorySlug, setCategorySlug] = useState<string | undefined>(params.category);
  const insets = useSafeAreaInsets();

  const results = useMemo(
    () => searchVenues(venues, query, categorySlug, categories),
    [venues, query, categorySlug, categories]
  );

  const chips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      <Chip label="All" selected={!categorySlug} onPress={() => setCategorySlug(undefined)} />
      {categories.map((c) => (
        <Chip
          key={c.slug}
          label={c.name}
          selected={categorySlug === c.slug}
          onPress={() => setCategorySlug(categorySlug === c.slug ? undefined : c.slug)}
        />
      ))}
    </ScrollView>
  );

  const searchInput = (
    <View style={styles.searchField}>
      <Ionicons name="search" size={18} color={colors.ink} />
      <TextInput
        placeholder="Search treatments, salons or cities"
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
            {results.length} salon{results.length === 1 ? '' : 's'}
            {query ? ` for “${query}”` : ' near you'}
          </BText>
          <View style={styles.grid}>
            {results.map((v) => (
              <VenueCard key={v.id} venue={v} width={276} />
            ))}
          </View>
          {!results.length && (
            <BText variant="body" style={{ marginTop: 24 }}>
              No salons found. Try a different treatment or city.
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
        <BText variant="h1">Search</BText>
        {searchInput}
        {chips}
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: TAB_BAR_HEIGHT + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <BText variant="small">
          {results.length} salon{results.length === 1 ? '' : 's'} found
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
