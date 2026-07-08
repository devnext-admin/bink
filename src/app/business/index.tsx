import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '../../components/logo';
import { Button } from '../../components/ui/button';
import { Chip } from '../../components/ui/chip';
import { Field } from '../../components/ui/field';
import { BText } from '../../components/ui/text';
import { useAppData } from '../../lib/app-data-context';
import { useAuth } from '../../lib/auth-context';
import { registerSalon } from '../../lib/business';
import { colors, font, maxContentWidth, radius, shadow } from '../../lib/theme';
import { useIsDesktop } from '../../lib/use-layout';

const PERKS = [
  { icon: 'calendar-outline', title: 'Online bookings 24/7', body: 'Clients book while you sleep — no calls, no back-and-forth.' },
  { icon: 'people-outline', title: 'Reach new clients', body: 'Get discovered by thousands searching on Bink every day.' },
  { icon: 'stats-chart-outline', title: 'Grow with insights', body: 'Track bookings, revenue and your team’s performance.' },
  { icon: 'card-outline', title: 'Zero subscription', body: 'Free to list. You only pay when clients book through Bink.' },
];

export default function BusinessLanding() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const { user, setRole } = useAuth();
  const { categories, allVenues, refresh } = useAppData();

  const myVenues = useMemo(
    () => (user ? allVenues.filter((v) => v.owner_id === user.id) : []),
    [allVenues, user]
  );

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const startListing = () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    setShowForm(true);
  };

  const submit = async () => {
    setError(null);
    if (!name.trim() || !categoryId || !city.trim()) {
      setError('Please fill in at least the salon name, category and city.');
      return;
    }
    setBusy(true);
    await registerSalon({
      ownerId: user!.id,
      name: name.trim(),
      categoryId,
      description: description.trim() || `Welcome to ${name.trim()} — quality treatments, easy booking on Bink.`,
      address: address.trim(),
      area: area.trim(),
      city: city.trim(),
      country: 'Saudi Arabia',
    });
    if (user!.role !== 'admin') await setRole('partner');
    await refresh();
    setBusy(false);
    router.replace('/business/dashboard');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.white }}>
      <LinearGradient
        colors={[...colors.heroGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingTop: insets.top + 16, paddingBottom: 56 }}
      >
        <View style={[styles.inner, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <Logo />
          <Pressable onPress={() => router.push('/')} style={styles.backPill}>
            <BText variant="smallMedium">For customers</BText>
          </Pressable>
        </View>
        <View style={[styles.inner, { alignItems: isDesktop ? 'center' : 'flex-start', paddingTop: 48 }]}>
          <BText
            style={{
              fontFamily: font.extrabold,
              fontSize: isDesktop ? 56 : 36,
              lineHeight: isDesktop ? 64 : 44,
              color: colors.ink,
              textAlign: isDesktop ? 'center' : 'left',
              maxWidth: 720,
            }}
          >
            Bink for business
          </BText>
          <BText
            variant="body"
            style={{ marginTop: 14, maxWidth: 560, textAlign: isDesktop ? 'center' : 'left' }}
          >
            The booking platform that fills your chairs. List your salon or barbershop and start
            taking online bookings today.
          </BText>
          <View style={{ marginTop: 28, flexDirection: 'row', gap: 12 }}>
            {myVenues.length > 0 ? (
              <Button title="Open your dashboard" size="lg" onPress={() => router.push('/business/dashboard')} />
            ) : (
              <Button title="List your business" size="lg" onPress={startListing} />
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Registration form */}
      {showForm && (
        <View style={[styles.inner, { paddingTop: 40 }]}>
          <View style={[styles.formCard, shadow.card, isDesktop && { maxWidth: 640, alignSelf: 'center', width: '100%' }]}>
            <BText variant="h2">Tell us about your business</BText>
            <BText variant="small" style={{ marginTop: 4 }}>
              Your salon will appear on Bink once our team approves it.
            </BText>
            <View style={{ gap: 16, marginTop: 24 }}>
              <Field label="Business name" placeholder="e.g. Luna Beauty Lounge" value={name} onChangeText={setName} />
              <View style={{ gap: 6 }}>
                <BText variant="smallMedium">Category</BText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {categories.map((c) => (
                    <Chip
                      key={c.id}
                      label={c.name}
                      selected={categoryId === c.id}
                      onPress={() => setCategoryId(c.id)}
                    />
                  ))}
                </View>
              </View>
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Field label="City" placeholder="Riyadh" value={city} onChangeText={setCity} />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Area / district" placeholder="Al Olaya" value={area} onChangeText={setArea} />
                </View>
              </View>
              <Field label="Street address" placeholder="Tahlia St, Building 12" value={address} onChangeText={setAddress} />
              <Field
                label="About your business"
                placeholder="What makes your place special?"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                style={{ minHeight: 100 }}
              />
              {error ? (
                <BText variant="small" color={colors.danger}>
                  {error}
                </BText>
              ) : null}
              <Button title="Submit for review" size="lg" fullWidth loading={busy} onPress={submit} />
            </View>
          </View>
        </View>
      )}

      {/* Perks */}
      <View style={[styles.inner, { paddingTop: 64, paddingBottom: 80 }]}>
        <BText variant="h1" style={{ textAlign: isDesktop ? 'center' : 'left' }}>
          Everything you need to grow
        </BText>
        <View
          style={{
            flexDirection: isDesktop ? 'row' : 'column',
            gap: 16,
            marginTop: 32,
          }}
        >
          {PERKS.map((p) => (
            <View key={p.title} style={[styles.perk, isDesktop && { flex: 1 }]}>
              <View style={styles.perkIcon}>
                <Ionicons name={p.icon as any} size={22} color={colors.accent} />
              </View>
              <BText variant="h3" style={{ marginTop: 14 }}>
                {p.title}
              </BText>
              <BText variant="small" style={{ marginTop: 6 }}>
                {p.body}
              </BText>
            </View>
          ))}
        </View>
        {!showForm && myVenues.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Button title="List your business" size="lg" onPress={startListing} />
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inner: {
    width: '100%',
    maxWidth: maxContentWidth + 48,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  backPill: {
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 28,
  },
  perk: {
    backgroundColor: colors.bgPage,
    borderRadius: radius.lg,
    padding: 24,
  },
  perkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3EFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
