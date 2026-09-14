import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { BText } from '@bink/shared/components/ui/text';
import { useAppData } from '@bink/shared/lib/app-data-context';
import { useI18n } from '@bink/shared/lib/i18n';
import { colors, font, radius } from '@bink/shared/lib/theme';

// Quick category picker: an "All" tile plus one tile per category, each opening
// search pre-filtered to that category. A wrapped grid so every category is
// visible at a glance on the home screen.
export function CategoryRail({ columns = 4 }: { columns?: number }) {
  const router = useRouter();
  const { t } = useI18n();
  const { categories } = useAppData();

  const go = (slug?: string) =>
    router.push({ pathname: '/search', params: slug ? { category: slug } : {} });

  const items = [
    { key: 'all', name: 'All', icon: 'apps-outline', slug: '' },
    ...categories.map((c) => ({ key: c.slug, name: c.name, icon: c.icon || 'sparkles-outline', slug: c.slug })),
  ];

  return (
    <View style={styles.grid}>
      {items.map((c) => (
        <Pressable
          key={c.key}
          onPress={() => go(c.slug || undefined)}
          style={[styles.item, { width: `${100 / columns}%` }]}
        >
          {({ hovered }: any) => (
            <>
              <View style={[styles.tile, hovered && { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
                <Ionicons name={c.icon as any} size={24} color={colors.ink} />
              </View>
              <BText style={styles.label} numberOfLines={2}>
                {t(c.name)}
              </BText>
            </>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  item: { alignItems: 'center', paddingVertical: 8, gap: 8 },
  tile: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: font.medium,
    fontSize: 12,
    lineHeight: 15,
    color: colors.ink,
    textAlign: 'center',
    maxWidth: 84,
  },
});
