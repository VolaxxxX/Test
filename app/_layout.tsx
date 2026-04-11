import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Test if Firebase import itself crashes
import { initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: 'AIzaSyC3cBhhX0DeidYOI8excl8x1IlXxF4-j7g',
  authDomain: 'pooptracker-16a25.firebaseapp.com',
  databaseURL: 'https://pooptracker-16a25-default-rtdb.firebaseio.com',
  projectId: 'pooptracker-16a25',
  storageBucket: 'pooptracker-16a25.firebasestorage.app',
  messagingSenderId: '636688170883',
  appId: '1:636688170883:web:14d7684ac377ffccd940b6',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
