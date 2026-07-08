import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius } from '../lib/theme';
import { Button } from './ui/button';
import { BText } from './ui/text';

const SEEN_KEY = 'bink.onboarded';

const SLIDES = [
  {
    icon: 'search-outline',
    title: 'Discover great salons',
    body: 'Browse top-rated hair salons, barbershops, nail studios and more near you.',
  },
  {
    icon: 'calendar-outline',
    title: 'Book in seconds',
    body: 'Pick a service, your favorite professional and a time that suits you — done.',
  },
  {
    icon: 'card-outline',
    title: 'Pay your way',
    body: 'Pay at the venue, or online with card and Apple Pay. Tax invoices included.',
  },
];

// First-launch intro shown once on mobile.
export function Onboarding() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY).then((v) => {
      if (!v) setVisible(true);
    });
  }, []);

  const finish = () => {
    AsyncStorage.setItem(SEEN_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;
  const s = SLIDES[slide];
  const last = slide === SLIDES.length - 1;

  return (
    <Modal visible transparent={false} animationType="fade">
      <LinearGradient
        colors={[...colors.heroGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.wrap, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 24) }]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <BText style={{ fontFamily: font.extrabold, fontSize: 26, color: colors.ink, letterSpacing: -0.5 }}>
            bink
          </BText>
          <Pressable onPress={finish} hitSlop={8}>
            <BText variant="smallMedium">Skip</BText>
          </Pressable>
        </View>

        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
          <View style={styles.iconCircle}>
            <Ionicons name={s.icon as any} size={44} color={colors.accent} />
          </View>
          <BText variant="h1" style={{ textAlign: 'center' }}>
            {s.title}
          </BText>
          <BText variant="body" style={{ textAlign: 'center', maxWidth: 300 }}>
            {s.body}
          </BText>
        </View>

        <View style={{ gap: 20 }}>
          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === slide && { backgroundColor: colors.ink, width: 22 }]}
              />
            ))}
          </View>
          <Button
            title={last ? 'Get started' : 'Next'}
            size="lg"
            fullWidth
            onPress={() => (last ? finish() : setSlide(slide + 1))}
          />
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: 24 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(19,19,19,0.25)',
  },
});
