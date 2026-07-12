import React from 'react';
import { StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';
import { useI18n } from '../../lib/i18n';
import { colors, font } from '../../lib/theme';

type Variant =
  | 'display' // hero H1
  | 'h1'
  | 'h2'
  | 'h3'
  | 'title' // card titles
  | 'body'
  | 'bodyMedium'
  | 'small'
  | 'smallMedium'
  | 'tiny'
  | 'link';

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: font.bold, fontSize: 56, lineHeight: 64, color: colors.ink },
  h1: { fontFamily: font.bold, fontSize: 32, lineHeight: 40, color: colors.ink },
  h2: { fontFamily: font.bold, fontSize: 24, lineHeight: 32, color: colors.ink },
  h3: { fontFamily: font.bold, fontSize: 18, lineHeight: 26, color: colors.ink },
  title: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: colors.ink },
  bodyMedium: { fontFamily: font.medium, fontSize: 16, lineHeight: 24, color: colors.ink },
  small: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.gray },
  smallMedium: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: colors.ink },
  tiny: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: colors.gray },
  link: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: colors.accent },
};

interface BTextProps extends TextProps {
  variant?: Variant;
  color?: string;
}

// Poppins has no Arabic glyphs — swap to the matching Tajawal weight in Arabic.
const AR_FONT: Record<string, string> = {
  Poppins_400Regular: 'Tajawal_400Regular',
  Poppins_500Medium: 'Tajawal_500Medium',
  Poppins_600SemiBold: 'Tajawal_700Bold',
  Poppins_700Bold: 'Tajawal_700Bold',
  Poppins_800ExtraBold: 'Tajawal_800ExtraBold',
};

export function BText({ variant = 'body', color, style, ...rest }: BTextProps) {
  const { lang } = useI18n();
  let flat = StyleSheet.flatten([variants[variant], color ? { color } : null, style]) as TextStyle;
  if (lang === 'ar') {
    if (flat.fontFamily && AR_FONT[flat.fontFamily]) flat = { ...flat, fontFamily: AR_FONT[flat.fontFamily] };
    // Arabic needs taller lines: Tajawal's ascenders/diacritics clip at Poppins metrics
    const size = flat.fontSize ?? 16;
    flat = { ...flat, lineHeight: Math.max(flat.lineHeight ?? 0, Math.round(size * 1.6)) };
  }
  return <RNText {...rest} style={flat} />;
}
