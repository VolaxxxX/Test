import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Colors } from '@/constants/Colors';

export default function Index() {
  const { firebaseUser, userProfile, loading } = useAuth();
  const router = useRouter();
  const rootNavState = useRootNavigationState();

  useEffect(() => {
    if (!rootNavState?.key) return; // Wait for navigation to be ready
    if (loading) return;
    if (!firebaseUser) {
      router.replace('/(auth)/login');
    } else if (!userProfile?.partnerId) {
      router.replace('/(auth)/pair');
    } else {
      router.replace('/(tabs)');
    }
  }, [rootNavState?.key, loading, firebaseUser, userProfile]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
