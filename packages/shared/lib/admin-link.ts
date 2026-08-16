import { Linking, Platform } from 'react-native';

// The admin console is a separate app on its own origin, so its code never
// ships inside the public bundle. Anything in the public app that used to
// navigate to the /admin route opens that origin instead.
//
// Set EXPO_PUBLIC_ADMIN_URL for the environment (for example
// https://admin.bink.sa). When it is unset the entry points stay hidden
// rather than dead-ending, which is the right default for local demo runs.
export const ADMIN_URL = process.env.EXPO_PUBLIC_ADMIN_URL ?? '';

export const hasAdminConsole = ADMIN_URL.length > 0;

export function openAdminConsole(): void {
  if (!ADMIN_URL) return;
  if (Platform.OS === 'web') {
    window.location.assign(ADMIN_URL);
  } else {
    Linking.openURL(ADMIN_URL).catch(() => {});
  }
}
