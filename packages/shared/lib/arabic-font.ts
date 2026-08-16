import * as Font from 'expo-font';

// Tajawal (the Arabic brand face, 4 weights ≈ 300 KB) is only rendered when
// the UI language is Arabic, so it is loaded on demand instead of up-front.
let started = false;

export async function loadArabicFont(): Promise<void> {
  if (started) return;
  started = true;
  try {
    await Font.loadAsync({
      Tajawal_400Regular: require('../../assets/fonts/Tajawal-Regular.ttf'),
      Tajawal_500Medium: require('../../assets/fonts/Tajawal-Medium.ttf'),
      Tajawal_700Bold: require('../../assets/fonts/Tajawal-Bold.ttf'),
      Tajawal_800ExtraBold: require('../../assets/fonts/Tajawal-ExtraBold.ttf'),
    });
  } catch {
    started = false; // allow a retry if it failed
  }
}
