import React, { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle } from 'react-native';
import { colors } from '@bink/shared/lib/theme';

/** Pulsing placeholder block shown while content loads. */
export function Skeleton({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={[{ backgroundColor: colors.bgSubtle, borderRadius: 12, opacity: pulse }, style]} />;
}

/** Placeholder matching a VenueCard while venues load. */
export function SkeletonVenueCard({ width }: { width?: number }) {
  return (
    <View style={{ width: width ?? '100%', gap: 10 }}>
      <Skeleton style={{ width: '100%', aspectRatio: 1.5, borderRadius: 20 }} />
      <Skeleton style={{ width: '70%', height: 16 }} />
      <Skeleton style={{ width: '50%', height: 12 }} />
    </View>
  );
}

/** A rail of card placeholders. */
export function SkeletonRail({ count = 4, cardWidth = 276 }: { count?: number; cardWidth?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 20, overflow: 'hidden' }}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonVenueCard key={i} width={cardWidth} />
      ))}
    </View>
  );
}
