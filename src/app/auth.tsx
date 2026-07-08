import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../components/logo';
import { Button } from '../components/ui/button';
import { BText } from '../components/ui/text';
import { isSupabaseConfigured, useAuth } from '../lib/auth-context';
import { colors, font, radius } from '../lib/theme';

export default function Auth() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
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
