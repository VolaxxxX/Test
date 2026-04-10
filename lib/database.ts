import { ref, set, get, update, push, onValue, off, serverTimestamp, query, orderByChild, limitToLast } from 'firebase/database';
import { db } from './firebase';

export interface User {
  uid: string;
  displayName: string;
  emoji: string;
  coupleCode: string;
  partnerId?: string;
  partnerName?: string;
}

export interface PoopSession {
  id: string;
  userId: string;
  userName: string;
  userEmoji: string;
  startTime: number;
  endTime?: number;
  duration?: number; // seconds
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  date: string; // YYYY-MM-DD
}

export interface ActiveSession {
  userId: string;
  userName: string;
  userEmoji: string;
  startTime: number;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

// ── User CRUD ──────────────────────────────────────────────────────────
export async function createUser(uid: string, data: Omit<User, 'uid'>) {
  await set(ref(db, `users/${uid}`), { ...data, uid });
}

export async function getUser(uid: string): Promise<User | null> {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? snap.val() : null;
}

export async function updateUser(uid: string, data: Partial<User>) {
  await update(ref(db, `users/${uid}`), data);
}

// ── Couple pairing ─────────────────────────────────────────────────────
export async function findUserByCode(code: string): Promise<User | null> {
  const snap = await get(ref(db, 'users'));
  if (!snap.exists()) return null;
  const users: Record<string, User> = snap.val();
  const found = Object.values(users).find((u) => u.coupleCode === code);
  return found ?? null;
}

export async function pairCouple(myUid: string, partnerUid: string, partnerName: string, myName: string) {
  await update(ref(db, `users/${myUid}`), { partnerId: partnerUid, partnerName });
  await update(ref(db, `users/${partnerUid}`), { partnerId: myUid, partnerName: myName });
}

// ── Active session (real-time status) ─────────────────────────────────
export async function startPoopSession(coupleId: string, session: ActiveSession) {
  await set(ref(db, `activeSessions/${coupleId}/${session.userId}`), session);
}

export async function endPoopSession(coupleId: string, userId: string) {
  await set(ref(db, `activeSessions/${coupleId}/${userId}`), null);
}

export function subscribeToActiveSessions(
  coupleId: string,
  callback: (sessions: Record<string, ActiveSession>) => void
) {
  const r = ref(db, `activeSessions/${coupleId}`);
  onValue(r, (snap) => {
    callback(snap.exists() ? snap.val() : {});
  });
  return () => off(r);
}

// ── Poop history ───────────────────────────────────────────────────────
export async function savePoopSession(coupleId: string, session: Omit<PoopSession, 'id'>) {
  const newRef = push(ref(db, `history/${coupleId}`));
  await set(newRef, { ...session, id: newRef.key });
  return newRef.key!;
}

export function subscribeToHistory(
  coupleId: string,
  callback: (sessions: PoopSession[]) => void
) {
  const r = query(ref(db, `history/${coupleId}`), orderByChild('startTime'), limitToLast(100));
  onValue(r, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const sessions: PoopSession[] = Object.values(snap.val()).reverse() as PoopSession[];
    callback(sessions);
  });
  return () => off(r as any);
}

// ── Couple ID (sorted uid pair) ────────────────────────────────────────
export function getCoupleId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}
