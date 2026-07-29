import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReviewCard } from '../../components/review-card';
import { Seo } from '../../components/seo';
import { SectionRail } from '../../components/section-rail';
import { ServiceRow } from '../../components/service-row';
import { StaffAvatar } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Chip } from '../../components/ui/chip';
import { Rating, RatingStars } from '../../components/ui/rating';
import { BText } from '../../components/ui/text';
import { WebFooter } from '../../components/web-footer';
import { WebHeader } from '../../components/web-header';
import { useAppData } from '../../lib/app-data-context';
import { useAuth } from '../../lib/auth-context';
import { useBooking } from '../../lib/booking-context';
import { getBookings } from '../../lib/data';
import { sized } from '../../lib/image';
import { formatTime, weekdayName } from '../../lib/format';
import { useI18n } from '../../lib/i18n';
import { getLocalReviews, ratingWithLocal, submitReview } from '../../lib/ops';
import { colors, font, maxContentWidth, radius, shadow } from '../../lib/theme';
import type { Review, Service, Venue } from '../../lib/types';
import { useIsDesktop } from '../../lib/use-layout';

const HIGHLIGHT_ICONS: Record<string, string> = {
  'Instant confirmation': 'flash-outline',
  'Pay by app': 'phone-portrait-outline',
  'Parking available': 'car-outline',
  'Woman-owned': 'female-outline',
  'Walk-ins welcome': 'walk-outline',
  'Adults only': 'person-outline',
  'Couples rooms': 'people-outline',
  'Licensed practitioners': 'ribbon-outline',
  'Sea view': 'water-outline',
  'Espresso bar': 'cafe-outline',
  'Complimentary drinks': 'cafe-outline',
  'Bridal packages': 'rose-outline',
  'By appointment only': 'calendar-outline',
};

export default function VenueScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useI18n();
  const { allVenues } = useAppData();
  const venue = allVenues.find((v) => v.slug === slug);
  const isDesktop = useIsDesktop();

  if (!venue) return null;
  return (
    <>
      <Seo
        title={`${t(venue.name)} - ${t(venue.area)}, ${t(venue.city)}`}
        description={`Book ${t(venue.name)} in ${venue.city} on Bink. ${t(venue.description)}`.slice(0, 180)}
      />
      {isDesktop ? <VenueDesktop venue={venue} /> : <VenueMobile venue={venue} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Shared sections
// ---------------------------------------------------------------------------
function useServiceGroups(venue: Venue) {
  const [group, setGroup] = useState('Featured');
  const groups = useMemo(
    () => [...new Set(venue.services.map((s) => s.group_name))],
    [venue.services]
  );
  const visible = venue.services.filter((s) => s.group_name === group);
  return { group, setGroup, groups, visible };
}

function ServicesSection({ venue, compact }: { venue: Venue; compact?: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const { startBooking } = useBooking();
  const { group, setGroup, groups, visible } = useServiceGroups(venue);

  const book = (service?: Service) => {
    startBooking(venue, service);
    router.push(`/booking/${venue.slug}`);
  };

  return (
    <View>
      <BText variant="h2">{t('Services')}</BText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 16 }}
      >
        {groups.map((g) => (
          <Chip key={g} label={t(g)} selected={group === g} onPress={() => setGroup(g)} />
        ))}
      </ScrollView>
      <View style={{ gap: 12 }}>
        {visible.map((s) => (
          <ServiceRow key={s.id} service={s} mode="book" onAction={() => book(s)} />
        ))}
      </View>
    </View>
  );
}

function TeamSection({ venue }: { venue: Venue }) {
  const { t } = useI18n();
  return (
    <View>
      <BText variant="h2">{t('Team')}</BText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 20, paddingTop: 20 }}
      >
        {venue.staff.map((m) => (
          <StaffAvatar key={m.id} name={m.name} role={m.role} url={m.avatar_url} />
        ))}
      </ScrollView>
    </View>
  );
}

function ReviewsSection({ venue, columns = 2 }: { venue: Venue; columns?: number }) {
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const [localReviews, setLocalReviews] = useState<Review[]>([]);
  const [eligible, setEligible] = useState<{ bookingId: string } | null>(null);
  const [composing, setComposing] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => getLocalReviews(venue.id).then(setLocalReviews, () => {});
  useEffect(() => {
    load();
  }, [venue.id]);

  // A customer can review a venue once they have a past booking there that
  // they have not already rated.
  useEffect(() => {
    if (!user || user.isGuest) {
      setEligible(null);
      return;
    }
    getBookings(user.id).then((bookings) => {
      const past = bookings.find(
        (b) => b.venue_id === venue.id && new Date(b.starts_at).getTime() < Date.now() && b.status !== 'cancelled' && !b.rated
      );
      setEligible(past ? { bookingId: past.id } : null);
    }, () => {});
  }, [user?.id, venue.id]);

  const submit = async () => {
    if (!eligible) return;
    setSaving(true);
    await submitReview({
      venue,
      bookingId: eligible.bookingId,
      authorName: user?.name ?? t('Guest'),
      userId: user?.id ?? null,
      rating: stars,
      comment: comment.trim(),
    });
    setSaving(false);
    setComposing(false);
    setComment('');
    setStars(5);
    setEligible(null);
    load();
  };

  const { avg, count } = ratingWithLocal(venue, localReviews);
  const reviews = [...localReviews, ...venue.reviews];

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <BText variant="h2">{t('Reviews')}</BText>
        {eligible && !composing && (
          <Button title={t('Write a review')} size="sm" variant="secondary" onPress={() => setComposing(true)} />
        )}
      </View>
      <View style={{ marginTop: 16, gap: 6 }}>
        <RatingStars value={avg} size={28} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <BText variant="h3">{count > 0 ? avg.toFixed(1) : t('No reviews yet')}</BText>
          {count > 0 && (
            <BText variant="body" color={colors.accent}>
              ({count.toLocaleString()})
            </BText>
          )}
        </View>
      </View>

      {composing && (
        <View style={styles.reviewComposer}>
          <BText variant="smallMedium">{t('How was your visit?')}</BText>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Pressable key={i} onPress={() => setStars(i)} hitSlop={6}>
                <Ionicons name={stars >= i ? 'star' : 'star-outline'} size={30} color={colors.star} />
              </Pressable>
            ))}
          </View>
          <TextInput
            {...({ dir: 'auto' } as any)}
            placeholder={t('Share the details of your experience (optional)')}
            placeholderTextColor={colors.gray}
            value={comment}
            onChangeText={setComment}
            multiline
            style={styles.reviewInput}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
            <Button title={t('Submit review')} size="sm" loading={saving} onPress={submit} />
            <Button title={t('Cancel')} size="sm" variant="secondary" onPress={() => setComposing(false)} />
          </View>
        </View>
      )}

      {!user && (
        <Pressable style={styles.reviewHint} onPress={() => router.push('/auth')}>
          <Ionicons name="star-outline" size={16} color={colors.gray} />
          <BText variant="small" color={colors.gray}>
            {t('Booked here? Log in to leave a review.')}
          </BText>
        </Pressable>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 32, marginTop: 12 }}>
        {reviews.map((r) => (
          <View key={r.id} style={{ width: columns === 2 ? '47%' : '100%' }}>
            <ReviewCard review={r} />
          </View>
        ))}
      </View>
    </View>
  );
}

function directionsUrl(venue: Venue): string {
  if (venue.maps_url) return venue.maps_url;
  const q = encodeURIComponent(`${venue.name}, ${venue.address}, ${venue.area}, ${venue.city}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function AboutSection({ venue }: { venue: Venue }) {
  const { t } = useI18n();
  return (
    <View>
      <BText variant="h2">{t('About')}</BText>
      <BText variant="body" style={{ marginTop: 12 }}>
        {t(venue.description)}
      </BText>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
        <Ionicons name="location-outline" size={16} color={colors.gray} style={{ marginTop: 2 }} />
        <View style={{ flex: 1, gap: 4 }}>
          <BText variant="small">
            {t(venue.address)}, {t(venue.area)}, {t(venue.city)}, {t(venue.country)}
          </BText>
          <Pressable onPress={() => Linking.openURL(directionsUrl(venue))}>
            <BText variant="link">{t('Get directions')}</BText>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function HoursAndInfoSection({ venue, stacked }: { venue: Venue; stacked?: boolean }) {
  const { t } = useI18n();
  // Demo data uses weekday 0 = Sunday; show Monday first like Fresha
  const ordered = [1, 2, 3, 4, 5, 6, 0]
    .map((w) => venue.hours.find((h) => h.weekday === w))
    .filter(Boolean);

  return (
    <View style={{ flexDirection: stacked ? 'column' : 'row', gap: stacked ? 32 : 64 }}>
      <View style={{ flex: stacked ? undefined : 1 }}>
        <BText variant="h2">{t('Opening times')}</BText>
        <View style={{ marginTop: 16, gap: 10 }}>
          {ordered.map((h) => (
            <View key={h!.weekday} style={styles.hourRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View
                  style={[styles.dot, { backgroundColor: h!.is_closed ? colors.border : colors.green }]}
                />
                <BText variant="bodyMedium">{t(weekdayName(h!.weekday))}</BText>
              </View>
              <BText variant="body" color={h!.is_closed ? colors.gray : colors.ink}>
                {h!.is_closed ? t('Closed') : `${formatTime(h!.open_time!)} - ${formatTime(h!.close_time!)}`}
              </BText>
            </View>
          ))}
        </View>
      </View>
      <View style={{ flex: stacked ? undefined : 1 }}>
        <BText variant="h2">{t('Additional information')}</BText>
        <View style={{ marginTop: 16, gap: 14 }}>
          {venue.highlights.map((h) => (
            <View key={h} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={(HIGHLIGHT_ICONS[h] ?? 'checkmark-circle-outline') as any} size={18} color={colors.ink} />
              <BText variant="body">{t(h)}</BText>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function NearbySection({ venue }: { venue: Venue }) {
  const { t } = useI18n();
  const { venues } = useAppData();
  const nearby = venues.filter((v) => v.id !== venue.id && v.city === venue.city).slice(0, 8);
  if (!nearby.length) return null;
  return <SectionRail title={t('Salons nearby')} venues={nearby} cardWidth={256} />;
}

// ---------------------------------------------------------------------------
// Full-gallery viewer
// ---------------------------------------------------------------------------
function GalleryViewer({ venue, open, onClose }: { venue: Venue; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.white }}>
        <View style={galleryStyles.top}>
          <BText variant="h2">
            {t('{name} - photos ({n})', { name: venue.name, n: venue.images.length })}
          </BText>
          <Pressable onPress={onClose} hitSlop={10} style={galleryStyles.close}>
            <Ionicons name="close" size={22} color={colors.ink} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 14, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
          {venue.images.map((im) => (
            <Image accessibilityLabel={t(venue.name)} alt={t(venue.name)}
              key={im.url + im.sort_order}
              source={{ uri: sized(im.url, 640) }}
              style={{ width: '100%', aspectRatio: 1.5, borderRadius: radius.lg, backgroundColor: colors.bgSubtle }}
              contentFit="cover"
              transition={200}
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const galleryStyles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// ---------------------------------------------------------------------------
// Desktop
// ---------------------------------------------------------------------------
function VenueDesktop({ venue }: { venue: Venue }) {
  const router = useRouter();
  const { t } = useI18n();
  const { startBooking } = useBooking();
  const { categoryOf } = useAppData();
  const category = categoryOf(venue);
  const [galleryOpen, setGalleryOpen] = useState(false);

  const book = () => {
    startBooking(venue);
    router.push(`/booking/${venue.slug}`);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.white }}>
      <WebHeader showSearch />
      <View style={styles.desktopContent}>
        {/* Breadcrumb */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 20, flexWrap: 'wrap' }}>
          {[
            { label: t('Home'), to: '/' },
            { label: category ? t(category.name) : t('Venues'), to: category ? `/search?category=${category.slug}` : '/search' },
            { label: t(venue.city), to: `/search?q=${encodeURIComponent(venue.city)}` },
            { label: t(venue.name), to: null as string | null },
          ].map((c, i, a) => (
            <React.Fragment key={c.label + i}>
              {c.to ? (
                <Pressable onPress={() => router.push(c.to as any)}>
                  {({ hovered }: any) => (
                    <BText variant="small" color={colors.gray} style={hovered ? { textDecorationLine: 'underline' } : undefined}>
                      {c.label}
                    </BText>
                  )}
                </Pressable>
              ) : (
                <BText variant="small" color={colors.ink}>
                  {c.label}
                </BText>
              )}
              {i < a.length - 1 && (
                <BText variant="small" color={colors.gray}>
                  ·
                </BText>
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 12 }}>
          <View style={{ gap: 8, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <BText style={{ fontFamily: font.extrabold, fontSize: 40, lineHeight: 48, color: colors.ink }}>
                {t(venue.name)}
              </BText>
              {venue.provider_type === 'freelancer' && (
                <View style={{ backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 12, height: 26, alignItems: 'center', justifyContent: 'center' }}>
                  <BText style={{ fontFamily: font.semibold, fontSize: 12, color: colors.accent }}>{t('Freelancer')}</BText>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Rating value={venue.rating_avg} count={venue.rating_count} size={15} />
              <BText variant="body" color={colors.green} style={{ fontFamily: font.semibold }}>
                {t('Open')}
              </BText>
              <BText variant="body" color={colors.gray}>
                {t('until {time}', { time: t('10:00 PM') })}
              </BText>
              <BText variant="body" color={colors.gray}>
                · {t(venue.area)}, {t(venue.city)}
              </BText>
              <BText variant="link" onPress={() => Linking.openURL(directionsUrl(venue))}>
                {t('Get directions')}
              </BText>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <RoundIcon name="share-outline" />
            <FavButton venueId={venue.id} />
          </View>
        </View>

        {/* Gallery: 1 large + 2 stacked */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 24, position: 'relative' }}>
          <Image accessibilityLabel={t(venue.name)} alt={t(venue.name)}
            source={{ uri: sized(venue.images[0]?.url, 1080) }}
            style={{ flex: 2, aspectRatio: 1.55, borderRadius: radius.lg, backgroundColor: colors.bgSubtle }}
            contentFit="cover"
            transition={200}
          />
          <View style={{ flex: 1, gap: 8 }}>
            {venue.images.slice(1, 3).map((im) => (
              <Image accessibilityLabel={t(venue.name)} alt={t(venue.name)}
                key={im.url + im.sort_order}
                source={{ uri: sized(im.url, 640) }}
                style={{ flex: 1, borderRadius: radius.lg, backgroundColor: colors.bgSubtle }}
                contentFit="cover"
                transition={200}
              />
            ))}
          </View>
          <Pressable onPress={() => setGalleryOpen(true)} style={styles.seeAllPhotos}>
            <Ionicons name="images-outline" size={14} color={colors.ink} />
            <BText variant="smallMedium">{t('See all photos')}</BText>
          </Pressable>
        </View>
        <GalleryViewer venue={venue} open={galleryOpen} onClose={() => setGalleryOpen(false)} />

        {/* Main columns */}
        <View style={{ flexDirection: 'row', gap: 40, marginTop: 40 }}>
          <View style={{ flex: 1, gap: 56 }}>
            <ServicesSection venue={venue} />
            <TeamSection venue={venue} />
            <ReviewsSection venue={venue} />
            <AboutSection venue={venue} />
            <HoursAndInfoSection venue={venue} />
          </View>

          {/* Sticky booking card */}
          <View style={{ width: 360 }}>
            <View style={[styles.bookCard, shadow.card]}>
              <Button title={t('Book now')} size="lg" fullWidth onPress={book} />
              <View style={{ marginTop: 10 }}>
                <Button
                  title={t('Message salon')}
                  variant="secondary"
                  fullWidth
                  onPress={() => router.push(`/messages?venue=${venue.slug}`)}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <Ionicons name="time-outline" size={18} color={colors.ink} />
                <BText variant="small">
                  <BText variant="smallMedium" color={colors.green}>
                    {t('Open')}
                  </BText>{' '}
                  {t('until {time}', { time: t('10:00 PM') })}
                </BText>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <Ionicons name="location-outline" size={18} color={colors.ink} />
                <View style={{ flex: 1 }}>
                  <BText variant="small" color={colors.ink}>
                    {venue.address}, {t(venue.area)}, {t(venue.city)}
                  </BText>
                  <BText variant="link" style={{ marginTop: 4 }} onPress={() => Linking.openURL(directionsUrl(venue))}>
                    {t('Get directions')}
                  </BText>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <NearbySection venue={venue} />
        </View>
      </View>
      <WebFooter />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Mobile
// ---------------------------------------------------------------------------
function VenueMobile({ venue }: { venue: Venue }) {
  const router = useRouter();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { startBooking } = useBooking();
  const [galleryOpen, setGalleryOpen] = useState(false);

  const book = () => {
    startBooking(venue);
    router.push(`/booking/${venue.slug}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View>
          <Image accessibilityLabel={t(venue.name)} alt={t(venue.name)}
            source={{ uri: sized(venue.images[0]?.url, 1080) }}
            style={{ width: '100%', aspectRatio: 1.3, backgroundColor: colors.bgSubtle }}
            contentFit="cover"
            transition={200}
          />
          <Pressable
            onPress={() => router.back()}
            style={[styles.floatingBtn, { top: insets.top + 8, left: 16 }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </Pressable>
          <View style={[styles.floatingRow, { top: insets.top + 8, right: 16 }]}>
            <View style={styles.floatingBtn2}>
              <Ionicons name="share-outline" size={18} color={colors.ink} />
            </View>
            <FavButton venueId={venue.id} floating />
          </View>
          <Pressable onPress={() => setGalleryOpen(true)} style={[styles.seeAllPhotos, { bottom: 12, right: 16, top: undefined }]}>
            <Ionicons name="images-outline" size={14} color={colors.ink} />
            <BText variant="smallMedium">{venue.images.length}</BText>
          </Pressable>
        </View>
        <GalleryViewer venue={venue} open={galleryOpen} onClose={() => setGalleryOpen(false)} />

        <View style={{ padding: 20, gap: 8 }}>
          <BText variant="h1">{t(venue.name)}</BText>
          <Rating value={venue.rating_avg} count={venue.rating_count} size={15} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <BText variant="small" color={colors.green} style={{ fontFamily: font.semibold }}>
              {t('Open')}
            </BText>
            <BText variant="small">{t('until {time}', { time: t('10:00 PM') })}</BText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="location-outline" size={14} color={colors.gray} />
            <BText variant="small">
              {t(venue.area)}, {t(venue.city)}
            </BText>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, gap: 44 }}>
          <AboutSection venue={venue} />
          <ServicesSection venue={venue} />
          <TeamSection venue={venue} />
          <ReviewsSection venue={venue} columns={1} />
          <HoursAndInfoSection venue={venue} stacked />
          <NearbySection venue={venue} />
        </View>
      </ScrollView>

      {/* Sticky book bar */}
      <View style={[styles.stickyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={{ flex: 1 }}>
          <BText variant="smallMedium">{t('{n} services available', { n: venue.services.length })}</BText>
          <Rating value={venue.rating_avg} count={venue.rating_count} size={12} />
        </View>
        <Pressable onPress={() => router.push(`/messages?venue=${venue.slug}`)} style={styles.msgBtn} hitSlop={6}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.ink} />
        </Pressable>
        <Button title={t('Book now')} size="lg" onPress={book} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
function RoundIcon({ name }: { name: any }) {
  return (
    <View style={styles.roundIcon}>
      <Ionicons name={name} size={18} color={colors.ink} />
    </View>
  );
}

function FavButton({ venueId, floating }: { venueId: string; floating?: boolean }) {
  const { favorites, toggleFav } = useAppData();
  const isFav = favorites.includes(venueId);
  return (
    <Pressable onPress={() => toggleFav(venueId)} style={floating ? styles.floatingBtn2 : styles.roundIcon}>
      <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={18} color={isFav ? colors.pink : colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  reviewComposer: {
    marginTop: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.lg,
    backgroundColor: colors.bgPage,
  },
  reviewInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    minHeight: 72,
    padding: 12,
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.white,
    textAlignVertical: 'top',
    ...(typeof window !== 'undefined' ? ({ outlineStyle: 'none' } as any) : null),
  },
  reviewHint: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  desktopContent: {
    width: '100%',
    maxWidth: maxContentWidth + 48,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  roundIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  bookCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: 24,
    position: 'sticky' as any,
    top: 24,
  },
  hourRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  floatingBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  floatingRow: { position: 'absolute', flexDirection: 'row', gap: 8 },
  floatingBtn2: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  msgBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seeAllPhotos: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    height: 34,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  stickyBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
