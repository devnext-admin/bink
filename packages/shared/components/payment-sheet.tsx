import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useI18n } from '../lib/i18n';
import { colors, radius } from '../lib/theme';
import { BText } from './ui/text';

export interface PaymentSheetProps {
  url: string | null;
  visible: boolean;
  onClose: () => void;
}

/**
 * In-app payment page (web build): the gateway's hosted checkout inside an
 * iframe, so the customer never leaves Bink. The paying screen polls the
 * booking's payment status, so completion is detected even though the frame
 * is cross-origin. The native build has its own WebView implementation in
 * payment-sheet.native.tsx.
 */
export function PaymentSheet({ url, visible, onClose }: PaymentSheetProps) {
  const { t } = useI18n();
  if (!url) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <BText variant="title">{t('Complete your payment')}</BText>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel={t('Close')}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            {React.createElement('iframe', {
              src: url,
              style: { border: 0, width: '100%', height: '100%' },
              allow: 'payment *',
              title: t('Payment'),
            })}
          </View>
          <BText variant="tiny" style={{ padding: 10, textAlign: 'center' }}>
            {t('Payments are processed securely by the payment provider. This window closes by itself once the payment is confirmed.')}
          </BText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(19,19,19,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    width: '100%',
    maxWidth: 480,
    height: '90%' as any,
    maxHeight: 720,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
});
