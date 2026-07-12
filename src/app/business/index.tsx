import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
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
import { getSupabase } from '../../lib/supabase';
import { colors, font, maxContentWidth, radius, shadow } from '../../lib/theme';
import type { Venue } from '../../lib/types';
import { useIsDesktop } from '../../lib/use-layout';

const PERKS = [
  { icon: 'calendar-outline', title: 'Online bookings 24/7', body: 'Clients book while you sleep — no calls, no back-and-forth.' },
  { icon: 'people-outline', title: 'Reach new clients', body: 'Get discovered by thousands searching on Bink every day.' },
  { icon: 'stats-chart-outline', title: 'Grow with insights', body: 'Track bookings, revenue and your team’s performance.' },
  { icon: 'card-outline', title: 'Zero subscription', body: 'Free to list. You only pay when clients book through Bink.' },
];

const WIZARD_STEPS = ['Business', 'Location', 'Photos', 'Services', 'Team', 'Hours'] as const;
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface DraftService {
  name: string;
  duration_minutes: number;
  price_cents: number;
}

export default function BusinessLanding() {
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const insets = useSafeAreaInsets();
  const { user, setRole, signUp } = useAuth();
  const { categories, allVenues, refresh } = useAppData();

  const myVenues = useMemo(
    () => (user ? allVenues.filter((v) => v.owner_id === user.id) : []),
    [allVenues, user]
  );

  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Step 1 — business
  const [providerType, setProviderType] = useState<'salon' | 'freelancer'>('salon');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  // Account (collected when the person isn't signed in yet)
  const needsAccount = !user || user.isGuest;
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  // Step 2 — location
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [address, setAddress] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  // Step 3 — photos
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  // Step 4 — services
  const [svcName, setSvcName] = useState('');
  const [svcDuration, setSvcDuration] = useState('60');
  const [svcPrice, setSvcPrice] = useState('');
  const [services, setServices] = useState<DraftService[]>([]);
  // Step 5 — team
  const [memberName, setMemberName] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [team, setTeam] = useState<{ name: string; role: string }[]>([]);
  // Step 6 — hours
  const [hours, setHours] = useState<Venue['hours']>(
    Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      open_time: weekday === 0 ? null : '10:00',
      close_time: weekday === 0 ? null : '22:00',
      is_closed: weekday === 0,
    }))
  );

  const startListing = () => setShowWizard(true);

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!name.trim()) return providerType === 'freelancer' ? 'Please enter your professional name.' : 'Please enter your business name.';
      if (!categoryId) return 'Please pick a category.';
      if (needsAccount) {
        if (!ownerName.trim()) return 'Please enter your name.';
        if (!/^\S+@\S+\.\S+$/.test(ownerEmail.trim())) return 'Please enter a valid email address.';
        if (ownerPassword.length < 6) return 'Password must be at least 6 characters.';
      }
    }
    if (step === 1 && !city.trim()) return 'Please enter your city.';
    if (step === 1 && mapsUrl.trim() && !mapsUrl.trim().startsWith('http')) return 'The Google Maps link should start with http.';
    return null;
  };

  const next = () => {
    const err = validateStep();
    setError(err);
    if (err) return;
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };

  const back = () => {
    setError(null);
    if (step === 0) setShowWizard(false);
    else setStep((s) => s - 1);
  };

  const addImage = () => {
    const url = imageUrl.trim();
    if (!url.startsWith('http')) return;
    if (!images.includes(url)) setImages((im) => [...im, url]);
    setImageUrl('');
  };

  const addDraftService = () => {
    if (!svcName.trim() || !svcPrice.trim()) return;
    setServices((s) => [
      ...s,
      {
        name: svcName.trim(),
        duration_minutes: Math.max(5, parseInt(svcDuration, 10) || 30),
        price_cents: Math.round(parseFloat(svcPrice) * 100),
      },
    ]);
    setSvcName('');
    setSvcPrice('');
  };

  const addMember = () => {
    if (!memberName.trim()) return;
    setTeam((t) => [...t, { name: memberName.trim(), role: memberRole.trim() || 'Specialist' }]);
    setMemberName('');
    setMemberRole('');
  };

  const patchHour = (weekday: number, p: Partial<Venue['hours'][number]>) =>
    setHours((hs) => hs.map((h) => (h.weekday === weekday ? { ...h, ...p } : h)));

  const submit = async () => {
    setBusy(true);
    setError(null);

    // Create the owner's login first, so the salon has an account to sign
    // back into for appointments, messages and sales.
    let ownerId = user?.id ?? null;
    if (needsAccount) {
      const err = await signUp(ownerName.trim(), ownerEmail.trim(), ownerPassword, 'partner');
      if (err) {
        setError(err);
        setBusy(false);
        return;
      }
      const sb = getSupabase();
      ownerId = sb ? ((await sb.auth.getUser()).data.user?.id ?? null) : `demo-${ownerEmail.trim()}`;
      if (!ownerId) {
        setError('Could not create your account. Please try again.');
        setBusy(false);
        return;
      }
    }

    await registerSalon({
      ownerId: ownerId!,
      providerType,
      mapsUrl: mapsUrl.trim() || null,
      name: name.trim(),
      categoryId: categoryId!,
      description:
        description.trim() ||
        (providerType === 'freelancer'
          ? `${name.trim()} — independent professional, easy booking on Bink.`
          : `Welcome to ${name.trim()} — quality treatments, easy booking on Bink.`),
      address: address.trim(),
      area: area.trim(),
      city: city.trim(),
      country: 'Saudi Arabia',
      images,
      services,
      staff: team,
      hours,
    });
    if (!needsAccount && user && user.role !== 'admin' && user.role !== 'partner') await setRole('partner');
    await refresh();
    setBusy(false);
    router.replace('/business/dashboard');
  };

  // ------------------------------ wizard steps ------------------------------
  let stepBody: React.ReactNode = null;
  if (step === 0) {
    stepBody = (
      <View style={{ gap: 16 }}>
        <View style={{ gap: 6 }}>
          <BText variant="smallMedium">I&apos;m listing</BText>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(
              [
                { key: 'salon', icon: 'storefront-outline', title: 'A salon / studio', sub: 'A place with chairs and a team' },
                { key: 'freelancer', icon: 'person-outline', title: 'Myself — freelancer', sub: 'Independent professional' },
              ] as const
            ).map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => setProviderType(opt.key)}
                style={[styles.typeCard, providerType === opt.key && { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}
              >
                <Ionicons name={opt.icon as any} size={20} color={providerType === opt.key ? colors.accent : colors.ink} />
                <BText variant="smallMedium" color={providerType === opt.key ? colors.accent : colors.ink}>
                  {opt.title}
                </BText>
                <BText variant="tiny">{opt.sub}</BText>
              </Pressable>
            ))}
          </View>
        </View>
        <Field
          label={providerType === 'freelancer' ? 'Your professional name' : 'Business name'}
          placeholder={providerType === 'freelancer' ? 'e.g. Lama — Hair & Makeup' : 'e.g. Luna Beauty Lounge'}
          value={name}
          onChangeText={setName}
        />
        <View style={{ gap: 6 }}>
          <BText variant="smallMedium">Category</BText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {categories.map((c) => (
              <Chip key={c.id} label={c.name} selected={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
            ))}
          </View>
        </View>
        <Field
          label={providerType === 'freelancer' ? 'About you' : 'About your business'}
          placeholder={providerType === 'freelancer' ? 'Your experience, specialties, how you work…' : 'What makes your place special?'}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={{ minHeight: 100 }}
        />
        {needsAccount && (
          <View style={styles.accountBox}>
            <BText variant="smallMedium">Create your Bink account</BText>
            <BText variant="tiny" style={{ marginBottom: 8 }}>
              You&apos;ll sign in with this to manage bookings, messages and sales.
            </BText>
            <View style={{ gap: 10 }}>
              <Field label="Your name" placeholder="e.g. Lama" value={ownerName} onChangeText={setOwnerName} />
              <Field
                label="Email"
                placeholder="you@example.com"
                value={ownerEmail}
                onChangeText={setOwnerEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Field label="Password" placeholder="At least 6 characters" value={ownerPassword} onChangeText={setOwnerPassword} secureTextEntry />
            </View>
          </View>
        )}
      </View>
    );
  } else if (step === 1) {
    stepBody = (
      <View style={{ gap: 16 }}>
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
          label="Google Maps link (optional)"
          placeholder="https://maps.app.goo.gl/…"
          value={mapsUrl}
          onChangeText={setMapsUrl}
          autoCapitalize="none"
        />
        <BText variant="tiny">
          Paste your place&apos;s share link from Google Maps — customers get one-tap directions.
        </BText>
      </View>
    );
  } else if (step === 2) {
    stepBody = (
      <View style={{ gap: 16 }}>
        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
          <BText variant="tiny" color={colors.accent} style={{ flex: 1 }}>
            Photos must not show people, faces or body parts — interiors, tools and products only. You can
            skip this step and add photos later; a default interior photo is used until then.
          </BText>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field label="Photo URL" placeholder="https://…" value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" />
          </View>
          <Button title="Add" size="sm" variant="secondary" onPress={addImage} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {images.map((url) => (
            <View key={url} style={{ position: 'relative' }}>
              <Image
                source={{ uri: url }}
                style={{ width: 110, height: 74, borderRadius: radius.sm, backgroundColor: colors.bgSubtle }}
                contentFit="cover"
              />
              <Pressable onPress={() => setImages((im) => im.filter((u) => u !== url))} style={styles.imgRemove} hitSlop={6}>
                <Ionicons name="close" size={12} color={colors.white} />
              </Pressable>
            </View>
          ))}
          {!images.length && (
            <BText variant="small">No photos yet — that’s okay for now.</BText>
          )}
        </View>
      </View>
    );
  } else if (step === 3) {
    stepBody = (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <View style={{ flex: 2 }}>
            <Field label="Service name" placeholder="e.g. Gel Manicure" value={svcName} onChangeText={setSvcName} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Minutes" keyboardType="numeric" value={svcDuration} onChangeText={setSvcDuration} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Price" keyboardType="numeric" placeholder="150" value={svcPrice} onChangeText={setSvcPrice} />
          </View>
          <Button title="Add" size="sm" variant="secondary" onPress={addDraftService} />
        </View>
        {services.map((s, i) => (
          <View key={`${s.name}-${i}`} style={styles.draftRow}>
            <BText variant="smallMedium" style={{ flex: 1 }}>
              {s.name}
            </BText>
            <BText variant="small">
              {s.duration_minutes} min · SAR {(s.price_cents / 100).toFixed(0)}
            </BText>
            <Pressable onPress={() => setServices((list) => list.filter((_, x) => x !== i))} hitSlop={6}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          </View>
        ))}
        {!services.length && (
          <BText variant="small">Add at least one service so customers can book you — or add them later.</BText>
        )}
      </View>
    );
  } else if (step === 4) {
    stepBody = (
      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Field label="Name" placeholder="e.g. Sara" value={memberName} onChangeText={setMemberName} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Role" placeholder="Stylist" value={memberRole} onChangeText={setMemberRole} />
          </View>
          <Button title="Add" size="sm" variant="secondary" onPress={addMember} />
        </View>
        {team.map((m, i) => (
          <View key={`${m.name}-${i}`} style={styles.draftRow}>
            <BText variant="smallMedium" style={{ flex: 1 }}>
              {m.name}
            </BText>
            <BText variant="small">{m.role}</BText>
            <Pressable onPress={() => setTeam((list) => list.filter((_, x) => x !== i))} hitSlop={6}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
            </Pressable>
          </View>
        ))}
        {!team.length && <BText variant="small">Optional — clients can pick “Any professional” if you skip this.</BText>}
      </View>
    );
  } else {
    stepBody = (
      <View style={{ gap: 10 }}>
        {[1, 2, 3, 4, 5, 6, 0].map((w) => {
          const h = hours.find((x) => x.weekday === w)!;
          return (
            <View key={w} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <BText variant="smallMedium" style={{ width: 92 }}>
                {WEEKDAY_NAMES[w]}
              </BText>
              {h.is_closed ? (
                <BText variant="small" style={{ flex: 1 }}>
                  Closed
                </BText>
              ) : (
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Field
                    value={h.open_time ?? '10:00'}
                    onChangeText={(v) => patchHour(w, { open_time: v })}
                    style={{ minHeight: 38, width: 74, paddingHorizontal: 8 }}
                  />
                  <BText variant="tiny">to</BText>
                  <Field
                    value={h.close_time ?? '22:00'}
                    onChangeText={(v) => patchHour(w, { close_time: v })}
                    style={{ minHeight: 38, width: 74, paddingHorizontal: 8 }}
                  />
                </View>
              )}
              <Pressable
                onPress={() => patchHour(w, { is_closed: !h.is_closed })}
                style={[styles.toggleBtn, { borderColor: h.is_closed ? colors.green : colors.border }]}
              >
                <BText style={{ fontFamily: font.semibold, fontSize: 12, color: h.is_closed ? colors.green : colors.gray }}>
                  {h.is_closed ? 'Open this day' : 'Mark closed'}
                </BText>
              </Pressable>
            </View>
          );
        })}
      </View>
    );
  }

  const lastStep = step === WIZARD_STEPS.length - 1;

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
          <BText variant="body" style={{ marginTop: 14, maxWidth: 560, textAlign: isDesktop ? 'center' : 'left' }}>
            The booking platform that fills your calendar. List your salon, studio or yourself as a
            freelancer and start taking online bookings today.
          </BText>
          <View style={{ marginTop: 28, flexDirection: 'row', gap: 12 }}>
            {myVenues.length > 0 ? (
              <Button title="Open your dashboard" size="lg" onPress={() => router.push('/business/dashboard')} />
            ) : (
              !showWizard && <Button title="List your business" size="lg" onPress={startListing} />
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Setup wizard */}
      {showWizard && (
        <View style={[styles.inner, { paddingTop: 40 }]}>
          <View style={[styles.formCard, shadow.card, isDesktop && { maxWidth: 680, alignSelf: 'center', width: '100%' }]}>
            {/* Stepper */}
            <View style={styles.stepper}>
              {WIZARD_STEPS.map((label, i) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={[
                      styles.stepDot,
                      i === step && { backgroundColor: colors.accent },
                      i < step && { backgroundColor: colors.greenBg },
                    ]}
                  >
                    {i < step ? (
                      <Ionicons name="checkmark" size={12} color={colors.green} />
                    ) : (
                      <BText style={{ fontFamily: font.bold, fontSize: 11, color: i === step ? colors.white : colors.gray }}>
                        {i + 1}
                      </BText>
                    )}
                  </View>
                  {isDesktop && (
                    <BText
                      variant="tiny"
                      color={i === step ? colors.ink : colors.gray}
                      style={i === step ? { fontFamily: font.bold } : undefined}
                    >
                      {label}
                    </BText>
                  )}
                  {i < WIZARD_STEPS.length - 1 && <View style={styles.stepLine} />}
                </View>
              ))}
            </View>

            <BText variant="h2" style={{ marginTop: 20 }}>
              {step === 0 && 'Tell us about your business'}
              {step === 1 && 'Where are you located?'}
              {step === 2 && 'Add photos of your space'}
              {step === 3 && 'What services do you offer?'}
              {step === 4 && 'Introduce your team'}
              {step === 5 && 'Set your opening hours'}
            </BText>
            <BText variant="small" style={{ marginTop: 4, marginBottom: 20 }}>
              Step {step + 1} of {WIZARD_STEPS.length} — your listing goes live once the Bink team approves it.
            </BText>

            {stepBody}

            {error ? (
              <BText variant="small" color={colors.danger} style={{ marginTop: 12 }}>
                {error}
              </BText>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
              <Button title={step === 0 ? 'Cancel' : 'Back'} variant="secondary" onPress={back} />
              <View style={{ flex: 1 }}>
                <Button
                  title={lastStep ? 'Submit for review' : 'Continue'}
                  fullWidth
                  loading={busy}
                  onPress={lastStep ? submit : next}
                />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Perks */}
      <View style={[styles.inner, { paddingTop: 64, paddingBottom: 80 }]}>
        <BText variant="h1" style={{ textAlign: isDesktop ? 'center' : 'left' }}>
          Everything you need to grow
        </BText>
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 16, marginTop: 32 }}>
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
        {!showWizard && myVenues.length === 0 && (
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
  typeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 14,
    gap: 4,
  },
  accountBox: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    padding: 16,
    backgroundColor: colors.bgPage,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 28,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: { width: 18, height: 2, backgroundColor: colors.divider, marginHorizontal: 2 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: 12,
  },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  imgRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(34,34,34,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtn: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
