import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountLayout } from '../components/account-layout';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { Button } from '@bink/shared/components/ui/button';
import { BText } from '@bink/shared/components/ui/text';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '@bink/shared/components/web-header';
import { useAuth } from '@bink/shared/lib/auth-context';
import { useI18n } from '@bink/shared/lib/i18n';
import { colors, radius } from '@bink/shared/lib/theme';
import { useIsDesktop } from '@bink/shared/lib/use-layout';

const SETTINGS_KEY = 'bink.settings';

interface Prefs {
  bookingReminders: boolean;
  promoEmails: boolean;
  smsUpdates: boolean;
}

const DEFAULTS: Prefs = { bookingReminders: true, promoEmails: false, smsUpdates: true };

export default function Settings() {
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, setLang, isRTL } = useI18n();
  const { user, signOut } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY).then((raw) => {
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
    });
  }, []);

  const toggle = (key: keyof Prefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  const content = (
    <View style={{ gap: 24 }}>
      <View style={styles.card}>
        <BText variant="h3">{t('Language')}</BText>
        <LanguageRow label="English" selected={lang === 'en'} onPress={() => setLang('en')} />
        <LanguageRow label="العربية" selected={lang === 'ar'} onPress={() => setLang('ar')} />
      </View>

      <View style={styles.card}>
        <BText variant="h3">{t('Notifications')}</BText>
        <SettingRow
          label={t('Booking reminders')}
          sub={t('Get reminded before your appointments')}
          value={prefs.bookingReminders}
          onToggle={() => toggle('bookingReminders')}
        />
        <SettingRow
          label={t('Offers and promotions')}
          sub={t('Discounts and new salons near you')}
          value={prefs.promoEmails}
          onToggle={() => toggle('promoEmails')}
        />
        <SettingRow
          label={t('SMS updates')}
          sub={t('Booking confirmations by SMS')}
          value={prefs.smsUpdates}
          onToggle={() => toggle('smsUpdates')}
        />
      </View>

      <View style={styles.card}>
        <BText variant="h3">{t('About')}</BText>
        <View style={{ gap: 12, marginTop: 14 }}>
          <InfoRow label={t('Version')} value="1.0.0" />
          <LinkRow label={t('Terms of service')} onPress={() => router.push('/terms' as any)} />
          <LinkRow label={t('Privacy policy')} onPress={() => router.push('/privacy' as any)} />
        </View>
      </View>

      {user ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button
            title={t('Log out')}
            variant="secondary"
            onPress={async () => {
              await signOut();
              router.replace('/');
            }}
          />
        </View>
      ) : null}
    </View>
  );

  if (isDesktop) {
    return <AccountLayout title={t('Settings')}>{content}</AccountLayout>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: TAB_BAR_HEIGHT + 32 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.ink} />
          </Pressable>
          <BText variant="h1">{t('Settings')}</BText>
        </View>
        {content}
      </ScrollView>
      <BottomTabs />
    </View>
  );
}

function LanguageRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={{ flex: 1 }}>
        <BText variant="smallMedium">{label}</BText>
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? colors.accent : colors.grayLight}
      />
    </Pressable>
  );
}

function SettingRow({
  label,
  sub,
  value,
  onToggle,
}: {
  label: string;
  sub: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <BText variant="smallMedium">{label}</BText>
        <BText variant="tiny">{sub}</BText>
      </View>
      <View style={{ direction: 'ltr' }}>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.white}
      />
      </View>
    </View>
  );
}

function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { isRTL } = useI18n();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <BText variant="small" color={colors.ink}>
        {label}
      </BText>
      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={colors.gray} />
    </Pressable>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <BText variant="small" color={colors.ink}>
        {label}
      </BText>
      <BText variant="small">{value}</BText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    padding: 20,
    backgroundColor: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
});
