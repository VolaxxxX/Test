import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyC3cBhhX0DeidYOI8excl8x1IlXxF4-j7g',
  authDomain: 'pooptracker-16a25.firebaseapp.com',
  databaseURL: 'https://pooptracker-16a25-default-rtdb.firebaseio.com',
  projectId: 'pooptracker-16a25',
  storageBucket: 'pooptracker-16a25.firebasestorage.app',
  messagingSenderId: '636688170883',
  appId: '1:636688170883:web:14d7684ac377ffccd940b6',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// initializeAuth must only be called once; catch the error on hot reload
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { auth };
export const db = getDatabase(app);
export default app;
