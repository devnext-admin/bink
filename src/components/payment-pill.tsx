import React from 'react';
import { View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { colors, font, radius } from '../lib/theme';
import { BText } from './ui/text';

export function PaymentPill({
  status,
  escrow,
}: {
  status: string;
  escrow?: 'held' | 'released' | 'refunded';
}) {
  const { t } = useI18n();
  const map: Record<string, { label: string; color: string; bg: string }> = {
    paid: { label: 'Paid', color: colors.green, bg: colors.greenBg },
    unpaid: { label: 'Pay at venue', color: colors.gray, bg: colors.bgSubtle },
    refunded: { label: 'Refunded', color: colors.danger, bg: colors.dangerBg },
  };
  let m = map[status] ?? map.unpaid;
  if (status === 'paid' && escrow === 'held')
    m = { label: 'Paid · in escrow', color: colors.info, bg: colors.infoBg };
  if (status === 'paid' && escrow === 'released')
    m = { label: 'Paid · released', color: colors.green, bg: colors.greenBg };
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
      <BText style={{ fontFamily: font.semibold, fontSize: 11, color: m.color }}>{t(m.label)}</BText>
    </View>
  );
}
