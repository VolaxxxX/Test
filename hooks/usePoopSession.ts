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
} from '@/lib/database';
import { useAuth } from '@/lib/auth-context';

export function usePoopSession() {
  const { userProfile } = useAuth();
  const [activeSessions, setActiveSessions] = useState<Record<string, ActiveSession>>({});
  const [myElapsed, setMyElapsed] = useState(0);
  const [partnerElapsed, setPartnerElapsed] = useState(0);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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
      startTime: Date.now(),
      location: locationData,
    };

    await startPoopSession(coupleId, session);
  };

  const endPoop = async () => {
    if (!userProfile || !coupleId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const mySession = activeSessions[userProfile.uid];
    if (!mySession) return;

    const endTime = Date.now();
    const duration = Math.floor((endTime - mySession.startTime) / 1000);
    const today = new Date().toISOString().split('T')[0];

    await Promise.all([
      endPoopSession(coupleId, userProfile.uid),
      savePoopSession(coupleId, {
        userId: userProfile.uid,
        userName: userProfile.displayName,
        userEmoji: userProfile.emoji,
        startTime: mySession.startTime,
        endTime,
        duration,
        location: mySession.location,
        date: today,
      }),
    ]);
  };

  const mySession = userProfile ? activeSessions[userProfile.uid] : undefined;
  const partnerSession = userProfile?.partnerId ? activeSessions[userProfile.partnerId] : undefined;

  return {
    mySession,
    partnerSession,
    myElapsed,
    partnerElapsed,
    startPoop,
    endPoop,
  };
}
