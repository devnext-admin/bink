import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppDataProvider } from '../lib/app-data-context';
import { AuthProvider } from '../lib/auth-context';
import { BookingProvider } from '../lib/booking-context';
import { I18nProvider } from '../lib/i18n';
import { colors } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Registering Ionicons here (from our own assets) keeps the icon font off
    // the node_modules asset path, which the Vercel CLI strips from uploads.
    // Poppins is the Bink brand typeface (same files as the original app).
    Ionicons: require('../../assets/fonts/Ionicons.ttf'),
    Poppins_400Regular: require('../../assets/fonts/Poppins-Regular.ttf'),
    Poppins_500Medium: require('../../assets/fonts/Poppins-Medium.ttf'),
    Poppins_600SemiBold: require('../../assets/fonts/Poppins-SemiBold.ttf'),
    Poppins_700Bold: require('../../assets/fonts/Poppins-Bold.ttf'),
    Poppins_800ExtraBold: require('../../assets/fonts/Poppins-ExtraBold.ttf'),
    // Poppins has no Arabic glyphs — Tajawal carries the brand in Arabic
    Tajawal_400Regular: require('../../assets/fonts/Tajawal-Regular.ttf'),
    Tajawal_500Medium: require('../../assets/fonts/Tajawal-Medium.ttf'),
    Tajawal_700Bold: require('../../assets/fonts/Tajawal-Bold.ttf'),
    Tajawal_800ExtraBold: require('../../assets/fonts/Tajawal-ExtraBold.ttf'),
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
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="search" />
                <Stack.Screen name="appointments" />
                <Stack.Screen name="invoices" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="messages" />
                <Stack.Screen name="favorites" />
                <Stack.Screen name="support" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="profile" />
                <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
                <Stack.Screen name="venue/[slug]" />
                <Stack.Screen name="booking/[slug]" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="business/index" />
                <Stack.Screen name="business/dashboard" />
                <Stack.Screen name="admin" />
              </Stack>
            </BookingProvider>
          </AppDataProvider>
        </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
