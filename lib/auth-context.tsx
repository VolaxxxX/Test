import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
// TYPE-ONLY — erased at compile time, zero runtime impact.
import type { User as FirebaseUser } from 'firebase/auth';
import app from './firebase';
import { createUser, getUser, updateUser, subscribeToProfile } from './database';
import type { User } from './database';
import type { Language } from './i18n';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  /** Non-null if firebase/auth failed to initialise entirely. */
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

  // Lazily-loaded firebase/auth module + auth instance.
  const authRef = useRef<any>(null);
  const fbRef = useRef<any>(null);

  useEffect(() => {
    let authUnsub: (() => void) | null = null;
    let profileUnsub: (() => void) | null = null;

    try {
      // ── Lazy require ────────────────────────────────────────────────────────
      // Wrapped in try/catch: if @firebase/auth throws during module evaluation
      // we catch it here instead of crashing the entire JS bundle.
      const fa = require('@firebase/auth');
      fbRef.current = fa;

      // The browser-cjs bundle (loaded via Metro resolver) does NOT call
      // registerAuth() automatically — unlike dist/rn/index.js which calls
      // registerAuth("ReactNative") at line 145. Without this call,
      // initializeAuth throws "Component auth has not been registered yet".
      try { fa.registerAuth('ReactNative'); } catch { /* already registered */ }

      let auth: any;
      try {
        auth = fa.initializeAuth(app, { persistence: fa.inMemoryPersistence });
      } catch {
        // Auth already initialised for this app instance (fast-refresh).
        auth = fa.getAuth(app);
      }
      if (!auth) throw new Error('firebase/auth returned null');
      authRef.current = auth;

      authUnsub = fa.onAuthStateChanged(auth, (user: FirebaseUser | null) => {
        // Cancel the previous user's profile subscription.
        profileUnsub?.();
        profileUnsub = null;

        setFirebaseUser(user);

        if (user) {
          // ── Real-time profile listener ───────────────────────────────────
          // onValue fires immediately with the current DB value, then again
          // whenever the record changes (e.g. partner pairs with this user).
          let firstFire = true;
          profileUnsub = subscribeToProfile(
            user.uid,
            (profile) => {
              setUserProfile(profile);
              if (firstFire) { firstFire = false; setLoading(false); }
            },
            (_err) => {
              // RTDB permission error — still unblock the app.
              if (firstFire) { firstFire = false; setLoading(false); }
            },
          );
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      });
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error('[AuthProvider] firebase/auth init error:', msg);
      setAuthError(msg);
      setLoading(false);
    }

    return () => {
      authUnsub?.();
      profileUnsub?.();
    };
  }, []);

  // ── Auth actions ───────────────────────────────────────────────────────────

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    emoji: string,
    poopEmoji: string,
    language: Language,
  ) => {
    if (!authRef.current || !fbRef.current) {
      const err = new Error('Auth not ready') as any;
      err.code = 'auth/not-ready';
      throw err;
    }

    // 1. Create Firebase Auth user (may throw auth/* errors).
    const { user } = await fbRef.current.createUserWithEmailAndPassword(
      authRef.current, email, password,
    );

    // 2. Write user profile to Realtime DB.
    //    If this fails (e.g. RTDB rules), delete the orphan auth account
    //    so the user can try again cleanly.
    const profile: Omit<User, 'uid'> = {
      displayName,
      emoji,
      poopEmoji,
      coupleCode: generateCoupleCode(),
      language,
    };
    try {
      await createUser(user.uid, profile);
    } catch (dbErr: any) {
      // Roll back auth so the user is not stuck with an account they can't use.
      try { await user.delete(); } catch {}
      const e = new Error(
        dbErr?.message?.includes('PERMISSION_DENIED')
          ? 'Database write denied. Check Firebase RTDB rules (see database.rules.json).'
          : (dbErr?.message ?? 'Database write failed'),
      ) as any;
      e.code = 'db/write-failed';
      throw e;
    }

    // The real-time profile listener (set up in onAuthStateChanged) will pick
    // up the new profile automatically. Set it directly too for zero flicker.
    setUserProfile({ uid: user.uid, ...profile });
  };

  const signIn = async (email: string, password: string) => {
    if (!authRef.current || !fbRef.current) {
      const err = new Error('Auth not ready') as any;
      err.code = 'auth/not-ready';
      throw err;
    }
    const { user } = await fbRef.current.signInWithEmailAndPassword(
      authRef.current, email, password,
    );
    // Profile is loaded by the real-time listener; set it directly too
    // so navigation happens without waiting for the RTDB round-trip.
    const profile = await getUser(user.uid);
    if (profile) setUserProfile(profile);
  };

  const signOut = async () => {
    if (!authRef.current || !fbRef.current) return;
    await fbRef.current.signOut(authRef.current);
    setUserProfile(null);
  };

  const refreshProfile = async () => {
    if (firebaseUser) {
      const profile = await getUser(firebaseUser.uid);
      if (profile) setUserProfile(profile);
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

export type { FirebaseUser };
export type { User } from './database';
