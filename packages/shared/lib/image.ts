import { PixelRatio } from 'react-native';

// All venue imagery is served from Unsplash with a `?w=` width parameter that
// was baked in at 1200px - far larger than the thumbnails and cards that show
// it. This rewrites the requested width to the actual display size (times the
// device pixel ratio, capped) so a 280px card fetches a ~560px image instead
// of a 1200px one, cutting the bytes roughly 4×.
export function sized(url: string | undefined | null, displayWidth: number): string | undefined {
  if (!url) return url ?? undefined;
  if (!url.includes('images.unsplash.com')) return url;
  const dpr = Math.min(2, Math.max(1, Math.round(PixelRatio.get())));
  const target = Math.min(1600, Math.round(displayWidth * dpr));
  try {
    const u = new URL(url);
    u.searchParams.set('w', String(target));
    if (!u.searchParams.has('q')) u.searchParams.set('q', '75');
    u.searchParams.set('auto', 'format');
    u.searchParams.set('fit', 'crop');
    return u.toString();
  } catch {
    // Fallback for environments without URL: swap an existing w= param.
    return /[?&]w=\d+/.test(url) ? url.replace(/([?&]w=)\d+/, `$1${target}`) : url;
  }
}
