import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';
import { colors, font } from '../../lib/theme';
import { BText } from './text';

const PALETTE = [colors.accentSoft, '#FFEFF6', '#EFF6FF', '#F0FBF4', colors.warningBg];
const TEXT_PALETTE = ['#6950F3', '#D6247A', '#1D6FD6', '#12873F', colors.warning];

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: number;
}

export function Avatar({ name, url, size = 56 }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase();
  const idx = (name.charCodeAt(0) || 0) % PALETTE.length;
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={150}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: PALETTE[idx],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <BText style={{ fontFamily: font.bold, fontSize: size * 0.4, color: TEXT_PALETTE[idx] }}>
        {initial}
      </BText>
    </View>
  );
}

export function StaffAvatar({ name, role, url, size = 88 }: AvatarProps & { role?: string }) {
  return (
    <View style={{ alignItems: 'center', width: size + 24 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1,
          borderColor: colors.divider,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.white,
        }}
      >
        <Avatar name={name} url={url} size={size - 8} />
      </View>
      <BText variant="smallMedium" style={{ marginTop: 8 }} numberOfLines={1}>
        {name}
      </BText>
      {role ? (
        <BText variant="tiny" numberOfLines={1} style={{ marginTop: 2 }}>
          {role}
        </BText>
      ) : null}
    </View>
  );
}
