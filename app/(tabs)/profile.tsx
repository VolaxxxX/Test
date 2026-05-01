import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Share,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useColors } from '@/lib/useColors';
import { getT, POOP_EMOJIS } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';
import type { ColorScheme } from '@/constants/Colors';
import { THEME_COLORS } from '@/constants/Colors';
import { registerForPushNotifications, sendPushNotification } from '@/lib/notifications';
import { getUser } from '@/lib/database';

export default function ProfileScreen() {
  const { userProfile, firebaseUser, signOut, updateLanguage, updatePoopEmoji, updateDarkMode, updateThemeColor } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [notifLoading, setNotifLoading] = useState(false);

  const language = userProfile?.language ?? 'fr';
  const t = getT(language);
  const isDark = userProfile?.darkMode ?? false;
  const fr = language === 'fr';

  const handleForceRegisterNotif = async () => {
    if (!firebaseUser) return;
    setNotifLoading(true);
    try {
      await registerForPushNotifications(firebaseUser.uid);
      // Re-fetch to see if token was saved
      const profile = await getUser(firebaseUser.uid);
      if (profile?.pushToken) {
        Alert.alert('✅ OK', fr ? `Token enregistré !\n${profile.pushToken.slice(0, 30)}...` : `Token registered!\n${profile.pushToken.slice(0, 30)}...`);
      } else {
        Alert.alert('❌', fr ? 'Échec — aucun token. Vérifiez les permissions.' : 'Failed — no token. Check permissions.');
      }
    } catch (e) {
      Alert.alert('Erreur', String(e));
    } finally {
      setNotifLoading(false);
    }
  };

  const handleTestNotif = async () => {
    if (!userProfile?.pushToken) {
      Alert.alert('❌', fr ? 'Pas de token — appuie d\'abord sur "Forcer".' : 'No token — press "Force" first.');
      return;
    }
    setNotifLoading(true);
    try {
      const result = await sendPushNotification(userProfile.pushToken, '🧪 Test', fr ? 'Tu reçois bien les notifs !' : 'Notifications work!');
      if (result.ok) {
        Alert.alert('📤', fr ? 'Envoyée ! Ferme l\'app et attends quelques secondes.' : 'Sent! Close the app and wait a few seconds.');
      } else {
        Alert.alert('❌ Expo API', result.error ?? (fr ? 'Erreur inconnue' : 'Unknown error'));
      }
    } finally {
      setNotifLoading(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(t.confirmSignOut, t.confirmSignOutBody, [
      { text: t.cancel, style: 'cancel' },
      { text: t.signOut, style: 'destructive', onPress: signOut },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `💩 PoopTracker — ${t.coupleCodeLabel}: ${userProfile?.coupleCode}` });
    } catch {}
  };

  const handleToggleLanguage = async () => {
    const next: Language = language === 'fr' ? 'en' : 'fr';
    await updateLanguage(next);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>{t.profileTitle}</Text>

        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <Text style={styles.avatar}>{userProfile?.emoji}</Text>
          <Text style={styles.name}>{userProfile?.displayName}</Text>
          <Text style={styles.coupled}>
            {userProfile?.partnerId ? `💞 ${userProfile.partnerName}` : t.notLinked}
          </Text>
        </View>

        {/* Dark mode toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.darkModeLabel}</Text>
          <TouchableOpacity
            style={[styles.toggleBtn, isDark && styles.toggleBtnActive]}
            onPress={() => updateDarkMode(!isDark)}
          >
            <Text style={[styles.toggleBtnText, { color: isDark ? colors.white : colors.secondary }]}>
              {isDark ? t.darkModeOn : t.darkModeOff}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Language toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.langLabel}</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={handleToggleLanguage}>
            <Text style={styles.actionBtnText}>{t.switchLang}</Text>
          </TouchableOpacity>
        </View>

        {/* Poop emoji picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.poopEmojiLabel}</Text>
          <View style={styles.poopEmojiGrid}>
            {POOP_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.poopEmojiBtn, (userProfile?.poopEmoji ?? '💩') === e && styles.poopEmojiBtnActive]}
                onPress={() => updatePoopEmoji(e)}
              >
                <Text style={styles.poopEmojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Theme color picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>
            {language === 'fr' ? 'Couleur du thème' : 'Theme color'}
          </Text>
          <View style={styles.colorGrid}>
            {THEME_COLORS.map(({ color }) => {
              const active = (userProfile?.themeColor ?? '#C8825A') === color;
              return (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorBtn, { backgroundColor: color }, active && styles.colorBtnActive]}
                  onPress={() => updateThemeColor(color)}
                >
                  {active && <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Couple code */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.coupleCodeLabel}</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeValue}>{userProfile?.coupleCode}</Text>
          </View>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Text style={styles.actionBtnText}>{t.shareMyCode}</Text>
          </TouchableOpacity>
        </View>

        {/* Timezones */}
        {userProfile?.timezone ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.myTime}</Text>
            <View style={styles.tzCard}>
              <Text style={styles.tzRow}>
                🕐 {t.myTime} — <Text style={styles.tzValue}>{userProfile.timezone}</Text>
              </Text>
              {userProfile.partnerTimezone ? (
                <Text style={styles.tzRow}>
                  🕐 {t.partnerTime} — <Text style={styles.tzValue}>{userProfile.partnerTimezone}</Text>
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* How it works */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.howItWorks}</Text>
          <View style={styles.infoCard}>
            {([t.step1, t.step2, t.step3, t.step4, t.step5] as string[]).map((step, i) => (
              <View key={i} style={styles.infoRow}>
                <Text style={styles.infoIcon}>{['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣'][i]}</Text>
                <Text style={styles.infoText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Notifications debug */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{fr ? 'Notifications' : 'Notifications'}</Text>
          <View style={[styles.infoCard, { gap: 12 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>{userProfile?.pushToken ? '✅' : '❌'}</Text>
              <Text style={{ fontSize: 13, color: colors.text, flex: 1 }}>
                {userProfile?.pushToken
                  ? (fr ? 'Token push enregistré' : 'Push token registered')
                  : (fr ? 'Aucun token — notifications désactivées' : 'No token — notifications disabled')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary, opacity: notifLoading ? 0.6 : 1 }]}
              onPress={handleForceRegisterNotif}
              disabled={notifLoading}
            >
              <Text style={styles.actionBtnText}>
                {fr ? '🔔 Forcer l\'enregistrement' : '🔔 Force register'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.secondary, opacity: notifLoading ? 0.6 : 1 }]}
              onPress={handleTestNotif}
              disabled={notifLoading}
            >
              <Text style={styles.actionBtnText}>
                {fr ? '🧪 Tester une notification' : '🧪 Test notification'}
              </Text>
            </TouchableOpacity>
            {Platform.OS === 'android' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#E67E22' }]}
                onPress={() => Linking.openSettings()}
              >
                <Text style={styles.actionBtnText}>
                  {fr ? '⚡ Paramètres batterie / appli' : '⚡ Battery / app settings'}
                </Text>
              </TouchableOpacity>
            )}
            {Platform.OS === 'android' && (
              <Text style={{ fontSize: 12, color: colors.textLight, lineHeight: 18 }}>
                {fr
                  ? 'Si les notifs ne marchent pas app fermée → Batterie → Sans restriction. Sur Xiaomi : activer aussi "Démarrage automatique".'
                  : 'If notifications fail when app is closed → Battery → Unrestricted. On Xiaomi: also enable "Autostart".'}
              </Text>
            )}
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <Text style={styles.logoutText}>{t.signOut}</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>{t.appVersion}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    container: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
    title: { fontSize: 24, fontWeight: '800', color: c.secondary, marginBottom: 20, paddingTop: 8 },
    avatarCard: {
      backgroundColor: c.cardBg, borderRadius: 24, padding: 28, alignItems: 'center',
      marginBottom: 20, shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1, shadowRadius: 12, elevation: 3,
    },
    avatar: { fontSize: 72, marginBottom: 10 },
    name: { fontSize: 24, fontWeight: '800', color: c.secondary, marginBottom: 4 },
    coupled: { fontSize: 14, color: c.primary, fontWeight: '600' },
    section: { marginBottom: 20 },
    sectionLabel: {
      fontSize: 13, fontWeight: '700', color: c.textLight,
      textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10,
    },
    toggleBtn: {
      backgroundColor: c.lightGray, borderRadius: 12, paddingVertical: 13,
      alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent',
    },
    toggleBtnActive: { backgroundColor: c.secondary },
    toggleBtnText: { fontWeight: '700', fontSize: 14 },
    actionBtn: { backgroundColor: c.secondary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    actionBtnText: { color: c.white, fontWeight: '700', fontSize: 14 },
    colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    colorBtn: {
      width: 44, height: 44, borderRadius: 22,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 2, borderColor: 'transparent',
    },
    colorBtnActive: { borderColor: c.secondary, borderWidth: 3 },
    poopEmojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    poopEmojiBtn: {
      width: 52, height: 52, borderRadius: 26, backgroundColor: c.lightGray,
      justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
    },
    poopEmojiBtnActive: { backgroundColor: c.primaryLight, borderColor: c.primary },
    poopEmojiText: { fontSize: 20 },
    codeBox: {
      backgroundColor: c.accent, borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 10,
    },
    codeValue: { fontSize: 36, fontWeight: '900', color: c.secondary, letterSpacing: 8 },
    tzCard: {
      backgroundColor: c.cardBg, borderRadius: 14, padding: 14, gap: 6,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
    },
    tzRow: { fontSize: 13, color: c.textLight },
    tzValue: { color: c.secondary, fontWeight: '700' },
    infoCard: {
      backgroundColor: c.cardBg, borderRadius: 16, padding: 16, gap: 10,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
    },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    infoIcon: { fontSize: 18, width: 26 },
    infoText: { fontSize: 13, color: c.text, flex: 1, lineHeight: 20 },
    logoutBtn: {
      backgroundColor: c.lightGray, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 16,
    },
    logoutText: { color: c.danger, fontWeight: '700', fontSize: 15 },
    footer: { textAlign: 'center', color: c.gray, fontSize: 12, marginTop: 8 },
  });
}
