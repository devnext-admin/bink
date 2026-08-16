import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors, font, radius } from '../../lib/theme';
import { BText } from './text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  fullWidth?: boolean;
}

const sizeStyles: Record<Size, { height: number; paddingHorizontal: number; fontSize: number }> = {
  sm: { height: 36, paddingHorizontal: 16, fontSize: 14 },
  md: { height: 44, paddingHorizontal: 22, fontSize: 15 },
  lg: { height: 52, paddingHorizontal: 28, fontSize: 16 },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  style,
  fullWidth,
}: ButtonProps) {
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed, hovered }: any) => [
        styles.base,
        { height: s.height, paddingHorizontal: s.paddingHorizontal },
        // Brand spec: primary CTA = Bink Red pill; "accent" kept as the dark pill
        variant === 'primary' && { backgroundColor: colors.accent },
        variant === 'accent' && { backgroundColor: colors.ink },
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && { backgroundColor: colors.accentSoft },
        fullWidth && { alignSelf: 'stretch', width: '100%' },
        (hovered || pressed) && variant === 'primary' && { backgroundColor: colors.accentDark },
        (hovered || pressed) && variant === 'secondary' && { backgroundColor: colors.bgSubtle },
        (hovered || pressed) && variant === 'accent' && { opacity: 0.9 },
        (hovered || pressed) && variant === 'ghost' && { backgroundColor: colors.accentLight },
        isDisabled && { backgroundColor: colors.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' ? colors.ink : variant === 'ghost' ? colors.accent : '#fff'}
        />
      ) : (
        <BText
          style={{
            fontFamily: font.bold,
            fontSize: s.fontSize,
            letterSpacing: 0.2,
            color: isDisabled
              ? colors.white
              : variant === 'secondary'
                ? colors.ink
                : variant === 'ghost'
                  ? colors.accent
                  : colors.white,
          }}
        >
          {title}
        </BText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
