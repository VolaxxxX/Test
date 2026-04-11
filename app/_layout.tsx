import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { registerForPushNotifications } from '@/lib/notifications';

function NotificationRegistrar() {
  const { firebaseUser } = useAuth();
  useEffect(() => {
    if (firebaseUser) {
      registerForPushNotifications(firebaseUser.uid);
    }
  }, [firebaseUser?.uid]);
  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NotificationRegistrar />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
