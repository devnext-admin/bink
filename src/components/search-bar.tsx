import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { formatDate, useI18n } from '../lib/i18n';
import { getCurrentLocation, type GeoPoint } from '../lib/location';
import { colors, font, radius, shadow } from '../lib/theme';
import { Chip } from './ui/chip';
import { BText } from './ui/text';

type When = { date: string; time: string };

const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const minutes = 10 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
});

function whenLabel(when: When, lang: string, todayText: string) {
  const [y, m, d] = when.date.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  const today = new Date();
  const isToday = day.toDateString() === today.toDateString();
  const dayText = isToday
    ? todayText
    : formatDate(lang as any, day, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${dayText} · ${when.time}`;
}

/** Bottom-sheet style picker: choose a day, then a time. */
export function WhenPicker({
  visible,
  value,
  onClose,
  onChange,
}: {
  visible: boolean;
  value: When | null;
  onClose: () => void;
  onChange: (v: When | null) => void;
}) {
  const { t, lang } = useI18n();
  const [date, setDate] = useState<string | null>(value?.date ?? null);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      label: i === 0 ? t('Today') : formatDate(lang, d, { weekday: 'short', day: 'numeric', month: 'short' }),
    };
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={styles.pickerCard} onPress={() => {}}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <BText variant="h3" style={{ flex: 1 }}>
              {t('When?')}
            </BText>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t('Close')}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginTop: 14 }}>
            {days.map((d) => (
              <Chip key={d.key} label={d.label} selected={date === d.key} onPress={() => setDate(d.key)} />
            ))}
          </ScrollView>
          {date ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {TIME_SLOTS.map((slot) => (
                <Chip
                  key={slot}
                  label={slot}
                  selected={value?.date === date && value?.time === slot}
                  onPress={() => {
                    onChange({ date, time: slot });
                    onClose();
                  }}
                />
              ))}
            </View>
          ) : (
            <BText variant="small" style={{ marginTop: 14 }}>
              {t('Pick a day to see times.')}
            </BText>
          )}
          <View style={{ flexDirection: 'row', marginTop: 16 }}>
            <Chip
              label={t('Any time')}
              selected={!value}
              onPress={() => {
                onChange(null);
                onClose();
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Shared tap-to-locate state for the hero location rows. */
function useLocate() {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle');
  const [loc, setLoc] = useState<GeoPoint | null>(null);
  const locate = async () => {
    if (state === 'busy') return;
    setState('busy');
    const p = await getCurrentLocation();
    if (p) {
      setLoc(p);
      setState('done');
    } else {
      setState('failed');
    }
  };
  return { state, loc, locate };
}

function locationLabel(state: 'idle' | 'busy' | 'done' | 'failed', loc: GeoPoint | null, t: (s: string) => string) {
  if (state === 'busy') return t('Locating…');
  if (state === 'done') return loc?.label ? t(loc.label) : t('Near you');
  if (state === 'failed') return t('Location unavailable');
  return t('Current location');
}

function searchParams(query: string, loc: GeoPoint | null, when: When | null) {
  return {
    ...(query ? { q: query } : {}),
    ...(loc ? { lat: String(loc.lat), lng: String(loc.lng) } : {}),
    ...(when ? { date: when.date, time: when.time } : {}),
  };
}

// Desktop hero search: single white pill, segmented inputs, round black button.
export function HeroSearchDesktop() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');
  const { state: locState, loc, locate } = useLocate();
  const [when, setWhen] = useState<When | null>(null);
  const [whenOpen, setWhenOpen] = useState(false);

  const submit = () => router.push({ pathname: '/search', params: searchParams(query, loc, when) });

  return (
    <View style={[styles.pill, shadow.card]}>
      <View style={styles.segment}>
        <Ionicons name="search" size={18} color={colors.ink} />
        <TextInput
        {...({ dir: 'auto' } as any)}
          placeholder={t('All treatments')}
          placeholderTextColor={colors.ink}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          style={styles.input}
        />
      </View>
      <View style={styles.dividerV} />
      <Pressable onPress={locate} style={({ hovered }: any) => [styles.segment, hovered && { opacity: 0.7 }]}>
        <Ionicons name={locState === 'done' ? 'location' : 'location-outline'} size={18} color={locState === 'done' ? colors.accent : colors.ink} />
        <BText variant="body" numberOfLines={1} style={{ flex: 1 }}>
          {locationLabel(locState, loc, t)}
        </BText>
      </Pressable>
      <View style={styles.dividerV} />
      <Pressable onPress={() => setWhenOpen(true)} style={({ hovered }: any) => [styles.segment, { flex: 0.9 }, hovered && { opacity: 0.7 }]}>
        <Ionicons name="calendar-outline" size={18} color={when ? colors.accent : colors.ink} />
        <BText variant="body" numberOfLines={1} style={{ flex: 1 }}>
          {when ? whenLabel(when, lang, t('Today')) : t('Any time')}
        </BText>
      </Pressable>
      <Pressable onPress={submit} style={({ hovered }: any) => [styles.searchBtn, hovered && { backgroundColor: colors.accentDark }]}>
        <BText style={{ fontFamily: font.bold, fontSize: 15, color: colors.white }}>{t('Search')}</BText>
      </Pressable>
      <WhenPicker visible={whenOpen} value={when} onClose={() => setWhenOpen(false)} onChange={setWhen} />
    </View>
  );
}

// Mobile hero search: stacked rounded fields + full-width black button.
export function HeroSearchMobile() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [query, setQuery] = useState('');
  const { state: locState, loc, locate } = useLocate();
  const [when, setWhen] = useState<When | null>(null);
  const [whenOpen, setWhenOpen] = useState(false);

  const submit = () => router.push({ pathname: '/search', params: searchParams(query, loc, when) });

  return (
    <View style={[styles.mobileCard, shadow.card]}>
      <View style={styles.mobileField}>
        <Ionicons name="search" size={18} color={colors.ink} />
        <TextInput
        {...({ dir: 'auto' } as any)}
          placeholder={t('All treatments')}
          placeholderTextColor={colors.ink}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          style={styles.input}
        />
      </View>
      <View style={styles.dividerH} />
      <Pressable onPress={locate} style={styles.mobileField}>
        <Ionicons name={locState === 'done' ? 'location' : 'location-outline'} size={18} color={locState === 'done' ? colors.accent : colors.ink} />
        <BText variant="body" numberOfLines={1} style={{ flex: 1 }}>
          {locationLabel(locState, loc, t)}
        </BText>
      </Pressable>
      <View style={styles.dividerH} />
      <Pressable onPress={() => setWhenOpen(true)} style={styles.mobileField}>
        <Ionicons name="calendar-outline" size={18} color={when ? colors.accent : colors.ink} />
        <BText variant="body" numberOfLines={1} style={{ flex: 1 }}>
          {when ? whenLabel(when, lang, t('Today')) : t('Any time')}
        </BText>
      </Pressable>
      <Pressable onPress={submit} style={styles.mobileBtn}>
        <BText style={{ fontFamily: font.bold, fontSize: 16, color: colors.white }}>{t('Search Bink')}</BText>
      </Pressable>
      <WhenPicker visible={whenOpen} value={when} onClose={() => setWhenOpen(false)} onChange={setWhen} />
    </View>
  );
}

// Compact pill for headers (venue page, search page).
export function CompactSearch({ onPress }: { onPress?: () => void }) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <Pressable
      onPress={onPress ?? (() => router.push('/search'))}
      style={({ hovered }: any) => [styles.compact, hovered && { backgroundColor: colors.bgSubtle }]}
    >
      <BText variant="small" color={colors.ink} numberOfLines={1} style={styles.compactSegment}>
        {t('All treatments')}
      </BText>
      <View style={styles.compactDivider} />
      <BText variant="small" color={colors.ink} numberOfLines={1} style={styles.compactSegment}>
        {t('Current location')}
      </BText>
      <View style={styles.compactDivider} />
      <BText variant="small" color={colors.ink} numberOfLines={1} style={styles.compactSegment}>
        {t('Any time')}
      </BText>
      <View style={styles.compactBtn}>
        <Ionicons name="search" size={14} color={colors.white} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    padding: 8,
    paddingLeft: 24,
    width: '100%',
    maxWidth: 880,
  },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 12 },
  input: {
    flex: 1,
    fontFamily: font.regular,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 10,
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
  dividerV: { width: 1, height: 28, backgroundColor: colors.divider, marginRight: 16 },
  dividerH: { height: 1, backgroundColor: colors.divider },
  searchBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 48,
    paddingHorizontal: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 12,
    width: '100%',
  },
  mobileField: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 8 },
  mobileBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingLeft: 18,
    paddingRight: 6,
    height: 44,
    backgroundColor: colors.white,
  },
  compactSegment: { flex: 1 },
  compactDivider: { width: 1, height: 20, backgroundColor: colors.divider },
  compactBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,17,17,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: 20,
  },
});
