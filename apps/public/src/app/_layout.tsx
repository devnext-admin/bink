import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppDataProvider } from '@bink/shared/lib/app-data-context';
import { AuthProvider } from '@bink/shared/lib/auth-context';
import { BookingProvider } from '../lib/booking-context';
import { EmulationBanner } from '../components/emulation-banner';
import { I18nProvider } from '@bink/shared/lib/i18n';
import { colors } from '@bink/shared/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// iOS tab apps never animate tab switches; the web slide stays for continuity.
const tabScreen = Platform.OS === 'web' ? undefined : ({ animation: 'none' } as const);

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Registering Ionicons here (from our own assets) keeps the icon font off
    // the node_modules asset path, which the Vercel CLI strips from uploads.
    // Poppins is the Bink brand typeface (same files as the original app).
    Ionicons: require('@bink/shared/assets/fonts/Ionicons.ttf'),
    Poppins_400Regular: require('@bink/shared/assets/fonts/Poppins-Regular.ttf'),
    Poppins_500Medium: require('@bink/shared/assets/fonts/Poppins-Medium.ttf'),
    Poppins_600SemiBold: require('@bink/shared/assets/fonts/Poppins-SemiBold.ttf'),
    Poppins_700Bold: require('@bink/shared/assets/fonts/Poppins-Bold.ttf'),
    Poppins_800ExtraBold: require('@bink/shared/assets/fonts/Poppins-ExtraBold.ttf'),
    // Poppins has no Arabic glyphs - Tajawal carries the brand in Arabic, but
    // it is loaded on demand (see lib/arabic-font) so English users don't pay
    // ~300 KB of fonts they never render.
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nProvider>
        <AuthProvider>
          <AppDataProvider>
            <BookingProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.white },
                  // Native gets the platform's own push (parallax + swipe back);
                  // the web build keeps an explicit slide so it matches iOS.
                  animation: Platform.OS === 'web' ? 'slide_from_right' : 'default',
                  // Bottom-tab taps use router.replace; without this, native-stack
                  // animates a replace as a "pop" (screen slides in from the left).
                  animationTypeForReplace: 'push',
                }}
              >
                {/* Tab-bar destinations switch instantly on native, like any iOS tab app */}
                <Stack.Screen name="index" options={tabScreen} />
                <Stack.Screen name="search" />
                <Stack.Screen name="appointments" options={tabScreen} />
                <Stack.Screen name="invoices" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="messages" options={tabScreen} />
                <Stack.Screen name="favorites" />
                <Stack.Screen name="support" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="profile" options={tabScreen} />
                <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
                <Stack.Screen name="reset-password" />
                <Stack.Screen name="welcome" />
                <Stack.Screen name="terms" />
                <Stack.Screen name="privacy" />
                <Stack.Screen name="venue/[slug]" />
                <Stack.Screen name="booking/[slug]" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="business/index" />
                <Stack.Screen name="business/dashboard" />
              </Stack>
              <EmulationBanner />
            </BookingProvider>
          </AppDataProvider>
        </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
