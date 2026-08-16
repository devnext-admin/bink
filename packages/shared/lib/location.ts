import { Platform } from 'react-native';

export interface GeoPoint {
  lat: number;
  lng: number;
  /** Human-readable area, e.g. "Al Olaya, Riyadh" (native only). */
  label?: string;
}

/**
 * Ask for the device position (prompting for permission if needed).
 * Returns null when denied or unavailable - callers show a fallback label.
 */
export async function getCurrentLocation(): Promise<GeoPoint | null> {
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 8000, maximumAge: 600000 }
      );
    });
  }
  try {
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    let label: string | undefined;
    try {
      const places = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const p = places[0];
      if (p) label = [p.district ?? p.subregion, p.city].filter(Boolean).join(', ') || undefined;
    } catch {}
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, label };
  } catch {
    return null;
  }
}

/**
 * Position only if permission was already granted - never prompts.
 * Used by the search screen so distances appear without a surprise dialog.
 */
export async function getLocationIfGranted(): Promise<GeoPoint | null> {
  if (Platform.OS === 'web') return getCurrentLocation();
  try {
    const Location = await import('expo-location');
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    return getCurrentLocation();
  } catch {
    return null;
  }
}
