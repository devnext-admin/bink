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

// Where the customer-facing app lives, and whether this bundle IS the admin
// console. Shared components (the web header, the notifications bell) link to
// routes like /search and /auth that exist only in the public app, so inside
// the admin console those links have to leave the origin rather than route
// in-app and land on a 404.
export const PUBLIC_APP_URL = process.env.EXPO_PUBLIC_APP_URL ?? '';
export const isAdminApp = process.env.EXPO_PUBLIC_IS_ADMIN === '1';

/**
 * Navigate to a public-app route. In the public app this is a normal in-app
 * push; in the admin console it opens the public site instead.
 * Returns true when it handled the navigation externally.
 */
export function openPublicRoute(href: string): boolean {
  if (!isAdminApp) return false;
  const base = PUBLIC_APP_URL.replace(/\/$/, '');
  if (!base) return true; // nowhere to send them: swallow rather than 404
  if (Platform.OS === 'web') window.location.assign(base + href);
  else Linking.openURL(base + href).catch(() => {});
  return true;
}
