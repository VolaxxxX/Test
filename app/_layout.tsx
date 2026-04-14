import React, { Component, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { registerForPushNotifications } from '@/lib/notifications';

// ── Error boundary ─────────────────────────────────────────────────────────
// Catches any render/lifecycle error in the tree and shows a readable message
// instead of a silent white screen (even in production / OTA mode).
class ErrorBoundary extends Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={eb.container}>
          <Text style={eb.title}>Something went wrong</Text>
          <Text style={eb.msg}>{String(this.state.error)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: '700', color: '#c00', marginBottom: 12 },
  msg: { fontSize: 13, color: '#333', textAlign: 'center' },
});

// ── Notification hook ──────────────────────────────────────────────────────
function NotificationRegistrar() {
  const { firebaseUser } = useAuth();
  useEffect(() => {
    if (firebaseUser) {
      registerForPushNotifications(firebaseUser.uid);
    }
  }, [firebaseUser?.uid]);
  return null;
}

// ── Root layout ────────────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
