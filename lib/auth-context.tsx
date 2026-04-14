import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
// TYPE-ONLY import — erased at compile time, zero runtime cost, cannot crash.
import type { User as FirebaseUser } from 'firebase/auth';
import app from './firebase';
import { createUser, getUser, updateUser } from './database';
import type { User } from './database';
import type { Language } from './i18n';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  authError: string | null;
  signUp: (email: string, password: string, displayName: string, emoji: string, poopEmoji: string, language: Language) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateLanguage: (lang: Language) => Promise<void>;
  updatePoopEmoji: (poopEmoji: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function generateCoupleCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // These refs hold the lazily-loaded firebase/auth instance + functions.
  // Using refs avoids re-renders and keeps the values available to all methods.
  const authRef = useRef<any>(null);
  const fbRef = useRef<any>(null); // { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged }

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    try {
      // ─── Lazy require ───────────────────────────────────────────────────────
      // require() is wrapped in try/catch so any module-level crash in
      // @firebase/auth is caught here instead of killing the entire JS bundle.
      const firebaseAuth = require('@firebase/auth');
      fbRef.current = firebaseAuth;

      // Try inMemoryPersistence first (no AsyncStorage needed).
      // If auth was already initialized (hot-reload / fast-refresh), catch
      // the "already-initialized" error and fetch the existing instance.
      let auth: any;
      try {
        auth = firebaseAuth.initializeAuth(app, {
          persistence: firebaseAuth.inMemoryPersistence,
        });
      } catch {
        auth = firebaseAuth.getAuth(app);
      }

      if (!auth) throw new Error('Firebase auth instance is null');
      authRef.current = auth;

      unsubscribe = firebaseAuth.onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
        setFirebaseUser(user);
        if (user) {
          try {
            const profile = await getUser(user.uid);
            setUserProfile(profile);
          } catch {
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }
        setLoading(false);
      });
    } catch (e: any) {
      // Auth failed to initialise — log it and unblock navigation so the
      // user can at least see the login screen (they'll get an error on submit).
      console.error('[AuthProvider] firebase/auth init error:', e?.message ?? e);
      setAuthError(e?.message ?? 'auth-init-failed');
      setLoading(false);
    }

    return () => { unsubscribe?.(); };
  }, []);

  // ── Auth actions (all guarded against missing auth instance) ─────────────

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    emoji: string,
    poopEmoji: string,
    language: Language,
  ) => {
    if (!authRef.current || !fbRef.current) throw new Error('Auth not ready');
    const { user } = await fbRef.current.createUserWithEmailAndPassword(authRef.current, email, password);
    const profile: Omit<User, 'uid'> = {
      displayName,
      emoji,
      poopEmoji,
      coupleCode: generateCoupleCode(),
      language,
    };
    await createUser(user.uid, profile);
    setUserProfile({ uid: user.uid, ...profile });
  };

  const signIn = async (email: string, password: string) => {
    if (!authRef.current || !fbRef.current) throw new Error('Auth not ready');
    const { user } = await fbRef.current.signInWithEmailAndPassword(authRef.current, email, password);
    const profile = await getUser(user.uid);
    setUserProfile(profile);
  };

  const signOut = async () => {
    if (!authRef.current || !fbRef.current) return;
    await fbRef.current.signOut(authRef.current);
    setUserProfile(null);
  };

  const refreshProfile = async () => {
    if (firebaseUser) {
      const profile = await getUser(firebaseUser.uid);
      setUserProfile(profile);
    }
  };

  const updateLanguage = async (lang: Language) => {
    if (!firebaseUser || !userProfile) return;
    await updateUser(firebaseUser.uid, { language: lang });
    setUserProfile({ ...userProfile, language: lang });
  };

  const updatePoopEmoji = async (poopEmoji: string) => {
    if (!firebaseUser || !userProfile) return;
    await updateUser(firebaseUser.uid, { poopEmoji });
    setUserProfile({ ...userProfile, poopEmoji });
  };

  return (
    <AuthContext.Provider value={{
      firebaseUser, userProfile, loading, authError,
      signUp, signIn, signOut, refreshProfile,
      updateLanguage, updatePoopEmoji,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Re-export types so callers don't need extra imports
export type { FirebaseUser };
export type { User } from './database';
