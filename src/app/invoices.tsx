import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountLayout } from '../components/account-layout';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { BText } from '../components/ui/text';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '../components/web-header';
import { useAuth } from '../lib/auth-context';
import { formatDateLong, formatPrice } from '../lib/format';
import { getMyInvoices } from '../lib/payments';
import { colors, font, radius } from '../lib/theme';
import type { Invoice } from '../lib/types';
import { useIsDesktop } from '../lib/use-layout';

export default function Invoices() {
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getMyInvoices(user?.id).then((i) => {
        setInvoices(i);
        setLoaded(true);
      });
    }, [user?.id])
  );

  const list = (
    <View style={{ gap: 12 }}>
      {loaded && invoices.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={44} color={colors.grayLight} />
          <BText variant="h3" style={{ marginTop: 16 }}>
            No invoices yet
          </BText>
          <BText variant="small" style={{ marginTop: 6, textAlign: 'center' }}>
            Tax invoices are issued automatically when you pay online.
          </BText>
        </View>
      ) : (
        invoices.map((inv) => {
          const expanded = open === inv.id;
          return (
            <Pressable key={inv.id} onPress={() => setOpen(expanded ? null : inv.id)} style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={styles.receiptIcon}>
                  <Ionicons name="receipt-outline" size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <BText variant="title">{inv.number}</BText>
                  <BText variant="tiny">
                    {inv.venue_name ?? 'Bink booking'} · {formatDateLong(inv.issued_at)}
                  </BText>
                </View>
                <BText variant="title">{formatPrice(inv.total_cents, inv.currency)}</BText>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.gray} />
              </View>

              {expanded && (
                <View style={{ marginTop: 16, gap: 8 }}>
                  <View style={styles.divider} />
                  {(inv.items ?? []).map((item) => (
                    <View key={item.service_id} style={styles.line}>
                      <BText variant="small" color={colors.ink}>
                        {item.service_name}
                      </BText>
                      <BText variant="small" color={colors.ink}>
                        {formatPrice(item.price_cents, inv.currency)}
                      </BText>
                    </View>
                  ))}
                  <View style={styles.divider} />
                  <View style={styles.line}>
                    <BText variant="small">Subtotal (excl. VAT)</BText>
                    <BText variant="small" color={colors.ink}>
                      {formatPrice(inv.subtotal_cents, inv.currency)}
                    </BText>
                  </View>
                  <View style={styles.line}>
                    <BText variant="small">VAT ({inv.vat_rate}%)</BText>
                    <BText variant="small" color={colors.ink}>
                      {formatPrice(inv.vat_cents, inv.currency)}
                    </BText>
                  </View>
                  <View style={styles.line}>
                    <BText variant="smallMedium" style={{ fontFamily: font.bold }}>
                      Total
                    </BText>
                    <BText variant="smallMedium" style={{ fontFamily: font.bold }}>
                      {formatPrice(inv.total_cents, inv.currency)}
                    </BText>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })
      )}
    </View>
  );

  if (isDesktop) {
    return <AccountLayout title="Invoices">{list}</AccountLayout>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: TAB_BAR_HEIGHT + 32,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </Pressable>
          <BText variant="h1">Invoices</BText>
        </View>
        {list}
      </ScrollView>
      <BottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    padding: 16,
    backgroundColor: colors.white,
  },
  receiptIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 1, backgroundColor: colors.divider },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 24 },
});
