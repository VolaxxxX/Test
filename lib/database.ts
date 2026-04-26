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
  timezone?: string;
  darkMode?: boolean;
  partnerTimezone?: string;
  themeColor?: string;
  achievements?: Record<string, number>; // achievementId → unlockedAt timestamp
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
  quality?: number;  // 1–5
  tag?: string;      // 'express' | 'normal' | 'difficile' | 'legendary'
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

export async function pairCouple(
  myUid: string,
  partnerUid: string,
  partnerName: string,
  myName: string,
  myTimezone: string,
  partnerTimezone: string,
) {
  // Single multi-location update: atomic in Firebase RTDB.
  // If the write partially fails, neither side is updated.
  await update(ref(db), {
    [`users/${myUid}/partnerId`]: partnerUid,
    [`users/${myUid}/partnerName`]: partnerName,
    [`users/${myUid}/partnerTimezone`]: partnerTimezone,
    [`users/${partnerUid}/partnerId`]: myUid,
    [`users/${partnerUid}/partnerName`]: myName,
    [`users/${partnerUid}/partnerTimezone`]: myTimezone,
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

export async function deletePoopSession(coupleId: string, sessionId: string) {
  await set(ref(db, `history/${coupleId}/${sessionId}`), null);
}

export async function unlockAchievement(uid: string, achievementId: string) {
  await update(ref(db, `users/${uid}/achievements`), { [achievementId]: Date.now() });
}

export async function updateSessionQuality(
  coupleId: string, sessionId: string, quality: number, tag?: string,
) {
  const data: Record<string, any> = { quality };
  if (tag) data.tag = tag;
  await update(ref(db, `history/${coupleId}/${sessionId}`), data);
}

export function subscribeToHistory(
  coupleId: string,
  callback: (sessions: PoopSession[]) => void
) {
  const r = query(ref(db, `history/${coupleId}`), orderByChild('startTime'), limitToLast(1000));
  return onValue(r, (snap) => {
    if (!snap.exists()) {
      callback([]);
      return;
    }
    const sessions: PoopSession[] = Object.values(snap.val()).reverse() as PoopSession[];
    callback(sessions);
  });
}

export function subscribeToTodaySessions(
  coupleId: string,
  date: string,
  callback: (sessions: PoopSession[]) => void,
): () => void {
  const q = query(ref(db, `history/${coupleId}`), orderByChild('date'), equalTo(date));
  return onValue(q, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.values(snap.val() as Record<string, PoopSession>));
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

// ── Messages ──────────────────────────────────────────────────────────
export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderEmoji: string;
  text: string;
  timestamp: number;
  specialEffect?: 'poop_rain';
  readBy?: Record<string, number>; // uid → timestamp
}

export async function sendMessage(
  coupleId: string,
  msg: Omit<Message, 'id'>,
): Promise<string> {
  const newRef = push(ref(db, `messages/${coupleId}`));
  await set(newRef, { ...msg, id: newRef.key });
  return newRef.key!;
}

export async function updateSessionDuration(coupleId: string, sessionId: string, durationSeconds: number) {
  await update(ref(db, `history/${coupleId}/${sessionId}`), { duration: durationSeconds });
}

export async function markMessagesRead(coupleId: string, readerUid: string): Promise<void> {
  const q = query(ref(db, `messages/${coupleId}`), orderByChild('timestamp'), limitToLast(60));
  const snap = await get(q);
  if (!snap.exists()) return;
  const updates: Record<string, number> = {};
  snap.forEach(child => {
    const msg = child.val() as Message;
    if (msg.senderId !== readerUid && !msg.readBy?.[readerUid]) {
      updates[`messages/${coupleId}/${child.key}/readBy/${readerUid}`] = Date.now();
    }
  });
  if (Object.keys(updates).length > 0) await update(ref(db), updates);
}

export function subscribeToMessages(
  coupleId: string,
  callback: (messages: Message[]) => void,
): () => void {
  const q = query(ref(db, `messages/${coupleId}`), orderByChild('timestamp'), limitToLast(60));
  return onValue(q, (snap) => {
    if (!snap.exists()) { callback([]); return; }
    const msgs = Object.values(snap.val() as Record<string, Message>);
    msgs.sort((a, b) => a.timestamp - b.timestamp);
    callback(msgs);
  });
}

// ── Couple Events (countdowns) ─────────────────────────────────────────
export interface CoupleEvent {
  id: string;
  emoji: string;
  name: string;
  dateStr: string;   // "MM-DD" for recurring, "YYYY-MM-DD" for one-time
  recurring: boolean;
}

export async function saveCoupleEvent(
  coupleId: string,
  event: Omit<CoupleEvent, 'id'>,
): Promise<string> {
  const newRef = push(ref(db, `events/${coupleId}`));
  await set(newRef, { ...event, id: newRef.key });
  return newRef.key!;
}

export function subscribeToCoupleEvents(
  coupleId: string,
  callback: (events: CoupleEvent[]) => void,
): () => void {
  return onValue(ref(db, `events/${coupleId}`), (snap) => {
    if (!snap.exists()) { callback([]); return; }
    callback(Object.values(snap.val() as Record<string, CoupleEvent>));
  });
}

// ── Couple ID (sorted uid pair) ────────────────────────────────────────
export function getCoupleId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}
