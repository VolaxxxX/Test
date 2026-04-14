import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useColors } from '@/lib/useColors';
import { getT, POOP_EMOJIS } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';
import type { ColorScheme } from '@/constants/Colors';

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    container: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 40,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: c.secondary,
      marginBottom: 20,
      paddingTop: 8,
    },
    avatarCard: {
      backgroundColor: c.cardBg,
      borderRadius: 24,
      padding: 28,
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 3,
    },
    avatar: { fontSize: 72, marginBottom: 10 },
    name: { fontSize: 24, fontWeight: '800', color: c.secondary, marginBottom: 4 },
    coupled: { fontSize: 14, color: c.primary, fontWeight: '600' },
    section: { marginBottom: 20 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textLight,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
    },
    langToggleBtn: {
      backgroundColor: c.secondary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    langToggleText: { color: c.white, fontWeight: '700', fontSize: 14 },
    poopEmojiGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    poopEmojiBtn: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: c.lightGray,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    poopEmojiBtnActive: {
      backgroundColor: c.primaryLight,
      borderColor: c.primary,
    },
    poopEmojiText: { fontSize: 20 },
    codeBox: {
      backgroundColor: c.accent,
      borderRadius: 16,
      padding: 20,
      alignItems: 'center',
      marginBottom: 10,
    },
    codeValue: {
      fontSize: 36,
      fontWeight: '900',
      color: c.secondary,
      letterSpacing: 8,
    },
    shareBtn: {
      backgroundColor: c.secondary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    shareBtnText: { color: c.white, fontWeight: '700', fontSize: 14 },
    infoCard: {
      backgroundColor: c.cardBg,
      borderRadius: 16,
      padding: 16,
      gap: 10,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    infoIcon: { fontSize: 18, width: 26 },
    infoText: { fontSize: 13, color: c.text, flex: 1, lineHeight: 20 },
    logoutBtn: {
      backgroundColor: c.lightGray,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 16,
    },
    logoutText: { color: c.danger, fontWeight: '700', fontSize: 15 },
    footer: {
      textAlign: 'center',
      color: c.gray,
      fontSize: 12,
      marginTop: 8,
    },
    darkModeBtn: {
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    darkModeBtnText: {
      fontWeight: '700',
      fontSize: 14,
    },
    tzValue: {
      fontSize: 14,
      color: c.text,
      fontWeight: '500',
    },
  });
}

export default function ProfileScreen() {
  const { userProfile, signOut, updateLanguage, updatePoopEmoji, updateDarkMode } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const language = userProfile?.language ?? 'fr';
  const t = getT(language);

  const handleSignOut = () => {
    Alert.alert(
      t.confirmSignOut,
      t.confirmSignOutBody,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.signOut, style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `💩 PoopTracker — ${t.coupleCodeLabel}: ${userProfile?.coupleCode}`,
      });
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
            {userProfile?.partnerId
              ? `💞 ${userProfile.partnerName}`
              : t.notLinked}
          </Text>
        </View>

        {/* Language toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.langLabel}</Text>
          <TouchableOpacity style={styles.langToggleBtn} onPress={handleToggleLanguage}>
            <Text style={styles.langToggleText}>{t.switchLang}</Text>
          </TouchableOpacity>
        </View>

        {/* Dark mode toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.darkModeLabel}</Text>
          <TouchableOpacity
            style={[styles.darkModeBtn, { backgroundColor: userProfile?.darkMode ? colors.primary : colors.lightGray }]}
            onPress={() => updateDarkMode(!(userProfile?.darkMode ?? false))}
          >
            <Text style={[styles.darkModeBtnText, { color: userProfile?.darkMode ? colors.white : colors.secondary }]}>
              {userProfile?.darkMode ? t.darkModeOn : t.darkModeOff}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timezone info */}
        {userProfile?.timezone ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t.myTime}</Text>
            <Text style={styles.tzValue}>{userProfile.timezone}</Text>
          </View>
        ) : null}

        {/* Poop emoji picker */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.poopEmojiLabel}</Text>
          <View style={styles.poopEmojiGrid}>
            {POOP_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[
                  styles.poopEmojiBtn,
                  (userProfile?.poopEmoji ?? '💩') === e && styles.poopEmojiBtnActive,
                ]}
                onPress={() => updatePoopEmoji(e)}
              >
                <Text style={styles.poopEmojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Couple code */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.coupleCodeLabel}</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeValue}>{userProfile?.coupleCode}</Text>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>{t.shareMyCode}</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.howItWorks}</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="1️⃣" text={t.step1} styles={styles} />
            <InfoRow icon="2️⃣" text={t.step2} styles={styles} />
            <InfoRow icon="3️⃣" text={t.step3} styles={styles} />
            <InfoRow icon="4️⃣" text={t.step4} styles={styles} />
            <InfoRow icon="5️⃣" text={t.step5} styles={styles} />
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

function InfoRow({ icon, text, styles }: { icon: string; text: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}
