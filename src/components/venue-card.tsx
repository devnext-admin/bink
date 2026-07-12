import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAppData } from '../lib/app-data-context';
import { useI18n } from '../lib/i18n';
import { colors, font, radius } from '../lib/theme';
import type { Venue } from '../lib/types';
import { Rating } from './ui/rating';
import { BText } from './ui/text';

interface VenueCardProps {
  venue: Venue;
  width?: number; // undefined = fill container
  badge?: string | null; // e.g. 'Featured' | 'New' | 'Deals' (may arrive pre-translated)
}

export function VenueCard({ venue, width, badge }: VenueCardProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { favorites, toggleFav, categoryOf } = useAppData();
  const isFav = favorites.includes(venue.id);
  const category = categoryOf(venue);

  return (
    <Pressable
      onPress={() => router.push(`/venue/${venue.slug}`)}
      style={({ hovered }: any) => [{ width: width ?? '100%' }, hovered && { opacity: 0.94 }]}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: venue.images[0]?.url }}
          style={[styles.image, { width: '100%', aspectRatio: 1.5 }]}
          contentFit="cover"
          transition={200}
        />
        {badge ? (
          <View style={styles.badge}>
            <BText style={{ fontFamily: font.semibold, fontSize: 12, color: colors.ink }}>{t(badge)}</BText>
          </View>
        ) : null}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            toggleFav(venue.id);
          }}
          style={styles.heart}
          hitSlop={8}
        >
          <Ionicons
            name={isFav ? 'heart' : 'heart-outline'}
            size={20}
            color={isFav ? colors.pink : colors.white}
          />
        </Pressable>
      </View>

      <View style={{ marginTop: 12, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <BText variant="title" numberOfLines={1} style={{ flex: 1 }}>
            {venue.name}
          </BText>
          <Rating value={venue.rating_avg} />
        </View>
        <BText variant="small" numberOfLines={1}>
          {venue.area}, {venue.city}
        </BText>
        <BText variant="small" numberOfLines={1}>
          {venue.provider_type === 'freelancer' ? t('Freelancer') : category?.name}
          {'  ·  '}
          {t('{count} reviews', { count: venue.rating_count.toLocaleString() })}
        </BText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  imageWrap: { position: 'relative' },
  image: { borderRadius: radius.lg, backgroundColor: colors.bgSubtle },
  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heart: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(19,19,19,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
