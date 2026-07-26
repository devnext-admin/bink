import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountLayout } from '../components/account-layout';
import { BottomTabs, TAB_BAR_HEIGHT } from '../components/bottom-tabs';
import { Avatar } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { BText } from '../components/ui/text';
import { VenueCard } from '../components/venue-card';
import { WebFooter } from '../components/web-footer';
import { WebHeader } from '../components/web-header';
import { useAppData } from '../lib/app-data-context';
import { useAuth } from '../lib/auth-context';
import { useI18n } from '../lib/i18n';
import { colors, radius } from '../lib/theme';
import { useIsDesktop } from '../lib/use-layout';

const BASE_MENU = [
  { icon: 'calendar-outline', label: 'Appointments', href: '/appointments' },
  { icon: 'receipt-outline', label: 'Invoices', href: '/invoices' },
  { icon: 'chatbubble-ellipses-outline', label: 'Messages', href: '/messages' },
  { icon: 'notifications-outline', label: 'Notifications', href: '/notifications' },
  { icon: 'heart-outline', label: 'Favorites', href: null },
  { icon: 'storefront-outline', label: 'Bink for Business', href: '/business' },
  { icon: 'settings-outline', label: 'Settings', href: '/settings' },
  { icon: 'help-circle-outline', label: 'Help and support', href: '/support' },
];

export default function Profile() {
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useI18n();
  const { user, signOut, updateProfile } = useAuth();
  const { venues, allVenues, favorites } = useAppData();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const favVenues = venues.filter((v) => favorites.includes(v.id));

  const ownsVenues = user ? allVenues.some((v) => v.owner_id === user.id) : false;
  const MENU = [
    ...BASE_MENU.map((m) =>
      m.label === 'Bink for Business' && ownsVenues ? { ...m, href: '/business/dashboard' } : m
    ),
    ...(user?.role === 'admin'
      ? [{ icon: 'shield-checkmark-outline', label: 'Admin dashboard', href: '/admin' }]
      : []),
  ];

  const content = (
    <View style={{ gap: 24 }}>
      {user ? (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <Avatar name={user.name ?? user.email ?? t('You')} size={64} />
            <View style={{ flex: 1 }}>
              <BText variant="h2">{user.name ?? t('Welcome')}</BText>
              <BText variant="small">{user.email ?? (user.isGuest ? t('Guest account') : '')}</BText>
            </View>
            {!user.isGuest && !editingName && (
              <Button
                title={t('Edit profile')}
                size="sm"
                variant="secondary"
                onPress={() => {
                  setNameDraft(user.name ?? '');
                  setPhoneDraft(user.phone ?? '');
                  setEditingName(true);
                }}
              />
            )}
          </View>

          {!user.isGuest && (
            <View style={styles.detailsCard}>
              {editingName ? (
                <View style={{ gap: 12 }}>
                  <View style={{ gap: 6 }}>
                    <BText variant="tiny" color={colors.gray}>{t('Full name')}</BText>
                    <TextInput
                      {...({ dir: 'auto' } as any)}
                      value={nameDraft}
                      onChangeText={setNameDraft}
                      style={styles.detailInput}
                      placeholder={t('Your name')}
                      placeholderTextColor={colors.gray}
                    />
                  </View>
                  <View style={{ gap: 6 }}>
                    <BText variant="tiny" color={colors.gray}>{t('Phone number')}</BText>
                    <TextInput
                      {...({ dir: 'auto' } as any)}
                      value={phoneDraft}
                      onChangeText={setPhoneDraft}
                      keyboardType="phone-pad"
                      style={styles.detailInput}
                      placeholder={t('e.g. +966 5X XXX XXXX')}
                      placeholderTextColor={colors.gray}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Button
                      title={t('Save changes')}
                      size="sm"
                      loading={savingProfile}
                      onPress={async () => {
                        setSavingProfile(true);
                        await updateProfile({ name: nameDraft, phone: phoneDraft });
                        setSavingProfile(false);
                        setEditingName(false);
                      }}
                    />
                    <Button title={t('Cancel')} size="sm" variant="secondary" onPress={() => setEditingName(false)} />
                  </View>
                </View>
              ) : (
                <View>
                  <DetailRow icon="mail-outline" label={t('Email')} value={user.email ?? '—'}>
                    <View
                      style={[
                        styles.verifyChip,
                        { backgroundColor: user.emailVerified ? colors.greenBg : colors.warningBg },
                      ]}
                    >
                      <Ionicons
                        name={user.emailVerified ? 'checkmark-circle' : 'alert-circle-outline'}
                        size={12}
                        color={user.emailVerified ? colors.green : colors.warning}
                      />
                      <BText variant="tiny" color={user.emailVerified ? colors.green : colors.warning}>
                        {user.emailVerified ? t('Verified') : t('Unverified')}
                      </BText>
                    </View>
                  </DetailRow>
                  <DetailRow icon="call-outline" label={t('Phone')} value={user.phone || t('Not added')} />
                  <DetailRow
                    icon="person-outline"
                    label={t('Account type')}
                    value={user.role === 'admin' ? t('Admin') : user.role === 'partner' ? t('Business') : t('Customer')}
                    last
                  />
                </View>
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.signInCard}>
          <BText variant="h2">{t('Your beauty, booked')}</BText>
          <BText variant="small" style={{ marginTop: 6 }}>
            {t('Sign up to keep your appointments and favorites in one place.')}
          </BText>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <Button title={t('Log in or sign up')} onPress={() => router.push('/auth')} />
          </View>
        </View>
      )}

      {/* The sidebar covers navigation on desktop; signed-out visitors have no account pages to open */}
      {!isDesktop && user && (
        <View style={styles.menuCard}>
          {MENU.map((m, i) => (
            <Pressable
              key={m.label}
              onPress={() => (m.href ? router.push(m.href as any) : null)}
              style={({ hovered }: any) => [
                styles.menuRow,
                i < MENU.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider },
                hovered && { backgroundColor: colors.bgPage },
              ]}
            >
              <Ionicons name={m.icon as any} size={20} color={colors.ink} />
              <BText variant="bodyMedium" style={{ flex: 1 }}>
                {t(m.label)}
              </BText>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.gray} />
            </Pressable>
          ))}
        </View>
      )}

      {favVenues.length ? (
        <View>
          <BText variant="h2" style={{ marginBottom: 16 }}>
            {t('Favorites')}
          </BText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {favVenues.map((v) => (
              <VenueCard key={v.id} venue={v} width={isDesktop ? 226 : undefined} />
            ))}
          </View>
        </View>
      ) : null}

      {user ? (
        <View style={{ alignItems: 'flex-start' }}>
          <Button title={t('Log out')} variant="secondary" onPress={signOut} />
        </View>
      ) : null}
    </View>
  );

  if (isDesktop) {
    return <AccountLayout title={t('Profile')}>{content}</AccountLayout>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: TAB_BAR_HEIGHT + 32,
        }}
      >
        <BText variant="h1" style={{ marginBottom: 20 }}>
          {t('Profile')}
        </BText>
        {content}
      </ScrollView>
      <BottomTabs />
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
  children,
  last,
}: {
  icon: string;
  label: string;
  value: string;
  children?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <Ionicons name={icon as any} size={18} color={colors.gray} />
      <View style={{ flex: 1 }}>
        <BText variant="tiny" color={colors.gray}>
          {label}
        </BText>
        <BText variant="bodyMedium" numberOfLines={1}>
          {value}
        </BText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  detailsCard: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  detailInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 46,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.ink,
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
  verifyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  signInCard: {
    backgroundColor: colors.bgPage,
    borderRadius: radius.lg,
    padding: 24,
  },
  menuCard: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 18,
    color: colors.ink,
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: colors.white,
  },
});
