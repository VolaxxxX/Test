import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useColors } from '@/lib/useColors';
import { usePoopSession } from '@/hooks/usePoopSession';
import { PartnerCard } from '@/components/PartnerCard';
import { ReactionPicker } from '@/components/ReactionPicker';
import { PartnerToast } from '@/components/PartnerToast';
import { CountdownCards } from '@/components/CountdownCards';
import { getT, LOVE_MESSAGES } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';
import type { ColorScheme } from '@/constants/Colors';

function getTodayLabel(language: Language): string {
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date());
}

function formatTimeInZone(ts: number, tz: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit', minute: '2-digit', timeZone: tz, hour12: false,
    }).format(new Date(ts));
  } catch { return '--:--'; }
}

function getShortTzName(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZoneName: 'short', timeZone: tz,
    }).formatToParts(new Date());
    return parts.find(p => p.type === 'timeZoneName')?.value ?? tz.split('/').pop() ?? tz;
  } catch { return tz.split('/').pop() ?? tz; }
}

export default function HomeScreen() {
  const { userProfile } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const {
    mySession,
    partnerSession,
    myElapsed,
    partnerElapsed,
    startPoop,
    endPoop,
    pendingSessionId,
    submitReaction,
    dismissReaction,
    firstTodayUserId,
  } = usePoopSession();

  const language = userProfile?.language ?? 'fr';
  const t = getT(language);

  // Toast: show when partner goes from inactive → active
  const [showPartnerToast, setShowPartnerToast] = useState(false);
  const prevPartnerRef = useRef<typeof partnerSession>(undefined);
  useEffect(() => {
    if (partnerSession && !prevPartnerRef.current) {
      setShowPartnerToast(true);
      const timer = setTimeout(() => setShowPartnerToast(false), 4000);
      prevPartnerRef.current = partnerSession;
      return () => clearTimeout(timer);
    }
    if (!partnerSession) prevPartnerRef.current = undefined;
    else prevPartnerRef.current = partnerSession;
  }, [partnerSession]);

  // Live dual-clock — refresh every 30 s
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const myTz = userProfile?.timezone ?? '';
  const partnerTz = userProfile?.partnerTimezone ?? '';
  const hasDualClock = !!(myTz && partnerTz && myTz !== partnerTz);

  const bothPooping = !!mySession && !!partnerSession;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const bannerLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const loveMessage = useMemo(() => {
    if (!partnerSession || mySession) return '';
    const msgs = LOVE_MESSAGES[language];
    return msgs[Math.floor(Math.random() * msgs.length)];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!partnerSession, !!mySession, language]);

  // Partner start time shown in both timezones (their tz first, mine second)
  const partnerStartDual = hasDualClock && partnerSession
    ? `${formatTimeInZone(partnerSession.startTime, partnerTz)} (${getShortTzName(partnerTz)})  ·  ${formatTimeInZone(partnerSession.startTime, myTz)} (${getShortTzName(myTz)})`
    : null;

  useEffect(() => {
    if (bothPooping) {
      bannerLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(titleAnim, { toValue: 1, duration: 500, useNativeDriver: false }),
          Animated.timing(titleAnim, { toValue: 0, duration: 500, useNativeDriver: false }),
        ])
      );
      bannerLoopRef.current.start();
    } else {
      bannerLoopRef.current?.stop();
      bannerLoopRef.current = null;
      titleAnim.setValue(0);
    }
    return () => { bannerLoopRef.current?.stop(); };
  }, [bothPooping]);

  const bannerBg = titleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.primary, colors.primaryLight],
  });

  if (!userProfile) return null;

  const partnerPoopEmoji = partnerSession?.userPoopEmoji ?? '💩';
  const partnerEmoji = partnerSession?.userEmoji ?? '💞';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>{userProfile.poopEmoji ?? '💩'}</Text>
          <View style={styles.headerText}>
            <Text style={styles.appName}>PoopTracker</Text>
            <Text style={styles.date}>{getTodayLabel(language)}</Text>
          </View>
        </View>

        {/* Dual timezone clock — visible only when both timezones are known */}
        {hasDualClock ? (
          <View style={styles.dualClock}>
            <Text style={styles.clockText}>
              🕐 {formatTimeInZone(now, myTz)} {getShortTzName(myTz)}
              {'   ·   '}
              🕐 {formatTimeInZone(now, partnerTz)} {getShortTzName(partnerTz)}
            </Text>
          </View>
        ) : null}

        {/* Countdown cards */}
        <View style={{ marginBottom: 12 }}>
          <CountdownCards colors={colors} language={language} />
        </View>

        {/* Status banner */}
        {bothPooping ? (
          <Animated.View style={[styles.banner, { backgroundColor: bannerBg }]}>
            <Text style={styles.bannerText}>{t.bannerTogether}</Text>
            <Text style={styles.bannerSub}>{t.bannerTogetherSub}</Text>
          </Animated.View>
        ) : mySession ? (
          <View style={[styles.banner, { backgroundColor: colors.primary }]}>
            <Text style={styles.bannerText}>{t.bannerMe}</Text>
            <Text style={styles.bannerSub}>{t.bannerMeSub}</Text>
          </View>
        ) : partnerSession ? (
          <View style={[styles.banner, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.bannerText, { color: colors.secondary }]}>
              💩 {userProfile.partnerName} {language === 'fr' ? 'est aux toilettes !' : 'is on the toilet!'}
            </Text>
            {partnerStartDual ? (
              <Text style={[styles.bannerSub, { color: colors.secondary, opacity: 0.8 }]}>
                🕐 {partnerStartDual}
              </Text>
            ) : null}
            <Text style={[styles.bannerSub, { color: colors.secondary, opacity: 0.75 }]}>{loveMessage}</Text>
          </View>
        ) : (
          <View style={[styles.banner, { backgroundColor: colors.success }]}>
            <Text style={styles.bannerText}>{t.bannerFree}</Text>
            <Text style={styles.bannerSub}>{t.bannerFreeSub}</Text>
          </View>
        )}

        {/* Partner cards */}
        <View style={styles.cardsRow}>
          <PartnerCard
            name={userProfile.displayName}
            emoji={userProfile.emoji}
            poopEmoji={userProfile.poopEmoji ?? '💩'}
            isMe={true}
            active={!!mySession}
            session={mySession}
            elapsedSeconds={myElapsed}
            language={language}
            onStartPoop={startPoop}
            onEndPoop={endPoop}
            isFirstToday={firstTodayUserId === userProfile.uid}
          />
          <PartnerCard
            name={userProfile.partnerName ?? (language === 'fr' ? 'Partenaire' : 'Partner')}
            emoji={partnerEmoji}
            poopEmoji={partnerPoopEmoji}
            isMe={false}
            active={!!partnerSession}
            session={partnerSession}
            elapsedSeconds={partnerElapsed}
            language={language}
            isFirstToday={firstTodayUserId === userProfile.partnerId}
          />
        </View>

        {/* Quick tip */}
        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            {mySession ? t.tipForgotPaper : partnerSession ? t.tipShh : t.tipPress}
          </Text>
        </View>
      </ScrollView>

      <ReactionPicker
        visible={!!pendingSessionId}
        onSelect={submitReaction}
        onSkip={dismissReaction}
      />
      <PartnerToast
        visible={showPartnerToast}
        name={userProfile.partnerName ?? '?'}
        emoji={partnerSession?.userEmoji ?? '💞'}
        poopEmoji={partnerSession?.userPoopEmoji ?? '💩'}
        language={language}
      />
    </SafeAreaView>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    container: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, paddingTop: 8 },
    headerText: { flex: 1 },
    logo: { fontSize: 40 },
    appName: { fontSize: 24, fontWeight: '800', color: c.secondary },
    date: { fontSize: 12, color: c.textLight, textTransform: 'capitalize' },
    dualClock: {
      backgroundColor: c.cardBg,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 14,
      marginBottom: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.lightGray,
    },
    clockText: { fontSize: 13, fontWeight: '600', color: c.textLight, letterSpacing: 0.3 },
    banner: {
      borderRadius: 18,
      padding: 16,
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    bannerText: { color: c.white, fontWeight: '800', fontSize: 15, textAlign: 'center' },
    bannerSub: { color: c.white, fontSize: 12, marginTop: 4, opacity: 0.9, textAlign: 'center' },
    cardsRow: { flexDirection: 'row', marginBottom: 16 },
    tipBox: { backgroundColor: c.lightGray, borderRadius: 14, padding: 14, alignItems: 'center' },
    tipText: { color: c.textLight, fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
  });
}
