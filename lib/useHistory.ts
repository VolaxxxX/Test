import { useState, useEffect } from 'react';
import { subscribeToHistory, getCoupleId, PoopSession } from './database';
import { useAuth } from './auth-context';

export function useHistory() {
  const { userProfile } = useAuth();
  const [sessions, setSessions] = useState<PoopSession[]>([]);
  const [loading, setLoading] = useState(true);

  const coupleId = userProfile?.uid && userProfile?.partnerId
    ? getCoupleId(userProfile.uid, userProfile.partnerId)
    : null;

  useEffect(() => {
    if (!coupleId) { setLoading(false); return; }
    const unsub = subscribeToHistory(coupleId, (data) => {
      setSessions(data);
      setLoading(false);
    });
    return unsub;
  }, [coupleId]);

  return { sessions, loading };
}
