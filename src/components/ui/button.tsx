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
        variant === 'primary' && { backgroundColor: colors.ink },
        variant === 'accent' && { backgroundColor: colors.accent },
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && { backgroundColor: 'transparent' },
        fullWidth && { alignSelf: 'stretch', width: '100%' },
        (hovered || pressed) && variant === 'primary' && { backgroundColor: '#2A2A2A' },
        (hovered || pressed) && variant === 'secondary' && { backgroundColor: colors.bgSubtle },
        (hovered || pressed) && variant === 'accent' && { opacity: 0.9 },
        isDisabled && { backgroundColor: colors.bgSubtle },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' || variant === 'ghost' ? colors.ink : '#fff'} />
      ) : (
        <BText
          style={{
            fontFamily: font.bold,
            fontSize: s.fontSize,
            color: isDisabled
              ? colors.grayLight
              : variant === 'secondary' || variant === 'ghost'
                ? colors.ink
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
