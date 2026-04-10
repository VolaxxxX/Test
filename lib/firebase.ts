import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// 🔥 Replace these with your own Firebase project config
// Go to: https://console.firebase.google.com → New project → Add app (Web) → copy config
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
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
