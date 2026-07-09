import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountLayout } from '../components/account-layout';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { BText } from '../components/ui/text';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '../components/web-header';
import { colors, maxContentWidth, radius } from '../lib/theme';
import { useIsDesktop } from '../lib/use-layout';

const FAQS = [
  {
    q: 'How do I book an appointment?',
    a: 'Find a salon on the home page or through search, open its page, tap Book now, pick your services, professional and time, then confirm. You will see the booking under Appointments.',
  },
  {
    q: 'How do I pay?',
    a: 'You can pay at the venue after your visit, or pay online by card or Apple Pay when confirming. Online payments include 15% VAT and a tax invoice is issued automatically under Invoices.',
  },
  {
    q: 'Can I cancel or reschedule?',
    a: 'Yes — open Appointments, find your upcoming booking, and use Reschedule to pick a new time or Cancel booking to cancel. Paid bookings that are cancelled can be refunded by the salon.',
  },
  {
    q: 'How do refunds work?',
    a: 'For online payments, the salon (or Bink support) issues the refund and it appears on your original payment method. The booking shows a Refunded tag once processed.',
  },
  {
    q: 'How do I list my salon on Bink?',
    a: 'Tap For business, then List your business. Fill in your salon details and submit — the Bink team reviews every listing before it goes live, then you manage services, team and bookings from your dashboard.',
  },
  {
    q: 'How do reviews work?',
    a: 'After your visit, open the booking under Appointments → Past and tap Rate your visit. Your rating updates the salon’s overall score.',
  },
];

export default function Support() {
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [open, setOpen] = useState<number | null>(0);

  const content = (
    <View style={{ gap: 24 }}>
      <View style={{ gap: 10 }}>
        {FAQS.map((f, i) => (
          <Pressable key={f.q} onPress={() => setOpen(open === i ? null : i)} style={styles.faq}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BText variant="title" style={{ flex: 1 }}>
                {f.q}
              </BText>
              <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={16} color={colors.gray} />
            </View>
            {open === i && (
              <BText variant="small" style={{ marginTop: 10 }}>
                {f.a}
              </BText>
            )}
          </Pressable>
        ))}
      </View>

      <View style={styles.contactCard}>
        <BText variant="h3">Still need help?</BText>
        <View style={{ gap: 12, marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="mail-outline" size={18} color={colors.ink} />
            <BText variant="body">support@bink.app</BText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="logo-whatsapp" size={18} color={colors.ink} />
            <BText variant="body">+966 5X XXX XXXX (9 AM – 9 PM, Sun–Thu)</BText>
          </View>
        </View>
      </View>
    </View>
  );

  if (isDesktop) {
    return <AccountLayout title="Help and support">{content}</AccountLayout>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: TAB_BAR_HEIGHT + 32 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </Pressable>
          <BText variant="h1">Help and support</BText>
        </View>
        {content}
      </ScrollView>
      <BottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  desktopContent: {
    width: '100%',
    maxWidth: maxContentWidth + 48,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    minHeight: 600,
  },
  faq: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    padding: 16,
    backgroundColor: colors.white,
  },
  contactCard: {
    backgroundColor: colors.bgPage,
    borderRadius: radius.lg,
    padding: 20,
  },
});
