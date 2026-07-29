import type { Venue } from './types';

/**
 * Picks the venues for the three home rails. Seed flags (is_featured /
 * is_new / is_trending) come first, then each rail fills up with real
 * signals - rating, recency, review volume - so newly approved listings
 * surface on the home page without any manual flagging.
 */
export function homeRails(venues: Venue[], per = 8) {
  const used = new Set<string>();
  const take = (primary: Venue[], fill: Venue[]) => {
    const out: Venue[] = [];
    for (const v of [...primary, ...fill]) {
      if (out.length >= per) break;
      if (out.some((x) => x.id === v.id)) continue;
      if (!primary.some((p) => p.id === v.id) && used.has(v.id)) continue;
      out.push(v);
    }
    out.forEach((v) => used.add(v.id));
    return out;
  };

  const byNewest = [...venues].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  const byRating = [...venues].sort((a, b) => b.rating_avg - a.rating_avg);
  const byVolume = [...venues].sort((a, b) => b.rating_count - a.rating_count);

  // "New to Bink" first so genuinely new listings aren't swallowed by the
  // Recommended fill; the newest venues lead, seed "New" flags pad the tail.
  const fresh = take(byNewest.filter((v) => v.is_new || isRecent(v)), byNewest);
  const featured = take(venues.filter((v) => v.is_featured), byRating);
  const trending = take(venues.filter((v) => v.is_trending), byVolume);
  return { featured, fresh, trending };
}

function isRecent(v: Venue): boolean {
  if (!v.created_at) return false;
  return Date.now() - new Date(v.created_at).getTime() < 30 * 24 * 3600 * 1000;
}
