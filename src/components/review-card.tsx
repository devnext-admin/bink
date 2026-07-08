import React from 'react';
import { View } from 'react-native';
import { colors } from '../lib/theme';
import type { Review } from '../lib/types';
import { Avatar } from './ui/avatar';
import { RatingStars } from './ui/rating';
import { BText } from './ui/text';

export function ReviewCard({ review }: { review: Review }) {
  const date = new Date(review.created_at).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <View style={{ gap: 10, paddingVertical: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar name={review.author_name} size={40} />
        <View>
          <BText variant="smallMedium">{review.author_name}</BText>
          <BText variant="tiny" color={colors.gray}>
            {date}
          </BText>
        </View>
      </View>
      <RatingStars value={review.rating} size={14} />
      {review.comment ? <BText variant="body">{review.comment}</BText> : null}
    </View>
  );
}
