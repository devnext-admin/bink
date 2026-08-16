import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { colors, font } from '../lib/theme';

// Bink wordmark: black letterforms with the brand-signature red dot on the "i".
// Rendered as b + dotless ı (U+0131) + nk, with a red dot positioned above.
export function Logo({ size = 26, color = colors.ink }: { size?: number; color?: string }) {
  const router = useRouter();
  const { isRTL } = useI18n();
  const dot = Math.max(3, Math.round(size * 0.16));
  const textStyle = {
    fontFamily: font.bold,
    fontSize: size,
    lineHeight: Math.round(size * 1.2),
    color,
    letterSpacing: -0.5,
  };
  return (
    <Pressable
      onPress={() => router.push('/')}
      hitSlop={8}
      // row-reverse under RTL keeps the wordmark reading b-i-n-k
      style={[styles.row, isRTL && { flexDirection: 'row-reverse' }]}
    >
      <Text style={textStyle}>b</Text>
      <View>
        <Text style={textStyle}>{'ı'}</Text>
        <View
          style={{
            position: 'absolute',
            alignSelf: 'center',
            top: Math.round(size * 0.16),
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: colors.accent,
          }}
        />
      </View>
      <Text style={textStyle}>nk</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
});
