import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Logo } from '../components/logo';
import { Button } from '../components/ui/button';
import { BText } from '../components/ui/text';
import { useI18n } from '../lib/i18n';
import { getSupabase } from '../lib/supabase';
import { colors, font, radius } from '../lib/theme';

// Landing page for the Supabase password-recovery email link. The link opens
// this route with a recovery token in the URL hash; supabase-js exchanges it
// for a session automatically, after which updateUser can set the password.
export default function ResetPassword() {
  const router = useRouter();
  const { t } = useI18n();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    // Recovery links arrive as a hash fragment; give supabase-js a moment to
    // pick it up, then check whether we actually hold a session.
    const timer = setTimeout(async () => {
      const { data } = await sb.auth.getSession();
      setReady(!!data.session);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const submit = async () => {
    setError(null);
    if (password.length < 8) {
      setError(t('Password must be at least 8 characters.'));
      return;
    }
    if (password !== confirm) {
      setError(t('Passwords do not match.'));
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    const { error: err } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(err.message);
    else setDone(true);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.white }}
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <View style={{ width: '100%', maxWidth: 400, gap: 14, alignItems: 'center' }}>
        <Logo size={32} />
        {done ? (
          <>
            <Ionicons name="checkmark-circle" size={40} color={colors.green} />
            <BText variant="h2" style={{ textAlign: 'center' }}>
              {t('Password updated')}
            </BText>
            <BText variant="small" style={{ textAlign: 'center' }}>
              {t('Log in with your new password.')}
            </BText>
            <Button title={t('Log in')} size="lg" fullWidth onPress={() => router.replace('/auth')} />
          </>
        ) : (
          <>
            <BText variant="h2" style={{ textAlign: 'center' }}>
              {t('Set a new password')}
            </BText>
            {!ready && (
              <BText variant="tiny" style={{ textAlign: 'center' }}>
                {t('Open this page from the reset link in your email.')}
              </BText>
            )}
            <View style={{ width: '100%' }}>
              <TextInput
                {...({ dir: 'auto' } as any)}
                placeholder={t('New password')}
                placeholderTextColor={colors.gray}
                secureTextEntry={!showPw}
                value={password}
                onChangeText={setPassword}
                style={styles.input}
              />
              <Pressable onPress={() => setShowPw((s) => !s)} style={styles.eye} hitSlop={8}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.gray} />
              </Pressable>
            </View>
            <TextInput
              {...({ dir: 'auto' } as any)}
              placeholder={t('Confirm password')}
              placeholderTextColor={colors.gray}
              secureTextEntry={!showPw}
              value={confirm}
              onChangeText={setConfirm}
              style={[styles.input, { width: '100%' }]}
            />
            {error ? (
              <BText variant="small" color={colors.danger}>
                {error}
              </BText>
            ) : null}
            <Button title={t('Update password')} size="lg" fullWidth loading={busy} onPress={submit} />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 52,
    paddingHorizontal: 16,
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.white,
    width: '100%',
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
  eye: { position: 'absolute', right: 14, top: 16 },
});
