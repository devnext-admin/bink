import React from 'react';
import { View } from 'react-native';
import { colors, font, radius } from '../lib/theme';
import { BText } from './ui/text';

export function PaymentPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    paid: { label: 'Paid', color: colors.green, bg: '#E9F7EE' },
    unpaid: { label: 'Pay at venue', color: colors.gray, bg: colors.bgSubtle },
    refunded: { label: 'Refunded', color: colors.danger, bg: '#FDEBEC' },
  };
  const m = map[status] ?? map.unpaid;
  return (
    <View
      style={{
        backgroundColor: m.bg,
        borderRadius: radius.pill,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
      }}
    >
      <BText style={{ fontFamily: font.semibold, fontSize: 11, color: m.color }}>{m.label}</BText>
    </View>
  );
}
