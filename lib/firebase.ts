import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, inMemoryPersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

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

let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, { persistence: inMemoryPersistence });
} catch {
  auth = getAuth(app);
}

export { auth };
export const db = getDatabase(app);
export default app;
