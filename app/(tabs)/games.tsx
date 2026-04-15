import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, SafeAreaView, StyleSheet, Animated, ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useColors } from '@/lib/useColors';
import { useHistory } from '@/lib/useHistory';
import { unlockAchievement } from '@/lib/database';
import { getT } from '@/lib/i18n';
import type { PoopSession } from '@/lib/database';
import type { ColorScheme } from '@/constants/Colors';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLocalToday(tz?: string): string {
  const timezone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date()); }
  catch { return new Date().toISOString().split('T')[0]; }
}

function getWeekDates(offsetWeeks: number, tz?: string): string[] {
  const timezone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7; // 0 = Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek - offsetWeeks * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(d);
  });
}

function getWeekLabel(offsetWeeks: number, language: string, tz?: string): string {
  const dates = getWeekDates(offsetWeeks, tz);
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  const fmt = (d: Date) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d);
  return `${fmt(new Date(dates[0] + 'T12:00:00'))} – ${fmt(new Date(dates[6] + 'T12:00:00'))}`;
}

function computeStreak(sessions: PoopSession[], uid: string, tz?: string): number {
  const timezone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = getLocalToday(tz);
  const dates = new Set(sessions.filter(s => s.userId === uid).map(s => s.date));
  let streak = 0;
  const cursor = new Date();
  if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const ds = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(cursor);
    if (dates.has(ds)) { streak++; cursor.setDate(cursor.getDate() - 1); }
    else break;
  }
  return streak;
}

// ── Achievement definitions ───────────────────────────────────────────────────

interface AchievementDef {
  id: string;
  emoji: string;
  labelFr: string;
  labelEn: string;
  descFr: string;
  descEn: string;
  check: (sessions: PoopSession[], uid: string, partnerUid: string, tz?: string) => boolean;
}

const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'centurion', emoji: '💯',
    labelFr: 'Centurion', labelEn: 'Centurion',
    descFr: '100 poops au total', descEn: '100 total poops',
    check: (s, uid) => s.filter(x => x.userId === uid).length >= 100,
  },
  {
    id: 'flash', emoji: '⚡',
    labelFr: 'Flash', labelEn: 'Flash',
    descFr: 'Session < 1 minute', descEn: 'Session < 1 minute',
    check: (s, uid) => s.some(x => x.userId === uid && (x.duration ?? 0) > 0 && (x.duration ?? 999) < 60),
  },
  {
    id: 'marathonien', emoji: '🏃',
    labelFr: 'Marathonien', labelEn: 'Marathon runner',
    descFr: 'Session > 20 minutes', descEn: 'Session > 20 minutes',
    check: (s, uid) => s.some(x => x.userId === uid && (x.duration ?? 0) >= 1200),
  },
  {
    id: 'leve_tot', emoji: '🌅',
    labelFr: 'Lève-tôt', labelEn: 'Early bird',
    descFr: 'Avant 7h du matin', descEn: 'Before 7am',
    check: (s, uid) => s.some(x => x.userId === uid && new Date(x.startTime).getHours() < 7),
  },
  {
    id: 'noctambule', emoji: '🌙',
    labelFr: 'Noctambule', labelEn: 'Night owl',
    descFr: 'Après 23h', descEn: 'After 11pm',
    check: (s, uid) => s.some(x => x.userId === uid && new Date(x.startTime).getHours() >= 23),
  },
  {
    id: 'semaine_parfaite', emoji: '🔥',
    labelFr: 'Semaine parfaite', labelEn: 'Perfect week',
    descFr: 'Streak de 7 jours', descEn: '7-day streak',
    check: (s, uid, _p, tz) => computeStreak(s, uid, tz) >= 7,
  },
  {
    id: 'champion', emoji: '👑',
    labelFr: 'Champion', labelEn: 'Champion',
    descFr: 'Avoir plus de poops que ton partenaire', descEn: 'More poops than your partner',
    check: (s, uid, partnerUid) => {
      const mine = s.filter(x => x.userId === uid).length;
      const theirs = s.filter(x => x.userId === partnerUid).length;
      return mine > 0 && mine > theirs;
    },
  },
  {
    id: 'couple_100', emoji: '💑',
    labelFr: 'Couple 100', labelEn: 'Couple 100',
    descFr: '100 poops en couple', descEn: '100 poops as a couple',
    check: (s, uid, partnerUid) =>
      s.filter(x => x.userId === uid || x.userId === partnerUid).length >= 100,
  },
  {
    id: 'regulier', emoji: '📅',
    labelFr: 'Régulier', labelEn: 'Regular',
    descFr: '70%+ de régularité ce mois', descEn: '70%+ regularity this month',
    check: (s, uid, _p, tz) => {
      const today = getLocalToday(tz);
      const [y, m] = today.split('-').map(Number);
      const monthPfx = today.slice(0, 7);
      const daysInMonth = new Date(y, m, 0).getDate();
      const activeDays = new Set(
        s.filter(x => x.userId === uid && x.date?.startsWith(monthPfx)).map(x => x.date)
      ).size;
      return daysInMonth > 0 && activeDays / daysInMonth >= 0.7;
    },
  },
  {
    id: 'collectionneur', emoji: '🎖️',
    labelFr: 'Collectionneur', labelEn: 'Collector',
    descFr: 'Débloquer 5 achievements', descEn: 'Unlock 5 achievements',
    check: () => false, // handled separately after counting others
  },
];

// ── Unlock banner ─────────────────────────────────────────────────────────────

function UnlockBanner({ ach, colors, language, onDone }: {
  ach: AchievementDef; colors: ColorScheme; language: string; onDone: () => void;
}) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(onDone);
    }, 3200);
    return () => clearTimeout(t);
  }, []);

  const fr = language === 'fr';
  return (
    <Animated.View style={[{
      backgroundColor: colors.primary, borderRadius: 20, padding: 20,
      alignItems: 'center', marginBottom: 14,
      shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.45, shadowRadius: 14, elevation: 10,
    }, { transform: [{ scale }], opacity }]}>
      <Text style={{ fontSize: 52 }}>{ach.emoji}</Text>
      <Text style={{ color: colors.white, fontWeight: '900', fontSize: 17, marginTop: 6 }}>
        {fr ? '🏆 Achievement débloqué !' : '🏆 Achievement unlocked!'}
      </Text>
      <Text style={{ color: colors.white, opacity: 0.9, fontSize: 14, marginTop: 4 }}>
        {fr ? ach.labelFr : ach.labelEn}
      </Text>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function GamesScreen() {
  const { userProfile } = useAuth();
  const colors = useColors();
  const { sessions, loading } = useHistory();
  const language = userProfile?.language ?? 'fr';
  const fr = language === 'fr';
  const s = useMemo(() => makeStyles(colors), [colors]);

  const myUid = userProfile?.uid ?? '';
  const partnerUid = userProfile?.partnerId ?? '';
  const myName = userProfile?.displayName ?? 'Moi';
  const partnerName = userProfile?.partnerName ?? '?';
  const tz = userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Achievement unlock logic
  const processedRef = useRef(new Set<string>());
  const [unlockQueue, setUnlockQueue] = useState<AchievementDef[]>([]);
  const [showing, setShowing] = useState<AchievementDef | null>(null);

  useEffect(() => {
    if (!showing && unlockQueue.length > 0) {
      setShowing(unlockQueue[0]);
      setUnlockQueue(q => q.slice(1));
    }
  }, [unlockQueue, showing]);

  useEffect(() => {
    if (!sessions.length || !userProfile || !partnerUid) return;
    const known = userProfile.achievements ?? {};
    let count = Object.keys(known).length;
    const newOnes: AchievementDef[] = [];

    for (const ach of ACHIEVEMENTS) {
      if (ach.id === 'collectionneur') continue;
      if (known[ach.id] || processedRef.current.has(ach.id)) continue;
      if (ach.check(sessions, myUid, partnerUid, tz)) {
        newOnes.push(ach);
        processedRef.current.add(ach.id);
        unlockAchievement(myUid, ach.id).catch(() => {});
        count++;
      }
    }

    // Collectionneur: 5+ others
    if (!known['collectionneur'] && !processedRef.current.has('collectionneur') && count >= 5) {
      const coll = ACHIEVEMENTS.find(a => a.id === 'collectionneur')!;
      newOnes.push(coll);
      processedRef.current.add('collectionneur');
      unlockAchievement(myUid, 'collectionneur').catch(() => {});
    }

    if (newOnes.length > 0) setUnlockQueue(q => [...q, ...newOnes]);
  }, [sessions, userProfile?.achievements]);

  // Weekly bets (last 5 weeks)
  const weeklyData = useMemo(() =>
    Array.from({ length: 5 }, (_, w) => {
      const dates = getWeekDates(w, tz);
      const myCount = sessions.filter(x => x.userId === myUid && dates.includes(x.date)).length;
      const partnerCount = sessions.filter(x => x.userId === partnerUid && dates.includes(x.date)).length;
      return {
        label: w === 0 ? (fr ? 'Cette semaine' : 'This week') : getWeekLabel(w, language, tz),
        myCount,
        partnerCount,
        isCurrent: w === 0,
      };
    }),
    [sessions, myUid, partnerUid, tz, fr],
  );

  const current = weeklyData[0];
  const past = weeklyData.slice(1);
  const known = userProfile?.achievements ?? {};
  const unlockedCount = Object.keys(known).length;

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>🎮 {fr ? 'Défis' : 'Challenges'}</Text>

        {/* Achievement unlock banner */}
        {showing && (
          <UnlockBanner ach={showing} colors={colors} language={language} onDone={() => setShowing(null)} />
        )}

        {/* ── Paris de la semaine ── */}
        <Text style={s.sectionTitle}>⚔️ {fr ? 'Paris de la semaine' : 'Weekly bet'}</Text>

        {/* Current week live card */}
        <View style={[s.card, { borderWidth: 2, borderColor: colors.primary }]}>
          <Text style={s.liveLabel}>{fr ? '🔴 EN COURS' : '🔴 LIVE'}</Text>
          <View style={s.betRow}>
            <View style={s.betSide}>
              <Text style={s.betName}>{userProfile?.emoji} {myName}</Text>
              <Text style={[s.betCount, { color: colors.primary }]}>{current.myCount}</Text>
            </View>
            <Text style={s.betVs}>VS</Text>
            <View style={[s.betSide, { alignItems: 'flex-end' }]}>
              <Text style={s.betName}>{partnerName} 💞</Text>
              <Text style={[s.betCount, { color: colors.primaryLight }]}>{current.partnerCount}</Text>
            </View>
          </View>

          {/* Progress bar */}
          {(current.myCount + current.partnerCount) > 0 && (
            <View style={s.betBarWrap}>
              <View style={[s.betBar, {
                flex: current.myCount || 0.5,
                backgroundColor: colors.primary,
                borderTopLeftRadius: 4, borderBottomLeftRadius: 4,
              }]} />
              <View style={[s.betBar, {
                flex: current.partnerCount || 0.5,
                backgroundColor: colors.primaryLight,
                borderTopRightRadius: 4, borderBottomRightRadius: 4,
              }]} />
            </View>
          )}

          <Text style={s.betStatus}>
            {current.myCount === current.partnerCount
              ? (fr ? '🤝 Égalité pour l\'instant' : '🤝 Tied so far')
              : current.myCount > current.partnerCount
              ? (fr ? `👑 ${myName} mène !` : `👑 ${myName} leads!`)
              : (fr ? `👑 ${partnerName} mène !` : `👑 ${partnerName} leads!`)}
          </Text>
        </View>

        {/* Past weeks */}
        <Text style={s.subLabel}>{fr ? '📜 Semaines précédentes' : '📜 Previous weeks'}</Text>
        {past.map((week, i) => {
          const isTie = week.myCount === week.partnerCount;
          const winner = week.myCount > week.partnerCount ? myName : partnerName;
          return (
            <View key={i} style={s.histRow}>
              <Text style={s.histLabel}>{week.label}</Text>
              <Text style={s.histScore}>{week.myCount} – {week.partnerCount}</Text>
              <Text style={s.histWinner}>
                {isTie ? '🤝' : `👑 ${winner}`}
              </Text>
            </View>
          );
        })}

        {/* ── Achievements ── */}
        <Text style={[s.sectionTitle, { marginTop: 24 }]}>
          🏆 Achievements ({unlockedCount}/{ACHIEVEMENTS.length})
        </Text>
        <View style={s.grid}>
          {ACHIEVEMENTS.map(ach => {
            const unlocked = !!known[ach.id];
            return (
              <View key={ach.id} style={[s.achCard, unlocked && { borderColor: colors.primary, borderWidth: 2 }]}>
                <Text style={[s.achEmoji, !unlocked && { opacity: 0.2 }]}>{ach.emoji}</Text>
                <Text style={[s.achLabel, { color: unlocked ? colors.primary : colors.gray }]}>
                  {fr ? ach.labelFr : ach.labelEn}
                </Text>
                <Text style={s.achDesc}>
                  {unlocked
                    ? (fr ? '✓ Débloqué' : '✓ Unlocked')
                    : (fr ? ach.descFr : ach.descEn)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 26, fontWeight: '900', color: c.secondary, marginBottom: 16, paddingTop: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: c.secondary, marginBottom: 12 },
    subLabel: { fontSize: 12, fontWeight: '700', color: c.textLight, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    card: {
      backgroundColor: c.cardBg, borderRadius: 20, padding: 16, marginBottom: 12,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
    },
    liveLabel: { fontSize: 11, fontWeight: '800', color: c.primary, textAlign: 'center', marginBottom: 12, letterSpacing: 1 },
    betRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    betSide: { flex: 1, alignItems: 'flex-start' },
    betName: { fontSize: 13, fontWeight: '700', color: c.secondary, marginBottom: 2 },
    betCount: { fontSize: 52, fontWeight: '900', lineHeight: 58 },
    betVs: { fontSize: 18, fontWeight: '900', color: c.gray, marginHorizontal: 8 },
    betBarWrap: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
    betBar: { height: 8 },
    betStatus: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: c.secondary },
    histRow: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: c.cardBg, borderRadius: 12, padding: 12, marginBottom: 7,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    histLabel: { fontSize: 12, color: c.textLight, flex: 1 },
    histScore: { fontSize: 14, fontWeight: '800', color: c.secondary, marginHorizontal: 10 },
    histWinner: { fontSize: 12, fontWeight: '700', color: c.primary, minWidth: 80, textAlign: 'right' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    achCard: {
      width: '47%', backgroundColor: c.cardBg, borderRadius: 16, padding: 14,
      alignItems: 'center', borderWidth: 0, borderColor: 'transparent',
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
    },
    achEmoji: { fontSize: 36, marginBottom: 6 },
    achLabel: { fontSize: 13, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
    achDesc: { fontSize: 10, color: '#999', textAlign: 'center', lineHeight: 14 },
  });
}
