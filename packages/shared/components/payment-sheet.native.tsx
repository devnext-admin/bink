import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useI18n } from '../lib/i18n';
import { colors, radius } from '../lib/theme';
import { BText } from './ui/text';

export interface PaymentSheetProps {
  url: string | null;
  visible: boolean;
  onClose: () => void;
}

/**
 * In-app payment page (native): the gateway's hosted checkout in a WebView
 * sheet, so the customer never leaves the app. The paying screen polls the
 * booking's payment status to detect completion.
 */
export function PaymentSheet({ url, visible, onClose }: PaymentSheetProps) {
  const { t } = useI18n();
  if (!url) return null;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={styles.sheet}>
        <View style={styles.header}>
          <BText variant="title">{t('Complete your payment')}</BText>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel={t('Close')}>
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
        </View>
        <WebView source={{ uri: url }} style={{ flex: 1 }} startInLoadingState />
        <BText variant="tiny" style={{ padding: 10, textAlign: 'center' }}>
          {t('Payments are processed securely by the payment provider. This window closes by itself once the payment is confirmed.')}
        </BText>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
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
