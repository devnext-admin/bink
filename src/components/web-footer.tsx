import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { colors, maxContentWidth } from '../lib/theme';
import { Logo } from './logo';
import { BText } from './ui/text';

const COLUMNS: { title: string; links: string[] }[] = [
  { title: 'About Bink', links: ['Careers', 'Help and support', 'Blog', 'Sitemap'] },
  { title: 'For business', links: ['For partners', 'Pricing', 'Support', 'Status'] },
  { title: 'Legal', links: ['Privacy Policy', 'Terms of service', 'Terms of use'] },
];

const SOCIAL = ['Facebook', 'X (Twitter)', 'LinkedIn', 'Instagram'];

export function WebFooter() {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <View style={styles.wrap}>
      <View style={styles.inner}>
        <View style={{ flex: 1.2, gap: 16 }}>
          <Logo color={colors.white} />
          <View style={styles.appPill}>
            <BText variant="smallMedium" color={colors.white}>
              {t('Get the app')}
            </BText>
            <Ionicons name="logo-apple" size={16} color={colors.white} />
            <Ionicons name="logo-google-playstore" size={14} color={colors.white} />
          </View>
        </View>
        {COLUMNS.map((col) => (
          <View key={col.title} style={{ flex: 1, gap: 12 }}>
            <BText variant="smallMedium" color={colors.white}>
              {t(col.title)}
            </BText>
            {col.links.map((l) => {
              const href = l === 'Privacy Policy' ? '/privacy' : l === 'Terms of service' || l === 'Terms of use' ? '/terms' : null;
              return (
                <BText
                  key={l}
                  variant="small"
                  color="rgba(255,255,255,0.7)"
                  onPress={href ? () => router.push(href as any) : undefined}
                >
                  {t(l)}
                </BText>
              );
            })}
          </View>
        ))}
        <View style={{ flex: 1, gap: 12 }}>
          <BText variant="smallMedium" color={colors.white}>
            {t('Find us on social')}
          </BText>
          {SOCIAL.map((s) => (
            <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="open-outline" size={12} color="rgba(255,255,255,0.7)" />
              <BText variant="small" color="rgba(255,255,255,0.7)">
                {s}
              </BText>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.bottomRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="globe-outline" size={14} color="rgba(255,255,255,0.7)" />
          <BText variant="small" color="rgba(255,255,255,0.7)">
            {t('English')}
          </BText>
        </View>
        <BText variant="small" color="rgba(255,255,255,0.7)">
          {t('© 2026 Bink')}
        </BText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.ink,
    paddingTop: 56,
    paddingBottom: 24,
    paddingHorizontal: 24,
    marginTop: 80,
  },
  inner: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 32,
  },
  appPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 40,
    alignSelf: 'flex-start',
  },
  bottomRow: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    marginTop: 48,
    paddingTop: 24,
  },
});
