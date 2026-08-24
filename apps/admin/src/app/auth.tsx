import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@bink/shared/components/logo';
import { Button } from '@bink/shared/components/ui/button';
import { BText } from '@bink/shared/components/ui/text';
import { useAppData } from '@bink/shared/lib/app-data-context';
import { useAuth } from '@bink/shared/lib/auth-context';
import { useI18n } from '@bink/shared/lib/i18n';
import { colors, font, radius } from '@bink/shared/lib/theme';

// The admin console lives on its own origin, so a Supabase session from the
// public site does not carry over. This screen is the console's own sign-in:
// email + password only, no sign-up, no OAuth, no demo shortcuts. The index
// gate still decides who gets in; all this does is establish the session.
export default function AdminAuth() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { user, loading, signIn, signOut } = useAuth();
  const { refresh } = useAppData();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already an admin: nothing to do here, go to the console.
  useEffect(() => {
    if (!loading && user?.role === 'admin') router.replace('/');
  }, [loading, user, router]);

  if (loading) return null;

  const submit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError(t('Please fill in all fields.'));
      return;
    }
    setBusy(true);
    const err = await signIn(email.trim(), password);
    if (err) {
      setError(err);
      setBusy(false);
      return;
    }
    await refresh();
    setBusy(false);
    // The index gate checks the role; non-admins land back on the lock screen.
    router.replace('/');
  };

  const signedInAsNonAdmin = user && user.role !== 'admin';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.page, { paddingTop: insets.top + 60 }]}
    >
      <View style={styles.card}>
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <Logo size={30} />
        </View>
        <BText variant="h2" style={{ textAlign: 'center' }}>
          {t('Bink internal')}
        </BText>
        <BText variant="small" style={{ textAlign: 'center', marginBottom: 16 }}>
          {t('Sign in with an admin account to continue.')}
        </BText>

        {signedInAsNonAdmin ? (
          <View style={{ gap: 12 }}>
            <BText variant="small" style={{ textAlign: 'center' }}>
              {t('Signed in as {email}, which has no admin access.', { email: user.email ?? '' })}
            </BText>
            <Button title={t('Sign out')} onPress={() => signOut()} />
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <TextInput
              style={styles.input}
              placeholder={t('Email address')}
              placeholderTextColor={colors.gray}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <View>
              <TextInput
                style={styles.input}
                placeholder={t('Password')}
                placeholderTextColor={colors.gray}
                autoCapitalize="none"
                autoComplete="current-password"
                secureTextEntry={!showPw}
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={submit}
              />
              <Pressable style={styles.eye} onPress={() => setShowPw((v) => !v)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.gray} />
              </Pressable>
            </View>
            {error ? (
              <BText variant="small" color={colors.danger}>
                {error}
              </BText>
            ) : null}
            <Button title={busy ? t('Signing in...') : t('Log in')} onPress={submit} disabled={busy} />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    paddingHorizontal: 20,
    gap: 8,
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
  eye: { position: 'absolute', right: 14, top: 16 },
});
