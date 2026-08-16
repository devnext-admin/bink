import React from 'react';
import { ScrollView, View } from 'react-native';
import type { Venue } from '@bink/shared/lib/types';
import { BText } from '@bink/shared/components/ui/text';
import { VenueCard } from './venue-card';

interface SectionRailProps {
  title: string;
  venues: Venue[];
  badge?: (venue: Venue) => string | null;
  cardWidth?: number;
  paddingHorizontal?: number;
}

export function SectionRail({
  title,
  venues,
  badge,
  cardWidth = 280,
  paddingHorizontal = 0,
}: SectionRailProps) {
  if (!venues.length) return null;
  return (
    <View style={{ marginTop: 40 }}>
      <BText variant="h2" style={{ paddingHorizontal }}>
        {title}
      </BText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 16, paddingHorizontal, paddingTop: 16 }}
      >
        {venues.map((v) => (
          <VenueCard key={v.id} venue={v} width={cardWidth} badge={badge ? badge(v) : null} />
        ))}
      </ScrollView>
    </View>
  );
}
