import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useI18n } from '@bink/shared/lib/i18n';
import { colors } from '@bink/shared/lib/theme';
import { Button } from '@bink/shared/components/ui/button';
import { BText } from '@bink/shared/components/ui/text';

/** Shown in place of account content when the visitor isn't signed in. */
export function SignInGate({ icon = 'lock-closed-outline', title }: { icon?: string; title: string }) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: 360 }}>
      <Ionicons name={icon as any} size={44} color={colors.grayLight} />
      <BText variant="h2" style={{ marginTop: 16 }}>
        {title}
      </BText>
      <BText variant="small" style={{ marginTop: 6, textAlign: 'center', maxWidth: 320 }}>
        {t('Sign in or create an account to view this page.')}
      </BText>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
        <Button title={t('Log in')} onPress={() => router.push('/auth')} />
        <Button title={t('Sign up')} variant="secondary" onPress={() => router.push('/auth?mode=signup' as any)} />
      </View>
    </View>
  );
}
