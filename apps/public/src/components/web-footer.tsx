import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '@bink/shared/lib/i18n';
import { colors, maxContentWidth } from '@bink/shared/lib/theme';
import { Logo } from '@bink/shared/components/logo';
import { BText } from '@bink/shared/components/ui/text';

// Every link resolves to a real destination: an in-app route, or an external
// URL opened in a new tab. No dead controls.
type Link = { label: string; to: string; external?: boolean };
const COLUMNS: { title: string; links: Link[] }[] = [
  {
    title: 'About Bink',
    links: [
      { label: 'Help and support', to: '/support' },
      { label: 'For partners', to: '/business' },
      { label: 'Contact us', to: '/support' },
    ],
  },
  {
    title: 'For business',
    links: [
      { label: 'List your business', to: '/business' },
      { label: 'Business dashboard', to: '/business/dashboard' },
      { label: 'Pricing', to: '/business' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of service', to: '/terms' },
      { label: 'Terms of use', to: '/terms' },
    ],
  },
];

const SOCIAL: { label: string; icon: string; url: string }[] = [
  { label: 'Instagram', icon: 'logo-instagram', url: 'https://instagram.com/bink' },
  { label: 'X (Twitter)', icon: 'logo-twitter', url: 'https://x.com/bink' },
  { label: 'LinkedIn', icon: 'logo-linkedin', url: 'https://www.linkedin.com/company/bink' },
  { label: 'Facebook', icon: 'logo-facebook', url: 'https://facebook.com/bink' },
];

export function WebFooter() {
  const router = useRouter();
  const { t } = useI18n();
  const open = (l: Link) => {
    if (l.external) Linking.openURL(l.to).catch(() => {});
    else router.push(l.to as any);
  };
  return (
    <View style={styles.wrap}>
      <View style={styles.inner}>
        <View style={{ flex: 1.2, gap: 16, minWidth: 180 }}>
          <Logo color={colors.white} />
          <Pressable
            style={({ hovered }: any) => [styles.appPill, hovered && { backgroundColor: 'rgba(255,255,255,0.1)' }]}
            onPress={() => router.push('/business')}
          >
            <BText variant="smallMedium" color={colors.white}>
              {t('Get the app')}
            </BText>
            <Ionicons name="logo-apple" size={16} color={colors.white} />
            <Ionicons name="logo-google-playstore" size={14} color={colors.white} />
          </Pressable>
        </View>
        {COLUMNS.map((col) => (
          <View key={col.title} style={{ flex: 1, gap: 12, minWidth: 130 }}>
            <BText variant="smallMedium" color={colors.white}>
              {t(col.title)}
            </BText>
            {col.links.map((l) => (
              <Pressable key={l.label} onPress={() => open(l)}>
                {({ hovered }: any) => (
                  <BText variant="small" color={hovered ? colors.white : 'rgba(255,255,255,0.7)'}>
                    {t(l.label)}
                  </BText>
                )}
              </Pressable>
            ))}
          </View>
        ))}
        <View style={{ flex: 1, gap: 12, minWidth: 130 }}>
          <BText variant="smallMedium" color={colors.white}>
            {t('Find us on social')}
          </BText>
          {SOCIAL.map((s) => (
            <Pressable
              key={s.label}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              onPress={() => Linking.openURL(s.url).catch(() => {})}
            >
              {({ hovered }: any) => (
                <>
                  <Ionicons name={s.icon as any} size={15} color={hovered ? colors.white : 'rgba(255,255,255,0.7)'} />
                  <BText variant="small" color={hovered ? colors.white : 'rgba(255,255,255,0.7)'}>
                    {t(s.label)}
                  </BText>
                </>
              )}
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.bottomRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="globe-outline" size={14} color="rgba(255,255,255,0.7)" />
          <BText variant="small" color="rgba(255,255,255,0.7)">
            {t('Saudi Arabia')}
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
    flexWrap: 'wrap',
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
