import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppDataProvider } from '@bink/shared/lib/app-data-context';
import { AuthProvider } from '@bink/shared/lib/auth-context';
import { I18nProvider } from '@bink/shared/lib/i18n';
import { colors } from '@bink/shared/lib/theme';

// The admin console is web only and never renders a splash screen, so this
// layout is deliberately thinner than the public app's: no booking context, no
// emulation banner, no native stack animations.
export default function AdminRootLayout() {
  const [fontsLoaded] = useFonts({
    Ionicons: require('@bink/shared/assets/fonts/Ionicons.ttf'),
    Poppins_400Regular: require('@bink/shared/assets/fonts/Poppins-Regular.ttf'),
    Poppins_500Medium: require('@bink/shared/assets/fonts/Poppins-Medium.ttf'),
    Poppins_600SemiBold: require('@bink/shared/assets/fonts/Poppins-SemiBold.ttf'),
    Poppins_700Bold: require('@bink/shared/assets/fonts/Poppins-Bold.ttf'),
    Poppins_800ExtraBold: require('@bink/shared/assets/fonts/Poppins-ExtraBold.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <I18nProvider>
          <AuthProvider>
            <AppDataProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.white },
                }}
              >
                <Stack.Screen name="index" />
              </Stack>
            </AppDataProvider>
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
