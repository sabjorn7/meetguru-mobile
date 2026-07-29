import {
  Raleway_400Regular,
  Raleway_500Medium,
  Raleway_600SemiBold,
  Raleway_700Bold,
  Raleway_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/raleway';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '@/features/auth/AuthContext';
import { usePushNotifications } from '@/features/notifications/usePushNotifications';
import { DownloadsProvider } from '@/features/offline/DownloadsContext';
import { colors, fonts } from '@/theme';

function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  usePushNotifications();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: colors.card },
        headerShadowVisible: false,
        headerTintColor: colors.primary,
        headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="course/[slug]" options={{ headerShown: true, title: 'Курс' }} />
      <Stack.Screen name="article/[slug]" options={{ headerShown: true, title: 'Статья' }} />
      <Stack.Screen name="user/[id]" options={{ headerShown: true, title: 'Профиль' }} />
      <Stack.Screen name="downloads" options={{ headerShown: true, title: 'Загрузки' }} />
      <Stack.Screen name="finance" options={{ headerShown: true, title: 'Финансы' }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'Диалог' }} />
      <Stack.Screen
        name="chat/new"
        options={{ headerShown: true, title: 'Новый чат', presentation: 'modal' }}
      />
      <Stack.Screen name="chat/members" options={{ headerShown: true, title: 'Участники' }} />
      <Stack.Screen
        name="profile/edit"
        options={{ headerShown: true, title: 'Редактирование', presentation: 'modal' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Raleway_400Regular,
    Raleway_500Medium,
    Raleway_600SemiBold,
    Raleway_700Bold,
    Raleway_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <DownloadsProvider>
            <AuthGate />
            <StatusBar style="auto" />
          </DownloadsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
