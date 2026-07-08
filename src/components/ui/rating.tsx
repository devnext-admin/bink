import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { colors, font } from '../../lib/theme';
import { BText } from './text';

interface RatingProps {
  value: number;
  count?: number;
  size?: number;
  showStars?: boolean; // full 5-star row (reviews header) vs single star inline
}

export function RatingStars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={value >= i - 0.25 ? 'star' : value >= i - 0.75 ? 'star-half' : 'star-outline'}
          size={size}
          color={colors.star}
        />
      ))}
    </View>
  );
}

export function Rating({ value, count, size = 14 }: RatingProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <BText style={{ fontFamily: font.bold, fontSize: size, color: colors.ink }}>
        {value.toFixed(1)}
      </BText>
      <Ionicons name="star" size={size} color={colors.star} />
      {count != null && (
        <BText style={{ fontFamily: font.regular, fontSize: size, color: colors.gray }}>
          ({count.toLocaleString()})
        </BText>
      )}
    </View>
  );
}
