import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useAppData } from '../lib/app-data-context';
import { nextAvailableLabel } from '../lib/availability';
import { sized } from '../lib/image';
import { useI18n } from '../lib/i18n';
import { colors, font, radius } from '../lib/theme';
import type { Venue } from '../lib/types';
import { Rating } from './ui/rating';
import { BText } from './ui/text';

interface VenueCardProps {
  venue: Venue;
  width?: number; // undefined = fill container
  badge?: string | null; // e.g. 'Featured' | 'New' | 'Deals' (may arrive pre-translated)
  distance?: string | null;
}

export function VenueCard({ venue, width, badge, distance }: VenueCardProps) {
  const router = useRouter();
  const { t, lang } = useI18n();
  const { favorites, toggleFav, categoryOf } = useAppData();
  const isFav = favorites.includes(venue.id);
  const category = categoryOf(venue);
  const nextSlot = nextAvailableLabel(venue, lang, t);
  const heartScale = useRef(new Animated.Value(1)).current;
  const popHeart = () => {
    heartScale.setValue(0.6);
    Animated.spring(heartScale, { toValue: 1, friction: 3, tension: 160, useNativeDriver: false }).start();
  };

  return (
    <Pressable
      onPress={() => router.push(`/venue/${venue.slug}`)}
      style={({ hovered }: any) => [{ width: width ?? '100%' }, hovered && { opacity: 0.94 }]}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: sized(venue.images[0]?.url, width ?? 320) }}
          style={[styles.image, { width: '100%', aspectRatio: 1.5 }]}
          contentFit="cover"
          transition={200}
          {...({ loading: 'lazy' } as any)}
          alt={`${venue.name} — ${venue.area}, ${venue.city}`}
          accessibilityLabel={`${venue.name} — ${venue.area}, ${venue.city}`}
        />
        {badge ? (
          <View style={styles.badge}>
            <BText style={{ fontFamily: font.semibold, fontSize: 12, color: colors.ink }}>{t(badge)}</BText>
          </View>
        ) : null}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            popHeart();
            toggleFav(venue.id);
          }}
          style={styles.heart}
          hitSlop={8}
        >
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons
              name={isFav ? 'heart' : 'heart-outline'}
              size={20}
              color={isFav ? colors.pink : colors.white}
            />
          </Animated.View>
        </Pressable>
      </View>

      <View style={{ marginTop: 12, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <BText variant="title" numberOfLines={1} style={{ flex: 1 }}>
            {t(venue.name)}
          </BText>
          {venue.rating_count > 0 ? <Rating value={venue.rating_avg} /> : null}
        </View>
        <BText variant="small" numberOfLines={1}>
          {t(venue.area)}, {t(venue.city)}
        </BText>
        <BText variant="small" numberOfLines={1}>
          {venue.provider_type === 'freelancer' ? t('Freelancer') : t(category?.name ?? '')}
          {'  ·  '}
          {venue.rating_count > 0
            ? t('{count} reviews', { count: venue.rating_count.toLocaleString() })
            : t('No reviews yet')}
          {distance ? `  ·  ${distance}` : ''}
        </BText>
        {nextSlot ? (
          <BText variant="tiny" color={colors.green} numberOfLines={1} style={{ marginTop: 2 }}>
            {nextSlot}
          </BText>
        ) : null}
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
