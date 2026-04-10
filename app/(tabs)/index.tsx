import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { usePoopSession } from '@/hooks/usePoopSession';
import { PartnerCard } from '@/components/PartnerCard';
import { ReactionPicker } from '@/components/ReactionPicker';
import { Colors } from '@/constants/Colors';
import { getT, LOVE_MESSAGES } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

// Note: backgroundColor interpolation requires useNativeDriver:false

function getTodayLabel(language: Language): string {
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date());
}

export default function HomeScreen() {
  const { userProfile } = useAuth();
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
  } = usePoopSession();

  const language = userProfile?.language ?? 'fr';
  const t = getT(language);

  const bothPooping = !!mySession && !!partnerSession;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const bannerLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Pick a random love message when partner is active and I'm not
  const loveMessage = useMemo(() => {
    if (!partnerSession || mySession) return '';
    const msgs = LOVE_MESSAGES[language];
    return msgs[Math.floor(Math.random() * msgs.length)];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!partnerSession, !!mySession, language]);

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
    return () => {
      bannerLoopRef.current?.stop();
    };
  }, [bothPooping]);

  const bannerBg = titleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.primary, Colors.accent],
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
          <View>
            <Text style={styles.appName}>PoopTracker</Text>
            <Text style={styles.date}>{getTodayLabel(language)}</Text>
          </View>
        </View>

        {/* Status banner */}
        {bothPooping ? (
          <Animated.View style={[styles.banner, { backgroundColor: bannerBg }]}>
            <Text style={styles.bannerText}>{t.bannerTogether}</Text>
            <Text style={styles.bannerSub}>{t.bannerTogetherSub}</Text>
          </Animated.View>
        ) : mySession ? (
          <View style={[styles.banner, { backgroundColor: Colors.primary }]}>
            <Text style={styles.bannerText}>{t.bannerMe}</Text>
            <Text style={styles.bannerSub}>{t.bannerMeSub}</Text>
          </View>
        ) : partnerSession ? (
          <View style={[styles.banner, { backgroundColor: Colors.primaryLight }]}>
            <Text style={styles.bannerText}>
              💩 {userProfile.partnerName} {language === 'fr' ? 'est aux toilettes !' : 'is on the toilet!'}
            </Text>
            <Text style={styles.bannerSub}>{loveMessage}</Text>
          </View>
        ) : (
          <View style={[styles.banner, { backgroundColor: Colors.success }]}>
            <Text style={styles.bannerText}>{t.bannerFree}</Text>
            <Text style={styles.bannerSub}>{t.bannerFreeSub}</Text>
          </View>
        )}

        {/* Cards */}
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
          />
        </View>

        {/* Quick tip */}
        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            {mySession
              ? t.tipForgotPaper
              : partnerSession
              ? t.tipShh
              : t.tipPress}
          </Text>
        </View>
      </ScrollView>

      <ReactionPicker
        visible={!!pendingSessionId}
        onSelect={submitReaction}
        onSkip={dismissReaction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingTop: 8,
  },
  logo: { fontSize: 40 },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.secondary,
  },
  date: {
    fontSize: 12,
    color: Colors.textLight,
    textTransform: 'capitalize',
  },
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
  bannerText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 15,
    textAlign: 'center',
  },
  bannerSub: {
    color: Colors.white,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.9,
    textAlign: 'center',
  },
  cardsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tipBox: {
    backgroundColor: Colors.lightGray,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  tipText: {
    color: Colors.textLight,
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
