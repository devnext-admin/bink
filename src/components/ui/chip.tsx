import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, font, radius } from '../../lib/theme';
import { BText } from './text';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered }: any) => [
        styles.chip,
        selected && { backgroundColor: colors.ink, borderColor: colors.ink },
        !selected && hovered && { backgroundColor: colors.bgSubtle },
      ]}
    >
      <BText
        style={{
          fontFamily: selected ? font.bold : font.medium,
          fontSize: 14,
          color: selected ? colors.white : colors.ink,
        }}
      >
        {label}
      </BText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
