import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyC3cBhhX0DeidYOI8excl8x1IlXxF4-j7g',
  authDomain: 'pooptracker-16a25.firebaseapp.com',
  databaseURL: 'https://pooptracker-16a25-default-rtdb.firebaseio.com',
  projectId: 'pooptracker-16a25',
  storageBucket: 'pooptracker-16a25.firebasestorage.app',
  messagingSenderId: '636688170883',
  appId: '1:636688170883:web:14d7684ac377ffccd940b6',
};

const fbApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(fbApp);

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
