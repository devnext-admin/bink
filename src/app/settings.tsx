import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { Button } from '../components/ui/button';
import { BText } from '../components/ui/text';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '../components/web-header';
import { useAuth } from '../lib/auth-context';
import { colors, maxContentWidth, radius } from '../lib/theme';
import { useIsDesktop } from '../lib/use-layout';

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
        <BText variant="h3">Notifications</BText>
        <SettingRow
          label="Booking reminders"
          sub="Get reminded before your appointments"
          value={prefs.bookingReminders}
          onToggle={() => toggle('bookingReminders')}
        />
        <SettingRow
          label="Offers and promotions"
          sub="Discounts and new salons near you"
          value={prefs.promoEmails}
          onToggle={() => toggle('promoEmails')}
        />
        <SettingRow
          label="SMS updates"
          sub="Booking confirmations by SMS"
          value={prefs.smsUpdates}
          onToggle={() => toggle('smsUpdates')}
        />
      </View>

      <View style={styles.card}>
        <BText variant="h3">About</BText>
        <View style={{ gap: 12, marginTop: 14 }}>
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Terms of service" value="bink.app/terms" />
          <InfoRow label="Privacy policy" value="bink.app/privacy" />
        </View>
      </View>

      {user ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button
            title="Log out"
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
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.white }}>
        <WebHeader showSearch />
        <View style={styles.desktopContent}>
          <BText variant="h1" style={{ marginBottom: 24 }}>
            Settings
          </BText>
          <View style={{ maxWidth: 640 }}>{content}</View>
        </View>
        <WebFooter />
      </ScrollView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: TAB_BAR_HEIGHT + 32 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </Pressable>
          <BText variant="h1">Settings</BText>
        </View>
        {content}
      </ScrollView>
      <BottomTabs />
    </View>
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
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.ink }}
        thumbColor={colors.white}
      />
    </View>
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
  desktopContent: {
    width: '100%',
    maxWidth: maxContentWidth + 48,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    minHeight: 600,
  },
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
