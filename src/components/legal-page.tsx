import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../lib/i18n';
import { colors } from '../lib/theme';
import { BText } from './ui/text';
import { Seo } from './seo';
import { WebFooter } from './web-footer';
import { WebHeader } from './web-header';
import { useIsDesktop } from '../lib/use-layout';

export interface LegalSection {
  title: string;
  body: string;
}

/** Shared shell for Terms / Privacy: readable column, works signed-out. */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useI18n();

  const content = (
    <View style={styles.column}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={8}
        style={({ hovered }: any) => [styles.backLink, hovered && { opacity: 0.7 }]}
      >
        <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={18} color={colors.gray} />
        <BText variant="smallMedium" color={colors.gray}>
          {t('Back')}
        </BText>
      </Pressable>
      <BText variant="h1">{t(title)}</BText>
      <BText variant="tiny" style={{ marginTop: 6 }}>
        {t('Last updated: {date}', { date: updated })}
      </BText>
      <BText variant="body" style={{ marginTop: 18 }}>
        {t(intro)}
      </BText>
      {sections.map((s, i) => (
        <View key={s.title} style={{ marginTop: 26 }}>
          <BText variant="h3">
            {i + 1}. {t(s.title)}
          </BText>
          <BText variant="body" style={{ marginTop: 8, color: colors.gray }}>
            {t(s.body)}
          </BText>
        </View>
      ))}
      <View style={styles.notice}>
        <Ionicons name="information-circle-outline" size={16} color={colors.gray} />
        <BText variant="tiny" style={{ flex: 1 }}>
          {t('Questions about this document? Contact us at support@bink.app.')}
        </BText>
      </View>
    </View>
  );

  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.white }}>
        <Seo title={t(title)} />
        <WebHeader showSearch />
        <ScrollView contentContainerStyle={styles.desktopWrap}>
          {content}
          <View style={{ height: 40 }} />
          <WebFooter />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Seo title={t(title)} />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 48 }}
      >
        {content}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopWrap: { paddingTop: 40, alignItems: 'center' },
  column: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 24 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18, alignSelf: 'flex-start' },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgPage,
    borderRadius: 12,
    padding: 12,
    marginTop: 32,
  },
});
