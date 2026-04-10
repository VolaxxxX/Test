import React, { useEffect, useRef } from 'react';
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
import { Colors } from '@/constants/Colors';

// Note: backgroundColor interpolation requires useNativeDriver:false

function getTodayLabel(): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date());
}

export default function HomeScreen() {
  const { userProfile } = useAuth();
  const { mySession, partnerSession, myElapsed, partnerElapsed, startPoop, endPoop } = usePoopSession();

  const bothPooping = !!mySession && !!partnerSession;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const bannerLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (bothPooping) {
      // backgroundColor can NOT use useNativeDriver:true
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>💩</Text>
          <View>
            <Text style={styles.appName}>PoopTracker</Text>
            <Text style={styles.date}>{getTodayLabel()}</Text>
          </View>
        </View>

        {/* Status banner */}
        {bothPooping ? (
          <Animated.View style={[styles.banner, { backgroundColor: bannerBg }]}>
            <Text style={styles.bannerText}>💩💩 VOUS POOPEZ ENSEMBLE ! 💩💩</Text>
            <Text style={styles.bannerSub}>C'est le moment de la complicité ! 😂</Text>
          </Animated.View>
        ) : mySession ? (
          <View style={[styles.banner, { backgroundColor: Colors.primary }]}>
            <Text style={styles.bannerText}>💩 T'es aux toilettes !</Text>
            <Text style={styles.bannerSub}>Bon courage... prends ton temps ! 😄</Text>
          </View>
        ) : partnerSession ? (
          <View style={[styles.banner, { backgroundColor: Colors.primaryLight }]}>
            <Text style={styles.bannerText}>💩 {userProfile.partnerName} est aux toilettes !</Text>
            <Text style={styles.bannerSub}>Laisse-lui de l'espace 😂</Text>
          </View>
        ) : (
          <View style={[styles.banner, { backgroundColor: Colors.success }]}>
            <Text style={styles.bannerText}>😌 Tout le monde est libre !</Text>
            <Text style={styles.bannerSub}>Les toilettes sont disponibles 🚽</Text>
          </View>
        )}

        {/* Cards */}
        <View style={styles.cardsRow}>
          <PartnerCard
            name={userProfile.displayName}
            emoji={userProfile.emoji}
            isMe={true}
            active={!!mySession}
            session={mySession}
            elapsedSeconds={myElapsed}
            onStartPoop={startPoop}
            onEndPoop={endPoop}
          />
          <PartnerCard
            name={userProfile.partnerName ?? 'Partenaire'}
            emoji="💞"
            isMe={false}
            active={!!partnerSession}
            session={partnerSession}
            elapsedSeconds={partnerElapsed}
          />
        </View>

        {/* Quick tip */}
        <View style={styles.tipBox}>
          <Text style={styles.tipText}>
            {mySession
              ? '🧻 N\'oublie pas le papier !'
              : partnerSession
              ? '🤫 Chut, laisse-le/la tranquille...'
              : '💡 Appuie sur le bouton quand t\'as besoin d\'y aller !'}
          </Text>
        </View>
      </ScrollView>
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
