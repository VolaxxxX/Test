import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { ref, update } from 'firebase/database';
import { db } from './firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications(uid: string): Promise<void> {
  try {
    // Channels MUST be set up BEFORE requesting the token on Android.
    // FCM uses these channels to deliver notifications when app is killed/background.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8B4513',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      await Notifications.setNotificationChannelAsync('poop', {
        name: 'PoopTracker',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8B4513',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    if (!projectId) return;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;

    // Store token in Firebase
    await update(ref(db, `users/${uid}`), { pushToken });
  } catch {
    // Silently fail — notifications are optional
  }
}

export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        channelId: 'poop',
        priority: 'high',
        _displayInForeground: true,
      }),
    });
    const json = await res.json();
    const ticket = json?.data?.[0];
    if (ticket?.status === 'error') {
      return { ok: false, error: ticket.message ?? ticket.details?.error ?? 'Unknown error' };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
