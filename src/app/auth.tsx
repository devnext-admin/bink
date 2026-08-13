import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
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
import { useI18n } from '../lib/i18n';
import { getSupabase } from '../lib/supabase';
import { colors, font, radius } from '../lib/theme';

export default function Auth() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { signIn, signUp, continueAsGuest, signInWithProvider, resendVerification } = useAuth();
  const { refresh } = useAppData();
  const [demoBusy, setDemoBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const DEMO_PASSWORD = 'binkdemo123';
  const enterDemo = async (persona: 'customer' | 'owner' | 'staffer' | 'admin') => {
    setDemoBusy(persona);
    if (!isSupabaseConfigured) {
      if (persona === 'customer') await seedCustomerDemo();
      else if (persona === 'owner') await seedOwnerDemo();
      else {
        await seedCustomerDemo();
        await seedOwnerDemo();
      }
    }
    const email =
      persona === 'customer'
        ? DEMO_CUSTOMER_EMAIL
        : persona === 'owner'
          ? DEMO_OWNER_EMAIL
          : persona === 'staffer'
            ? 'staff@bink.com'
            : DEMO_ADMIN_EMAIL;
    const err = await signIn(email, DEMO_PASSWORD);
    if (err) {
      setError(err);
      setDemoBusy(null);
      return;
    }
    await refresh();
    router.replace(
      persona === 'customer' ? '/appointments' : persona === 'admin' ? '/admin' : '/business/dashboard'
    );
    setDemoBusy(null);
  };

  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'signin' | 'signup'>(params.mode === 'signup' ? 'signup' : 'signin');
  const [forgot, setForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const sendReset = async () => {
    if (!email.trim()) {
      setError(t('Please fill in all fields.'));
      return;
    }
    const sb = getSupabase();
    if (!sb) return;
    setResetBusy(true);
    setError(null);
    const redirectTo =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : 'https://bink-three.vercel.app/reset-password';
    const { error: err } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setResetBusy(false);
    if (err) setError(err.message);
    else setResetSent(true);
  };
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m);
    setError(null); // clear any stale error carried over between tabs
  };

  const onOAuth = async (provider: 'google' | 'apple') => {
    setError(null);
    const err = await signInWithProvider(provider);
    if (err) setError(err);
    // On success the browser redirects to the provider; nothing more to do.
  };

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const pwLongEnough = password.length >= 8;

  const submit = async () => {
    setError(null);
    if (!email || !password || (mode === 'signup' && !name)) {
      setError(t('Please fill in all fields.'));
      return;
    }
    if (mode === 'signup') {
      if (!pwLongEnough) {
        setError(t('Password must be at least 8 characters.'));
        return;
      }
      if (password !== confirm) {
        setError(t('Passwords do not match.'));
        return;
      }
      if (!agreed) {
        setError(t('Please accept the Terms and Privacy Policy to continue.'));
        return;
      }
    }
    setBusy(true);
    if (mode === 'signin') {
      const err = await signIn(email, password);
      setBusy(false);
      if (err) {
        setError(err);
        return;
      }
      const sb = getSupabase();
      if (sb) {
        const uid = (await sb.auth.getUser()).data.user?.id;
        if (uid) {
          const { data: p } = await sb.from('profiles').select('role').eq('id', uid).maybeSingle();
          if (p?.role === 'partner') {
            router.replace('/business/dashboard');
            return;
          }
        }
      }
      close();
      return;
    }
    const res = await signUp(name, email, password, { phone: phone.trim() || undefined });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.needsVerification) {
      setSentTo(email);
      return;
    }
    // Autoconfirm on (or demo mode) - straight in
    await refresh();
    close();
  };

  // ---- Verify-email screen (shown after a successful sign-up) --------------
  if (sentTo) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.white }}
        contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}
      >
        <Pressable onPress={close} style={[styles.close, { top: insets.top + 16 }]}>
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
        <View style={{ width: '100%', maxWidth: 400, alignItems: 'center', gap: 12 }}>
          <View style={styles.mailCircle}>
            <Ionicons name="mail-open-outline" size={34} color={colors.accent} />
          </View>
          <BText variant="h2" style={{ textAlign: 'center' }}>
            {t('Check your email')}
          </BText>
          <BText variant="small" style={{ textAlign: 'center' }}>
            {t('We sent a verification link to {email}. Click it to activate your account, then log in.', {
              email: sentTo,
            })}
          </BText>
          <Button
            title={t('I have verified - log in')}
            size="lg"
            fullWidth
            onPress={() => {
              setSentTo(null);
              switchMode('signin');
            }}
          />
          <Pressable
            onPress={async () => {
              const err = await resendVerification(sentTo);
              if (!err) setResent(true);
            }}
          >
            <BText variant="small" color={colors.accent}>
              {resent ? t('Verification email re-sent') : t('Resend verification email')}
            </BText>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.white }}
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={close} style={[styles.close, { top: insets.top + 16 }]}>
        <Ionicons name="close" size={22} color={colors.ink} />
      </Pressable>

      <View style={{ width: '100%', maxWidth: 400, gap: 14 }}>
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <Logo size={32} />
          <BText variant="h2" style={{ marginTop: 16 }}>
            {mode === 'signin' ? t('Welcome back') : t('Create your account')}
          </BText>
          <BText variant="small" style={{ marginTop: 4, textAlign: 'center' }}>
            {t('Book unforgettable salon experiences')}
          </BText>
        </View>

        {mode === 'signup' && (
          <TextInput
            {...({ dir: 'auto' } as any)}
            placeholder={t('Full name')}
            placeholderTextColor={colors.gray}
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
        )}
        <TextInput
          {...({ dir: 'auto' } as any)}
          placeholder={t('Email address')}
          placeholderTextColor={colors.gray}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          onSubmitEditing={submit}
          style={styles.input}
        />
        {mode === 'signup' && (
          <TextInput
            {...({ dir: 'auto' } as any)}
            placeholder={t('Phone number (optional)')}
            placeholderTextColor={colors.gray}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
          />
        )}
        <View>
          <TextInput
            {...({ dir: 'auto' } as any)}
            placeholder={t('Password')}
            placeholderTextColor={colors.gray}
            secureTextEntry={!showPw}
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            style={styles.input}
          />
          <Pressable onPress={() => setShowPw((s) => !s)} style={styles.eye} hitSlop={8}>
            <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.gray} />
          </Pressable>
        </View>
        {mode === 'signin' && (
          <Pressable
            onPress={() => {
              setError(null);
              setResetSent(false);
              setForgot(true);
            }}
            style={{ alignSelf: 'flex-start' }}
            hitSlop={6}
          >
            <BText variant="small" color={colors.accent}>
              {t('Forgot password?')}
            </BText>
          </Pressable>
        )}
        {forgot && (
          <View style={styles.forgotBox}>
            {resetSent ? (
              <BText variant="small" color={colors.green}>
                {t('Reset link sent to {email}. Open it, then set a new password.', { email: email.trim() })}
              </BText>
            ) : (
              <>
                <BText variant="small">
                  {t('Enter your email above, then tap the button - we will send you a reset link.')}
                </BText>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <Button title={t('Send reset link')} size="sm" loading={resetBusy} onPress={sendReset} />
                  <Button title={t('Cancel')} size="sm" variant="secondary" onPress={() => setForgot(false)} />
                </View>
              </>
            )}
          </View>
        )}
        {mode === 'signup' && (
          <>
            <TextInput
              {...({ dir: 'auto' } as any)}
              placeholder={t('Confirm password')}
              placeholderTextColor={colors.gray}
              secureTextEntry={!showPw}
              value={confirm}
              onChangeText={setConfirm}
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons
                name={pwLongEnough ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={pwLongEnough ? colors.green : colors.gray}
              />
              <BText variant="tiny" color={pwLongEnough ? colors.green : colors.gray}>
                {t('At least 8 characters')}
              </BText>
            </View>
            <Pressable style={styles.agreeRow} onPress={() => setAgreed((a) => !a)}>
              <Ionicons
                name={agreed ? 'checkbox' : 'square-outline'}
                size={20}
                color={agreed ? colors.accent : colors.gray}
              />
              <BText variant="tiny" style={{ flex: 1 }}>
                {t('I agree to the')}{' '}
                <BText variant="tiny" color={colors.accent} onPress={() => router.push('/terms')}>
                  {t('Terms of service')}
                </BText>{' '}
                {t('and')}{' '}
                <BText variant="tiny" color={colors.accent} onPress={() => router.push('/privacy')}>
                  {t('Privacy Policy')}
                </BText>
                .
              </BText>
            </Pressable>
          </>
        )}

        {error ? (
          <BText variant="small" color={colors.danger}>
            {error}
          </BText>
        ) : null}

        <Button
          title={mode === 'signin' ? t('Log in') : t('Sign up')}
          size="lg"
          fullWidth
          loading={busy}
          onPress={submit}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.hr} />
          <BText variant="tiny">{t('or continue with')}</BText>
          <View style={styles.hr} />
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Pressable style={styles.oauthBtn} onPress={() => onOAuth('google')}>
            <Ionicons name="logo-google" size={18} color={colors.ink} />
            <BText variant="smallMedium">Google</BText>
          </Pressable>
          <Pressable style={styles.oauthBtn} onPress={() => onOAuth('apple')}>
            <Ionicons name="logo-apple" size={19} color={colors.ink} />
            <BText variant="smallMedium">Apple</BText>
          </Pressable>
        </View>

        <Button
          title={t('Continue as guest')}
          variant="secondary"
          size="lg"
          fullWidth
          onPress={async () => {
            await continueAsGuest();
            close();
          }}
        />

        <View style={styles.bizHint}>
          <Ionicons name="briefcase-outline" size={15} color={colors.gray} />
          <BText variant="tiny" style={{ flex: 1 }}>
            {t('Salon owner or freelancer? Log in with the same account - you’ll land straight in your business dashboard.')}
          </BText>
        </View>

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <View style={styles.hr} />
            <BText variant="tiny">{t('or explore a ready-made demo')}</BText>
            <View style={styles.hr} />
          </View>
          <DemoButton
            icon="person-outline"
            title={t('Demo customer')}
            sub={t('Bookings, escrow, chat & reviews pre-loaded')}
            loading={demoBusy === 'customer'}
            onPress={() => enterDemo('customer')}
          />
          <DemoButton
            icon="storefront-outline"
            title={t('Demo salon owner')}
            sub={t('A live salon with sales, messages & analytics')}
            loading={demoBusy === 'owner'}
            onPress={() => enterDemo('owner')}
          />
          <DemoButton
            icon="cut-outline"
            title={t('Demo team member')}
            sub={t('A stylist who sees only her own bookings')}
            loading={demoBusy === 'staffer'}
            onPress={() => enterDemo('staffer')}
          />
          <DemoButton
            icon="shield-checkmark-outline"
            title={t('Demo admin')}
            sub={t('Approvals, users, payments & platform stats')}
            loading={demoBusy === 'admin'}
            onPress={() => enterDemo('admin')}
          />
        </View>

        <Pressable onPress={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}>
          <BText variant="small" style={{ textAlign: 'center' }}>
            {mode === 'signin' ? t("Don't have an account?") : t('Already have an account?')}{' '}
            <BText variant="small" color={colors.accent} style={{ fontFamily: font.bold }}>
              {mode === 'signin' ? t('Sign up') : t('Log in')}
            </BText>
          </BText>
        </Pressable>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
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
  const { isRTL } = useI18n();
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
      <Ionicons name={loading ? 'hourglass-outline' : isRTL ? 'arrow-back' : 'arrow-forward'} size={16} color={colors.gray} />
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
  eye: { position: 'absolute', right: 14, top: 16 },
  forgotBox: {
    backgroundColor: colors.bgSubtle,
    borderRadius: radius.md,
    padding: 12,
  },
  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mailCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  oauthBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
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
  bizHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgPage,
    borderRadius: radius.md,
    padding: 10,
  },
});
