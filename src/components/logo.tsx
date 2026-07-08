import React from 'react';
import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, font } from '../lib/theme';
import { BText } from './ui/text';

export function Logo({ size = 26, color = colors.ink }: { size?: number; color?: string }) {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push('/')} hitSlop={8}>
      <BText style={{ fontFamily: font.extrabold, fontSize: size, color, letterSpacing: -0.5 }}>
        bink
      </BText>
    </Pressable>
  );
}
