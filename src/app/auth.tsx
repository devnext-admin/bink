import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../components/logo';
import { Button } from '../components/ui/button';
import { BText } from '../components/ui/text';
import { useAppData } from '../lib/app-data-context';
import { isSupabaseConfigured, useAuth } from '../lib/auth-context';
import {
  DEMO_ADMIN_EMAIL,
  DEMO_CUSTOMER_EMAIL,
  DEMO_OWNER_EMAIL,
  seedCustomerDemo,
  seedOwnerDemo,
} from '../lib/demo-seed';
import { colors, font, radius } from '../lib/theme';

export default function Auth() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, continueAsGuest } = useAuth();
  const { refresh } = useAppData();
  const [demoBusy, setDemoBusy] = useState<string | null>(null);

  const enterDemo = async (persona: 'customer' | 'owner' | 'admin') => {
    setDemoBusy(persona);
    if (persona === 'customer') {
      await seedCustomerDemo();
      await signIn(DEMO_CUSTOMER_EMAIL, 'demo');
      await refresh();
      router.replace('/appointments');
    } else if (persona === 'owner') {
      await seedOwnerDemo();
      await signIn(DEMO_OWNER_EMAIL, 'demo');
      await refresh();
      router.replace('/business/dashboard');
    } else {
      await seedCustomerDemo();
      await seedOwnerDemo();
      await signIn(DEMO_ADMIN_EMAIL, 'demo');
      await refresh();
      router.replace('/admin');
    }
    setDemoBusy(null);
  };
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'signin' | 'signup'>(params.mode === 'signup' ? 'signup' : 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const submit = async () => {
    setError(null);
    if (!email || !password || (mode === 'signup' && !name)) {
      setError('Please fill in all fields.');
      return;
    }
    setBusy(true);
    const err = mode === 'signin' ? await signIn(email, password) : await signUp(name, email, password);
    setBusy(false);
    if (err) setError(err);
    else close();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.white }}
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <Pressable onPress={close} style={[styles.close, { top: insets.top + 16 }]}>
        <Ionicons name="close" size={22} color={colors.ink} />
      </Pressable>

      <View style={{ width: '100%', maxWidth: 400, gap: 16 }}>
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <Logo size={32} />
          <BText variant="h2" style={{ marginTop: 16 }}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </BText>
          <BText variant="small" style={{ marginTop: 4, textAlign: 'center' }}>
            Book unforgettable salon experiences
          </BText>
        </View>

        {!isSupabaseConfigured && (
          <View style={styles.demoNote}>
            <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
            <BText variant="tiny" color={colors.accent}>
              Demo mode — any email and password works
            </BText>
          </View>
        )}

        {mode === 'signup' && (
          <TextInput
            placeholder="Full name"
            placeholderTextColor={colors.gray}
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
        )}
        <TextInput
          placeholder="Email address"
          placeholderTextColor={colors.gray}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.gray}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        {error ? (
          <BText variant="small" color={colors.danger}>
            {error}
          </BText>
        ) : null}

        <Button
          title={mode === 'signin' ? 'Log in' : 'Sign up'}
          size="lg"
          fullWidth
          loading={busy}
          onPress={submit}
        />
        <Button
          title="Continue as guest"
          variant="secondary"
          size="lg"
          fullWidth
          onPress={async () => {
            await continueAsGuest();
            close();
          }}
        />

        {!isSupabaseConfigured && (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <View style={styles.hr} />
              <BText variant="tiny">or explore a ready-made demo</BText>
              <View style={styles.hr} />
            </View>
            <DemoButton
              icon="person-outline"
              title="Demo customer"
              sub="Bookings, escrow, chat & reviews pre-loaded"
              loading={demoBusy === 'customer'}
              onPress={() => enterDemo('customer')}
            />
            <DemoButton
              icon="storefront-outline"
              title="Demo salon owner"
              sub="A live salon with sales, messages & analytics"
              loading={demoBusy === 'owner'}
              onPress={() => enterDemo('owner')}
            />
            <DemoButton
              icon="shield-checkmark-outline"
              title="Demo admin"
              sub="Approvals, users, payments & platform stats"
              loading={demoBusy === 'admin'}
              onPress={() => enterDemo('admin')}
            />
          </View>
        )}

        <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
          <BText variant="small" style={{ textAlign: 'center' }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <BText variant="small" color={colors.accent} style={{ fontFamily: font.bold }}>
              {mode === 'signin' ? 'Sign up' : 'Log in'}
            </BText>
          </BText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function DemoButton({
  icon,
  title,
  sub,
  loading,
  onPress,
}: {
  icon: any;
  title: string;
  sub: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ hovered }: any) => [styles.demoBtn, hovered && { backgroundColor: colors.accentSoft }]}
    >
      <View style={styles.demoIcon}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <BText variant="smallMedium">{title}</BText>
        <BText variant="tiny">{sub}</BText>
      </View>
      <Ionicons name={loading ? 'hourglass-outline' : 'arrow-forward'} size={16} color={colors.gray} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  close: {
    position: 'absolute',
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: 16,
    fontFamily: font.regular,
    fontSize: 16,
    color: colors.ink,
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
  hr: { flex: 1, height: 1, backgroundColor: colors.divider },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    padding: 12,
  },
  demoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: 12,
    justifyContent: 'center',
  },
});
