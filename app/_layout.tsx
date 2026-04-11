import React, { useEffect, Component } from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { registerForPushNotifications } from '@/lib/notifications';

SplashScreen.preventAutoHideAsync();

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null };
  componentDidCatch(e: Error) {
    this.setState({ error: e.message + '\n' + e.stack?.slice(0, 400) });
    SplashScreen.hideAsync();
  }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 60 }}>
          <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
            CRASH LOG:
          </Text>
          <Text style={{ color: '#333', fontSize: 12 }}>{this.state.error}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

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
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

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
