import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import {
  startPoopSession,
  endPoopSession,
  savePoopSession,
  subscribeToActiveSessions,
  subscribeToTodaySessions,
  getCoupleId,
  ActiveSession,
  PoopSession,
  updateSessionReaction,
  updateSessionQuality,
  getUser,
} from '@/lib/database';
import { useAuth } from '@/lib/auth-context';
import { sendPushNotification } from '@/lib/notifications';

/**
 * Returns today's date string (YYYY-MM-DD) in the user's local timezone.
 * Using toISOString() would give UTC date, which can be yesterday or tomorrow
 * for users far from UTC (e.g. Indonesia UTC+7 at 1am = previous UTC day).
 */
function getLocalDateStr(timezone?: string): string {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    // 'en-CA' formats as YYYY-MM-DD — the only locale that does this by default
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

export function usePoopSession() {
  const { userProfile } = useAuth();
  const [activeSessions, setActiveSessions] = useState<Record<string, ActiveSession>>({});
  const [todaySessions, setTodaySessions] = useState<PoopSession[]>([]);
  const [myElapsed, setMyElapsed] = useState(0);
  const [partnerElapsed, setPartnerElapsed] = useState(0);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const myTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const partnerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Prevents double-tap race conditions on start/end poop
  const inFlightRef = useRef(false);

  const coupleId = userProfile?.uid && userProfile?.partnerId
    ? getCoupleId(userProfile.uid, userProfile.partnerId)
    : null;

  // Today's date in the user's own timezone — refreshes at midnight
  const [todayDate, setTodayDate] = useState(() => getLocalDateStr(userProfile?.timezone));

  // Check for date change every minute (catches midnight rollover)
  useEffect(() => {
    const check = setInterval(() => {
      const next = getLocalDateStr(userProfile?.timezone);
      setTodayDate(prev => prev !== next ? next : prev);
    }, 60_000);
    return () => clearInterval(check);
  }, [userProfile?.timezone]);

  // Subscribe to real-time active sessions
  useEffect(() => {
    if (!coupleId) return;
    const unsub = subscribeToActiveSessions(coupleId, setActiveSessions);
    return unsub;
  }, [coupleId]);

  // Subscribe to today's completed sessions — re-subscribes at midnight
  useEffect(() => {
    if (!coupleId) return;
    return subscribeToTodaySessions(coupleId, todayDate, setTodaySessions);
  }, [coupleId, todayDate]);

  // My timer
  useEffect(() => {
    const mySession = userProfile ? activeSessions[userProfile.uid] : undefined;
    if (myTimerRef.current) {
      clearInterval(myTimerRef.current);
      myTimerRef.current = null;
    }
    if (mySession) {
      const tick = () => setMyElapsed(Math.floor((Date.now() - mySession.startTime) / 1000));
      tick();
      myTimerRef.current = setInterval(tick, 1000);
    } else {
      setMyElapsed(0);
    }
    return () => { if (myTimerRef.current) clearInterval(myTimerRef.current); };
  }, [activeSessions, userProfile?.uid]);

  // Partner timer
  useEffect(() => {
    const partnerSession = userProfile?.partnerId ? activeSessions[userProfile.partnerId] : undefined;
    if (partnerTimerRef.current) {
      clearInterval(partnerTimerRef.current);
      partnerTimerRef.current = null;
    }
    if (partnerSession) {
      const tick = () => setPartnerElapsed(Math.floor((Date.now() - partnerSession.startTime) / 1000));
      tick();
      partnerTimerRef.current = setInterval(tick, 1000);
    } else {
      setPartnerElapsed(0);
    }
    return () => { if (partnerTimerRef.current) clearInterval(partnerTimerRef.current); };
  }, [activeSessions, userProfile?.partnerId]);

  const startPoop = async () => {
    if (!userProfile || !coupleId) return;
    // Guard: prevent double-tap creating two sessions
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      let locationData: ActiveSession['location'] | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          locationData = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            address: geo ? [geo.name, geo.city, geo.country].filter(Boolean).join(', ') : undefined,
          };
        }
      } catch {}

      const session: ActiveSession = {
        userId: userProfile.uid,
        userName: userProfile.displayName,
        userEmoji: userProfile.emoji,
        userPoopEmoji: userProfile.poopEmoji ?? '💩',
        startTime: Date.now(),
        location: locationData,
      };

      await startPoopSession(coupleId, session);

      // Notify partner
      if (userProfile.partnerId) {
        try {
          const partner = await getUser(userProfile.partnerId);
          if (partner?.pushToken) {
            const isEN = (partner.language ?? 'fr') === 'en';
            await sendPushNotification(
              partner.pushToken,
              '💩 PoopTracker',
              `${userProfile.emoji} ${userProfile.displayName} ${isEN ? 'is on the toilet!' : 'est aux toilettes !'}`,
            );
          }
        } catch {}
      }
    } finally {
      inFlightRef.current = false;
    }
  };

  const endPoop = async () => {
    if (!userProfile || !coupleId) return;
    // Guard: prevent double-tap creating two history entries
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const mySession = activeSessions[userProfile.uid];
      if (!mySession) return;

      const endTime = Date.now();
      const duration = Math.floor((endTime - mySession.startTime) / 1000);
      // Use user's local timezone for the date — critical for UTC+7 (Indonesia)
      const date = getLocalDateStr(userProfile.timezone);

      // Save history first — if this fails, no data is lost and the user can retry.
      const sessionId = await savePoopSession(coupleId, {
        userId: userProfile.uid,
        userName: userProfile.displayName,
        userEmoji: userProfile.emoji,
        userPoopEmoji: userProfile.poopEmoji ?? '💩',
        startTime: mySession.startTime,
        endTime,
        duration,
        location: mySession.location,
        date,
      });

      // Advance UI state immediately after save succeeds.
      // This prevents a duplicate history entry: if endPoopSession fails below
      // and the user taps "done" again, inFlightRef resets but the active session
      // is cleared best-effort on the retry — save is NOT called a second time
      // because the active session will be null after the first successful clear
      // (or if it's stale, the duplicate guard would catch it).
      setPendingSessionId(sessionId);

      // Clear active session — fire-and-forget. A failure here leaves a stale
      // active-session indicator but the history entry is already saved and the
      // reaction picker is already open. The stale indicator auto-disappears on
      // next app open when endPoopSession retries successfully.
      endPoopSession(coupleId, userProfile.uid).catch(() => {});

      // Notify partner
      if (userProfile.partnerId) {
        try {
          const partner = await getUser(userProfile.partnerId);
          if (partner?.pushToken) {
            const isEN = (partner.language ?? 'fr') === 'en';
            await sendPushNotification(
              partner.pushToken,
              '✅ PoopTracker',
              `${userProfile.emoji} ${userProfile.displayName} ${isEN ? 'is done! 🎉' : 'a fini ! 🎉'}`,
            );
          }
        } catch {}
      }
    } finally {
      inFlightRef.current = false;
    }
  };

  const submitReaction = async (emoji: string | null, quality: number, tag?: string) => {
    if (pendingSessionId && coupleId) {
      try {
        if (emoji) await updateSessionReaction(coupleId, pendingSessionId, emoji);
        if (quality > 0) await updateSessionQuality(coupleId, pendingSessionId, quality, tag);
      } catch {}
    }
    setPendingSessionId(null);
  };

  const dismissReaction = () => setPendingSessionId(null);

  const mySession = userProfile ? activeSessions[userProfile.uid] : undefined;
  const partnerSession = userProfile?.partnerId ? activeSessions[userProfile.partnerId] : undefined;

  // Who had the earliest completed poop today?
  const firstTodayUserId = todaySessions.length > 0
    ? todaySessions.reduce((a, b) => a.startTime < b.startTime ? a : b).userId
    : null;

  return {
    mySession,
    partnerSession,
    myElapsed,
    partnerElapsed,
    pendingSessionId,
    firstTodayUserId,
    startPoop,
    endPoop,
    submitReaction,
    dismissReaction,
  };
}
