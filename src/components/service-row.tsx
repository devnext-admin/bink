import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatDuration, formatPrice } from '../lib/format';
import { colors, font, radius } from '../lib/theme';
import type { Service } from '../lib/types';
import { BText } from './ui/text';

interface ServiceRowProps {
  service: Service;
  mode?: 'book' | 'add'; // venue page shows "Book", booking flow shows +/✓
  selected?: boolean;
  showDescription?: boolean;
  onAction: () => void;
}

export function ServiceRow({ service, mode = 'book', selected, showDescription, onAction }: ServiceRowProps) {
  const discounted = service.discount_pct > 0;
  const finalPrice = Math.round(service.price_cents * (1 - service.discount_pct / 100));

  return (
    <Pressable
      onPress={onAction}
      style={({ hovered }: any) => [
        styles.card,
        selected && { borderColor: colors.ink, borderWidth: 2 },
        hovered && { borderColor: selected ? colors.ink : colors.gray },
      ]}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <BText variant="title">{service.name}</BText>
        <BText variant="small">{formatDuration(service.duration_minutes)}</BText>
        {showDescription && service.description ? (
          <BText variant="small" numberOfLines={2} style={{ marginTop: 2 }}>
            {service.description}
          </BText>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <BText variant="smallMedium" style={{ fontFamily: font.semibold }}>
            {formatPrice(finalPrice, service.currency)}
          </BText>
          {discounted ? (
            <>
              <BText variant="small" style={{ textDecorationLine: 'line-through' }}>
                {formatPrice(service.price_cents, service.currency)}
              </BText>
              <BText variant="small" color={colors.green} style={{ fontFamily: font.semibold }}>
                Save {service.discount_pct}%
              </BText>
            </>
          ) : null}
        </View>
      </View>

      {mode === 'book' ? (
        <View style={styles.bookBtn}>
          <BText style={{ fontFamily: font.semibold, fontSize: 14, color: colors.ink }}>Book</BText>
        </View>
      ) : (
        <View style={[styles.addBtn, selected && { backgroundColor: colors.ink, borderColor: colors.ink }]}>
          <Ionicons name={selected ? 'checkmark' : 'add'} size={18} color={selected ? colors.white : colors.ink} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    padding: 16,
  },
  bookBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 18,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
