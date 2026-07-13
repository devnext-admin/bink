import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../lib/theme';

/**
 * The Bink hero background: a warm rose→ivory→peach wash with two soft
 * translucent glows layered at different angles for an aurora-like depth
 * (a flat single gradient reads cheap at hero sizes).
 */
export function HeroGradient({ style, children }: { style?: ViewStyle | ViewStyle[]; children: React.ReactNode }) {
  return (
    <LinearGradient
      colors={[...colors.heroGradient]}
      locations={[0, 0.45, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={style}
    >
      {/* Rose glow sweeping from the top corner */}
      <LinearGradient
        colors={['rgba(255,56,92,0.40)', 'rgba(255,56,92,0.14)', 'rgba(255,255,255,0)']}
        locations={[0, 0.35, 0.7]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Peach glow rising from the opposite corner */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,138,76,0.18)', 'rgba(255,122,60,0.36)']}
        locations={[0.35, 0.75, 1]}
        start={{ x: 0, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Soft white bloom in the center so hero text sits on a calm area */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
        locations={[0.15, 0.5, 0.85]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </LinearGradient>
  );
}
