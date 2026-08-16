import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Logo } from '@bink/shared/components/logo';
import { Button } from '@bink/shared/components/ui/button';
import { BText } from '@bink/shared/components/ui/text';
import { useAuth } from '@bink/shared/lib/auth-context';
import { useI18n } from '@bink/shared/lib/i18n';
import { getSupabase } from '@bink/shared/lib/supabase';
import { colors, font, radius } from '@bink/shared/lib/theme';

/**
 * Team-member invite landing: the emailed invite link opens here with a
 * session already established; the member sets their password and goes
 * straight to the salon dashboard.
 */
export default function Welcome() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (password.length < 6) {
      setError(t('Password must be at least 6 characters.'));
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
    if (err) {
      setError(err.message);
      setBusy(false);
      return;
    }
    // Mark the staff record as joined
    const uid = (await sb.auth.getUser()).data.user?.id;
    if (uid) await sb.from('staff').update({ invite_status: 'joined' }).eq('user_id', uid);
    setBusy(false);
    router.replace('/business/dashboard');
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Logo size={30} />
        <BText variant="h2" style={{ marginTop: 18 }}>
          {t('Welcome to the team!')}
        </BText>
        <BText variant="small" style={{ marginTop: 6, textAlign: 'center' }}>
          {user?.name
            ? t('Hi {name} - set a password to finish creating your account.', { name: user.name })
            : t('Set a password to finish creating your account.')}
        </BText>
        <TextInput
        {...({ dir: 'auto' } as any)}
          placeholder={t('New password')}
          placeholderTextColor={colors.gray}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
        <TextInput
        {...({ dir: 'auto' } as any)}
          placeholder={t('Repeat password')}
          placeholderTextColor={colors.gray}
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
          style={styles.input}
        />
        {error ? (
          <BText variant="small" color={colors.danger} style={{ marginTop: 10 }}>
            {error}
          </BText>
        ) : null}
        <View style={{ marginTop: 16, width: '100%' }}>
          <Button title={t('Save and open my dashboard')} fullWidth loading={busy} onPress={submit} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgPage, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 32,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
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
    width: '100%',
    marginTop: 12,
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
});
