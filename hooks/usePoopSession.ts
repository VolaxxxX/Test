import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import {
  startPoopSession,
  endPoopSession,
  savePoopSession,
  subscribeToActiveSessions,
  getCoupleId,
  ActiveSession,
  updateSessionReaction,
  getUser,
} from '@/lib/database';
import { useAuth } from '@/lib/auth-context';
import { sendPushNotification } from '@/lib/notifications';

export function usePoopSession() {
  const { userProfile } = useAuth();
  const [activeSessions, setActiveSessions] = useState<Record<string, ActiveSession>>({});
  const [myElapsed, setMyElapsed] = useState(0);
  const [partnerElapsed, setPartnerElapsed] = useState(0);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  const myTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const partnerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const coupleId = userProfile?.uid && userProfile?.partnerId
    ? getCoupleId(userProfile.uid, userProfile.partnerId)
    : null;

  // Subscribe to real-time sessions
  useEffect(() => {
    if (!coupleId) return;
    const unsub = subscribeToActiveSessions(coupleId, setActiveSessions);
    return unsub;
  }, [coupleId]);

  // My timer
  useEffect(() => {
    const mySession = userProfile ? activeSessions[userProfile.uid] : undefined;
    if (myTimerRef.current) {
      clearInterval(myTimerRef.current);
      myTimerRef.current = null;
    }
    if (mySession) {
      const update = () => {
        setMyElapsed(Math.floor((Date.now() - mySession.startTime) / 1000));
      };
      update();
      myTimerRef.current = setInterval(update, 1000);
    } else {
      setMyElapsed(0);
    }
    return () => {
      if (myTimerRef.current) clearInterval(myTimerRef.current);
    };
  }, [activeSessions, userProfile?.uid]);

  // Partner timer
  useEffect(() => {
    const partnerSession = userProfile?.partnerId ? activeSessions[userProfile.partnerId] : undefined;
    if (partnerTimerRef.current) {
      clearInterval(partnerTimerRef.current);
      partnerTimerRef.current = null;
    }
    if (partnerSession) {
      const update = () => {
        setPartnerElapsed(Math.floor((Date.now() - partnerSession.startTime) / 1000));
      };
      update();
      partnerTimerRef.current = setInterval(update, 1000);
    } else {
      setPartnerElapsed(0);
    }
    return () => {
      if (partnerTimerRef.current) clearInterval(partnerTimerRef.current);
    };
  }, [activeSessions, userProfile?.partnerId]);

  const startPoop = async () => {
    if (!userProfile || !coupleId) return;
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
          address: geo
            ? [geo.name, geo.city, geo.country].filter(Boolean).join(', ')
            : undefined,
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
  };

  const endPoop = async () => {
    if (!userProfile || !coupleId) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const mySession = activeSessions[userProfile.uid];
    if (!mySession) return;

    const endTime = Date.now();
    const duration = Math.floor((endTime - mySession.startTime) / 1000);
    const today = new Date().toISOString().split('T')[0];

    const [sessionId] = await Promise.all([
      savePoopSession(coupleId, {
        userId: userProfile.uid,
        userName: userProfile.displayName,
        userEmoji: userProfile.emoji,
        userPoopEmoji: userProfile.poopEmoji ?? '💩',
        startTime: mySession.startTime,
        endTime,
        duration,
        location: mySession.location,
        date: today,
      }),
      endPoopSession(coupleId, userProfile.uid),
    ]);

    setPendingSessionId(sessionId);

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
  };

  const submitReaction = async (emoji: string) => {
    if (pendingSessionId && coupleId) {
      try {
        await updateSessionReaction(coupleId, pendingSessionId, emoji);
      } catch {}
    }
    setPendingSessionId(null);
  };

  const dismissReaction = () => setPendingSessionId(null);

  const mySession = userProfile ? activeSessions[userProfile.uid] : undefined;
  const partnerSession = userProfile?.partnerId ? activeSessions[userProfile.partnerId] : undefined;

  return {
    mySession,
    partnerSession,
    myElapsed,
    partnerElapsed,
    pendingSessionId,
    startPoop,
    endPoop,
    submitReaction,
    dismissReaction,
  };
}
