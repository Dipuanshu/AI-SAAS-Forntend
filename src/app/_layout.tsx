import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ToastHost } from '../components/ui';
import { AuthProvider, useAuth } from '../lib/auth';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Gate() {
  const { status, role } = useAuth();
  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [status]);
  if (status === 'loading') return null;

  const signedIn = status === 'in';
  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && role !== 'super_admin'}>
          <Stack.Screen name="(company)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && role === 'super_admin'}>
          <Stack.Screen name="(admin)" />
        </Stack.Protected>
      </Stack>
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
