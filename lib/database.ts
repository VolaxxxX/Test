import { ref, set, get, update, push, onValue, query, orderByChild, limitToLast, equalTo } from 'firebase/database';
import { db } from './firebase';
import type { Language, PoopEmoji } from './i18n';

export interface User {
  uid: string;
  displayName: string;
  emoji: string;
  poopEmoji: string;
  coupleCode: string;
  partnerId?: string;
  partnerName?: string;
  language: Language;
  pushToken?: string;
}

export interface PoopSession {
  id: string;
  userId: string;
  userName: string;
  userEmoji: string;
  userPoopEmoji: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  date: string;
  reaction?: string;
}

export interface ActiveSession {
  userId: string;
  userName: string;
  userEmoji: string;
  userPoopEmoji: string;
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
  // Uses the .indexOn ["coupleCode"] rule in database.rules.json for efficiency.
  const q = query(ref(db, 'users'), orderByChild('coupleCode'), equalTo(code));
  const snap = await get(q);
  if (!snap.exists()) return null;
  const entries = Object.values(snap.val() as Record<string, User>);
  return entries[0] ?? null;
}

export async function pairCouple(myUid: string, partnerUid: string, partnerName: string, myName: string) {
  // Single multi-location update: atomic in Firebase RTDB.
  // If the write partially fails, neither side is updated.
  await update(ref(db), {
    [`users/${myUid}/partnerId`]: partnerUid,
    [`users/${myUid}/partnerName`]: partnerName,
    [`users/${partnerUid}/partnerId`]: myUid,
    [`users/${partnerUid}/partnerName`]: myName,
  });
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
  return onValue(r, (snap) => {
    callback(snap.exists() ? snap.val() : {});
  });
}

// ── Poop history ───────────────────────────────────────────────────────
export async function savePoopSession(coupleId: string, session: Omit<PoopSession, 'id'>) {
  const newRef = push(ref(db, `history/${coupleId}`));
  await set(newRef, { ...session, id: newRef.key });
  return newRef.key!;
}

export async function updateSessionReaction(coupleId: string, sessionId: string, reaction: string) {
  await update(ref(db, `history/${coupleId}/${sessionId}`), { reaction });
}

export function subscribeToHistory(
  coupleId: string,
  callback: (sessions: PoopSession[]) => void
) {
  const r = query(ref(db, `history/${coupleId}`), orderByChild('startTime'), limitToLast(100));
  return onValue(r, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const sessions: PoopSession[] = Object.values(snap.val()).reverse() as PoopSession[];
    callback(sessions);
  });
}

// ── Real-time profile subscription ────────────────────────────────────
// Used by AuthProvider so pairing updates (partnerId) propagate instantly
// to both devices without requiring an app restart.
export function subscribeToProfile(
  uid: string,
  onData: (profile: User | null) => void,
  onError?: (err: Error) => void,
): () => void {
  const r = ref(db, `users/${uid}`);
  return onValue(
    r,
    (snap) => onData(snap.exists() ? (snap.val() as User) : null),
    (err) => onError?.(err),
  );
}

// ── Couple ID (sorted uid pair) ────────────────────────────────────────
export function getCoupleId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}
