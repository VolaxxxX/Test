import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  SafeAreaView, TouchableOpacity, Animated,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useColors } from '@/lib/useColors';
import { useHistory } from '@/lib/useHistory';
import { unlockAchievement } from '@/lib/database';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { CircularProgress } from '@/components/CircularProgress';
import { RingChart } from '@/components/RingChart';
import { getT } from '@/lib/i18n';
import type { ColorScheme } from '@/constants/Colors';
import type { PoopSession } from '@/lib/database';

// ─── Versus helpers ───────────────────────────────────────────────────────────

function getLocalToday(tz: string): string {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()); }
  catch { return new Date().toISOString().split('T')[0]; }
}
function currentMonthPrefix(tz: string) { return getLocalToday(tz).slice(0, 7); }
function prevMonthPrefix(tz: string): string {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d).slice(0, 7); }
  catch { return d.toISOString().slice(0, 7); }
}
function daysInCurrentMonth(tz: string): number {
  const [y, m] = getLocalToday(tz).split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
function computeStats(sessions: PoopSession[], uid: string, tz: string) {
  const mine = sessions.filter(s => s.userId === uid);
  const monthPfx = currentMonthPrefix(tz); const prevPfx = prevMonthPrefix(tz);
  const thisMonth = mine.filter(s => s.date?.startsWith(monthPfx)).length;
  const lastMonth = mine.filter(s => s.date?.startsWith(prevPfx)).length;
  const allTime = mine.length;
  const withDur = mine.filter(s => s.duration);
  const avgDur = withDur.length > 0 ? withDur.reduce((a, s) => a + (s.duration ?? 0), 0) / withDur.length : 0;
  const maxDur = mine.reduce((a, s) => Math.max(a, s.duration ?? 0), 0);
  const activeDaysThisMonth = new Set(mine.filter(s => s.date?.startsWith(monthPfx)).map(s => s.date)).size;
  const totalDays = daysInCurrentMonth(tz);
  const regularity = Math.round((activeDaysThisMonth / totalDays) * 100);
  const dates = new Set(mine.map(s => s.date));
  let streak = 0; const cursor = new Date(); const today = getLocalToday(tz);
  if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const ds = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(cursor);
    if (dates.has(ds)) { streak++; cursor.setDate(cursor.getDate() - 1); } else break;
  }
  return { allTime, thisMonth, lastMonth, avgDur, maxDur, streak, regularity, activeDaysThisMonth, totalDays };
}
function formatDur(s?: number): string {
  if (!s) return '--';
  const m = Math.floor(s / 60); const sec = s % 60;
  return m > 0 ? `${m}min ${String(sec).padStart(2, '0')}s` : `${s}s`;
}
function crown(a: number, b: number): [string, string] {
  if (a > b) return ['👑', '']; if (b > a) return ['', '👑']; return ['🤝', '🤝'];
}

function VsRow({ label, myVal, partnerVal, myNum, partnerNum, colors, isFirst = false }: {
  label: string; myVal: string; partnerVal: string; myNum: number; partnerNum: number; colors: ColorScheme; isFirst?: boolean;
}) {
  const [crownMe, crownPartner] = crown(myNum, partnerNum);
  const s = rowStyles(colors);
  return (
    <View style={[s.row, isFirst && s.rowFirst]}>
      <View style={s.side}><Text style={s.crown}>{crownMe}</Text><Text style={[s.val, crownMe === '👑' && s.valWinner]}>{myVal}</Text></View>
      <Text style={s.label}>{label}</Text>
      <View style={s.side}><Text style={[s.val, crownPartner === '👑' && s.valWinner]}>{partnerVal}</Text><Text style={s.crown}>{crownPartner}</Text></View>
    </View>
  );
}
function rowStyles(c: ColorScheme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.lightGray },
    rowFirst: { borderTopWidth: 1, borderTopColor: c.lightGray },
    side: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
    val: { fontSize: 18, fontWeight: '800', color: c.secondary },
    valWinner: { color: c.primary },
    label: { width: 90, textAlign: 'center', fontSize: 10, fontWeight: '600', color: c.textLight },
    crown: { fontSize: 14 },
  });
}

function VersusContent({ sessions, myUid, partnerUid, myTz, partnerTz, language, myName, partnerName, colors }: {
  sessions: PoopSession[]; myUid: string; partnerUid: string; myTz: string; partnerTz: string;
  language: string; myName: string; partnerName: string; colors: ColorScheme;
}) {
  const me      = useMemo(() => computeStats(sessions, myUid, myTz),      [sessions, myUid, myTz]);
  const partner = useMemo(() => computeStats(sessions, partnerUid, partnerTz), [sessions, partnerUid, partnerTz]);
  const total = me.allTime + partner.allTime;
  const myPercent = total > 0 ? Math.round((me.allTime / total) * 100) : 50;
  const monthName = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' }).format(new Date());
  const monthDiff = me.thisMonth - me.lastMonth;
  const monthDiffLabel = monthDiff > 0 ? `+${monthDiff}` : `${monthDiff}`;
  const monthDiffColor = monthDiff > 0 ? colors.success : monthDiff < 0 ? colors.danger : colors.textLight;
  const s = vsStyles(colors);
  const fr = language === 'fr';

  return (
    <>
      <View style={[s.card, { alignItems: 'center', paddingVertical: 20 }]}>
        <Text style={s.cardTitle}>{fr ? '💩 Qui poope le plus ?' : '💩 Who poops more?'}</Text>
        <RingChart myPercent={myPercent} myColor={colors.primary} partnerColor={colors.primaryLight}
          myLabel={myName} partnerLabel={partnerName} textColor={colors.secondary} centerLabel={`${total} total`} />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>{fr ? '📊 Comparaison' : '📊 Comparison'}</Text>
        <View style={s.tableHeader}>
          <Text style={[s.tableHeaderText, { color: colors.primary }]}>{myName}</Text>
          <View style={{ width: 90 }} />
          <Text style={[s.tableHeaderText, { color: colors.primaryLight, textAlign: 'right' }]}>{partnerName}</Text>
        </View>
        <VsRow label={fr ? 'Total poops' : 'All time'} myVal={`${me.allTime}`} partnerVal={`${partner.allTime}`} myNum={me.allTime} partnerNum={partner.allTime} colors={colors} isFirst />
        <VsRow label={monthName} myVal={`${me.thisMonth}`} partnerVal={`${partner.thisMonth}`} myNum={me.thisMonth} partnerNum={partner.thisMonth} colors={colors} />
        <VsRow label="🔥 Streak" myVal={`${me.streak}j`} partnerVal={`${partner.streak}j`} myNum={me.streak} partnerNum={partner.streak} colors={colors} />
        <VsRow label={fr ? '⏱ Durée moy.' : '⏱ Avg time'} myVal={formatDur(Math.round(me.avgDur))} partnerVal={formatDur(Math.round(partner.avgDur))} myNum={me.avgDur} partnerNum={partner.avgDur} colors={colors} />
        <VsRow label="🏅 Record" myVal={formatDur(me.maxDur)} partnerVal={formatDur(partner.maxDur)} myNum={me.maxDur} partnerNum={partner.maxDur} colors={colors} />
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>{fr ? `📅 Régularité — ${monthName}` : `📅 Regularity — ${monthName}`}</Text>
        <View style={s.circleRow}>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <CircularProgress percent={me.regularity} fillColor={colors.primary} bgColor={colors.lightGray}
              centerValue={`${me.regularity}%`} centerLabel={`${me.activeDaysThisMonth}/${me.totalDays}j`} labelColor={colors.secondary} />
            <Text style={[s.circleLabel, { color: colors.primary }]}>{myName}</Text>
          </View>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <CircularProgress percent={partner.regularity} fillColor={colors.primaryLight} bgColor={colors.lightGray}
              centerValue={`${partner.regularity}%`} centerLabel={`${partner.activeDaysThisMonth}/${partner.totalDays}j`} labelColor={colors.secondary} />
            <Text style={[s.circleLabel, { color: colors.primaryLight }]}>{partnerName}</Text>
          </View>
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>{fr ? '📈 Mois actuel vs mois dernier' : '📈 This month vs last month'}</Text>
        <View style={s.monthRow}>
          <View style={s.monthBlock}>
            <Text style={s.monthBlockLabel}>{fr ? 'Mois dernier' : 'Last month'}</Text>
            <AnimatedNumber value={me.lastMonth} style={s.monthNum} />
            <Text style={s.monthBlockSub}>{myName}</Text>
          </View>
          <View style={s.monthArrow}><Text style={[s.monthDiff, { color: monthDiffColor }]}>{monthDiff !== 0 ? monthDiffLabel : '='}</Text></View>
          <View style={s.monthBlock}>
            <Text style={s.monthBlockLabel}>{fr ? 'Ce mois' : 'This month'}</Text>
            <AnimatedNumber value={me.thisMonth} style={[s.monthNum, { color: colors.primary }]} />
            <Text style={s.monthBlockSub}>{myName}</Text>
          </View>
        </View>
        <View style={[s.monthRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.lightGray }]}>
          <View style={s.monthBlock}>
            <Text style={s.monthBlockLabel}>{fr ? 'Mois dernier' : 'Last month'}</Text>
            <AnimatedNumber value={partner.lastMonth} style={s.monthNum} />
            <Text style={s.monthBlockSub}>{partnerName}</Text>
          </View>
          <View style={s.monthArrow}>
            <Text style={[s.monthDiff, { color: partner.thisMonth > partner.lastMonth ? colors.success : partner.thisMonth < partner.lastMonth ? colors.danger : colors.textLight }]}>
              {partner.thisMonth !== partner.lastMonth ? (partner.thisMonth > partner.lastMonth ? '+' : '') + (partner.thisMonth - partner.lastMonth) : '='}
            </Text>
          </View>
          <View style={s.monthBlock}>
            <Text style={s.monthBlockLabel}>{fr ? 'Ce mois' : 'This month'}</Text>
            <AnimatedNumber value={partner.thisMonth} style={[s.monthNum, { color: colors.primaryLight }]} />
            <Text style={s.monthBlockSub}>{partnerName}</Text>
          </View>
        </View>
      </View>
    </>
  );
}

function vsStyles(c: ColorScheme) {
  return StyleSheet.create({
    card: { backgroundColor: c.cardBg, borderRadius: 20, padding: 16, marginBottom: 14, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2 },
    cardTitle: { fontSize: 14, fontWeight: '800', color: c.secondary, marginBottom: 14, textAlign: 'center' },
    tableHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    tableHeaderText: { flex: 1, fontSize: 12, fontWeight: '700' },
    circleRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8 },
    circleLabel: { fontSize: 12, fontWeight: '700' },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    monthBlock: { flex: 1, alignItems: 'center' },
    monthBlockLabel: { fontSize: 10, color: c.textLight, fontWeight: '600', marginBottom: 4 },
    monthNum: { fontSize: 32, fontWeight: '900', color: c.secondary },
    monthBlockSub: { fontSize: 10, color: c.textLight, marginTop: 2 },
    monthArrow: { paddingHorizontal: 8 },
    monthDiff: { fontSize: 20, fontWeight: '800' },
  });
}

// ─── Games helpers ────────────────────────────────────────────────────────────

function getWeekDates(offsetWeeks: number, tz?: string): string[] {
  const timezone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek - offsetWeeks * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
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
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
  const dates = new Set(sessions.filter(s => s.userId === uid).map(s => s.date));
  let streak = 0; const cursor = new Date();
  if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const ds = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(cursor);
    if (dates.has(ds)) { streak++; cursor.setDate(cursor.getDate() - 1); } else break;
  }
  return streak;
}

interface AchievementDef {
  id: string; emoji: string; labelFr: string; labelEn: string; descFr: string; descEn: string;
  check: (sessions: PoopSession[], uid: string, partnerUid: string, tz?: string) => boolean;
}
const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'centurion', emoji: '💯', labelFr: 'Centurion', labelEn: 'Centurion', descFr: '100 poops au total', descEn: '100 total poops', check: (s, uid) => s.filter(x => x.userId === uid).length >= 100 },
  { id: 'flash', emoji: '⚡', labelFr: 'Flash', labelEn: 'Flash', descFr: 'Session < 1 minute', descEn: 'Session < 1 minute', check: (s, uid) => s.some(x => x.userId === uid && (x.duration ?? 0) > 0 && (x.duration ?? 999) < 60) },
  { id: 'marathonien', emoji: '🏃', labelFr: 'Marathonien', labelEn: 'Marathon runner', descFr: 'Session > 20 minutes', descEn: 'Session > 20 minutes', check: (s, uid) => s.some(x => x.userId === uid && (x.duration ?? 0) >= 1200) },
  { id: 'leve_tot', emoji: '🌅', labelFr: 'Lève-tôt', labelEn: 'Early bird', descFr: 'Avant 7h du matin', descEn: 'Before 7am', check: (s, uid) => s.some(x => x.userId === uid && new Date(x.startTime).getHours() < 7) },
  { id: 'noctambule', emoji: '🌙', labelFr: 'Noctambule', labelEn: 'Night owl', descFr: 'Après 23h', descEn: 'After 11pm', check: (s, uid) => s.some(x => x.userId === uid && new Date(x.startTime).getHours() >= 23) },
  { id: 'semaine_parfaite', emoji: '🔥', labelFr: 'Semaine parfaite', labelEn: 'Perfect week', descFr: 'Streak de 7 jours', descEn: '7-day streak', check: (s, uid, _p, tz) => computeStreak(s, uid, tz) >= 7 },
  { id: 'champion', emoji: '👑', labelFr: 'Champion', labelEn: 'Champion', descFr: 'Plus de poops que ton partenaire', descEn: 'More poops than your partner', check: (s, uid, partnerUid) => { const mine = s.filter(x => x.userId === uid).length; return mine > 0 && mine > s.filter(x => x.userId === partnerUid).length; } },
  { id: 'couple_100', emoji: '💑', labelFr: 'Couple 100', labelEn: 'Couple 100', descFr: '100 poops en couple', descEn: '100 poops as a couple', check: (s, uid, partnerUid) => s.filter(x => x.userId === uid || x.userId === partnerUid).length >= 100 },
  { id: 'regulier', emoji: '📅', labelFr: 'Régulier', labelEn: 'Regular', descFr: '70%+ de régularité ce mois', descEn: '70%+ regularity this month', check: (s, uid, _p, tz) => { const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone }).format(new Date()); const [y, m] = today.split('-').map(Number); const pfx = today.slice(0, 7); const days = new Date(y, m, 0).getDate(); const active = new Set(s.filter(x => x.userId === uid && x.date?.startsWith(pfx)).map(x => x.date)).size; return days > 0 && active / days >= 0.7; } },
  { id: 'collectionneur', emoji: '🎖️', labelFr: 'Collectionneur', labelEn: 'Collector', descFr: 'Débloquer 5 achievements', descEn: 'Unlock 5 achievements', check: () => false },
];

function UnlockBanner({ ach, colors, language, onDone }: { ach: AchievementDef; colors: ColorScheme; language: string; onDone: () => void }) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 7 }),
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(onDone), 3200);
    return () => clearTimeout(t);
  }, []);
  const fr = language === 'fr';
  return (
    <Animated.View style={[{ backgroundColor: colors.primary, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 14, shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 14, elevation: 10 }, { transform: [{ scale }], opacity }]}>
      <Text style={{ fontSize: 52 }}>{ach.emoji}</Text>
      <Text style={{ color: colors.white, fontWeight: '900', fontSize: 17, marginTop: 6 }}>{fr ? '🏆 Achievement débloqué !' : '🏆 Achievement unlocked!'}</Text>
      <Text style={{ color: colors.white, opacity: 0.9, fontSize: 14, marginTop: 4 }}>{fr ? ach.labelFr : ach.labelEn}</Text>
    </Animated.View>
  );
}

function GamesContent({ sessions, myUid, partnerUid, tz, language, myName, partnerName, userEmoji, achievements, colors }: {
  sessions: PoopSession[]; myUid: string; partnerUid: string; tz: string;
  language: string; myName: string; partnerName: string; userEmoji: string;
  achievements: Record<string, boolean>; colors: ColorScheme;
}) {
  const fr = language === 'fr';
  const processedRef = useRef(new Set<string>());
  const [unlockQueue, setUnlockQueue] = useState<AchievementDef[]>([]);
  const [showing, setShowing] = useState<AchievementDef | null>(null);

  useEffect(() => {
    if (!showing && unlockQueue.length > 0) { setShowing(unlockQueue[0]); setUnlockQueue(q => q.slice(1)); }
  }, [unlockQueue, showing]);

  useEffect(() => {
    if (!sessions.length || !myUid || !partnerUid) return;
    let count = Object.keys(achievements).length;
    const newOnes: AchievementDef[] = [];
    for (const ach of ACHIEVEMENTS) {
      if (ach.id === 'collectionneur') continue;
      if (achievements[ach.id] || processedRef.current.has(ach.id)) continue;
      if (ach.check(sessions, myUid, partnerUid, tz)) {
        newOnes.push(ach); processedRef.current.add(ach.id);
        unlockAchievement(myUid, ach.id).catch(() => {}); count++;
      }
    }
    if (!achievements['collectionneur'] && !processedRef.current.has('collectionneur') && count >= 5) {
      const coll = ACHIEVEMENTS.find(a => a.id === 'collectionneur')!;
      newOnes.push(coll); processedRef.current.add('collectionneur');
      unlockAchievement(myUid, 'collectionneur').catch(() => {});
    }
    if (newOnes.length > 0) setUnlockQueue(q => [...q, ...newOnes]);
  }, [sessions, achievements]);

  const weeklyData = useMemo(() =>
    Array.from({ length: 5 }, (_, w) => {
      const dates = getWeekDates(w, tz);
      return {
        label: w === 0 ? (fr ? 'Cette semaine' : 'This week') : getWeekLabel(w, language, tz),
        myCount: sessions.filter(x => x.userId === myUid && dates.includes(x.date)).length,
        partnerCount: sessions.filter(x => x.userId === partnerUid && dates.includes(x.date)).length,
        isCurrent: w === 0,
      };
    }), [sessions, myUid, partnerUid, tz, fr]);

  const current = weeklyData[0];
  const past = weeklyData.slice(1);
  const unlockedCount = Object.keys(achievements).length;
  const gs = gamesStyles(colors);

  return (
    <>
      {showing && <UnlockBanner ach={showing} colors={colors} language={language} onDone={() => setShowing(null)} />}

      <Text style={gs.sectionTitle}>⚔️ {fr ? 'Paris de la semaine' : 'Weekly bet'}</Text>
      <View style={[gs.card, { borderWidth: 2, borderColor: colors.primary }]}>
        <Text style={gs.liveLabel}>{fr ? '🔴 EN COURS' : '🔴 LIVE'}</Text>
        <View style={gs.betRow}>
          <View style={gs.betSide}><Text style={gs.betName}>{userEmoji} {myName}</Text><Text style={[gs.betCount, { color: colors.primary }]}>{current.myCount}</Text></View>
          <Text style={gs.betVs}>VS</Text>
          <View style={[gs.betSide, { alignItems: 'flex-end' }]}><Text style={gs.betName}>{partnerName} 💞</Text><Text style={[gs.betCount, { color: colors.primaryLight }]}>{current.partnerCount}</Text></View>
        </View>
        {(current.myCount + current.partnerCount) > 0 && (
          <View style={gs.betBarWrap}>
            <View style={[gs.betBar, { flex: current.myCount || 0.5, backgroundColor: colors.primary, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }]} />
            <View style={[gs.betBar, { flex: current.partnerCount || 0.5, backgroundColor: colors.primaryLight, borderTopRightRadius: 4, borderBottomRightRadius: 4 }]} />
          </View>
        )}
        <Text style={gs.betStatus}>
          {current.myCount === current.partnerCount ? (fr ? "🤝 Égalité pour l'instant" : '🤝 Tied so far') : current.myCount > current.partnerCount ? (fr ? `👑 ${myName} mène !` : `👑 ${myName} leads!`) : (fr ? `👑 ${partnerName} mène !` : `👑 ${partnerName} leads!`)}
        </Text>
      </View>

      <Text style={gs.subLabel}>{fr ? '📜 Semaines précédentes' : '📜 Previous weeks'}</Text>
      {past.map((week, i) => (
        <View key={i} style={gs.histRow}>
          <Text style={gs.histLabel}>{week.label}</Text>
          <Text style={gs.histScore}>{week.myCount} – {week.partnerCount}</Text>
          <Text style={gs.histWinner}>{week.myCount === week.partnerCount ? '🤝' : `👑 ${week.myCount > week.partnerCount ? myName : partnerName}`}</Text>
        </View>
      ))}

      <Text style={[gs.sectionTitle, { marginTop: 24 }]}>🏆 Achievements ({unlockedCount}/{ACHIEVEMENTS.length})</Text>
      <View style={gs.grid}>
        {ACHIEVEMENTS.map(ach => {
          const unlocked = !!achievements[ach.id];
          return (
            <View key={ach.id} style={[gs.achCard, unlocked && { borderColor: colors.primary, borderWidth: 2 }]}>
              <Text style={[gs.achEmoji, !unlocked && { opacity: 0.2 }]}>{ach.emoji}</Text>
              <Text style={[gs.achLabel, { color: unlocked ? colors.primary : colors.gray }]}>{fr ? ach.labelFr : ach.labelEn}</Text>
              <Text style={gs.achDesc}>{unlocked ? (fr ? '✓ Débloqué' : '✓ Unlocked') : (fr ? ach.descFr : ach.descEn)}</Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

function gamesStyles(c: ColorScheme) {
  return StyleSheet.create({
    sectionTitle: { fontSize: 16, fontWeight: '800', color: c.secondary, marginBottom: 12 },
    subLabel: { fontSize: 12, fontWeight: '700', color: c.textLight, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    card: { backgroundColor: c.cardBg, borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
    liveLabel: { fontSize: 11, fontWeight: '800', color: c.primary, textAlign: 'center', marginBottom: 12, letterSpacing: 1 },
    betRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    betSide: { flex: 1, alignItems: 'flex-start' },
    betName: { fontSize: 13, fontWeight: '700', color: c.secondary, marginBottom: 2 },
    betCount: { fontSize: 52, fontWeight: '900', lineHeight: 58 },
    betVs: { fontSize: 18, fontWeight: '900', color: c.gray, marginHorizontal: 8 },
    betBarWrap: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
    betBar: { height: 8 },
    betStatus: { textAlign: 'center', fontSize: 14, fontWeight: '700', color: c.secondary },
    histRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.cardBg, borderRadius: 12, padding: 12, marginBottom: 7, shadowColor: c.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
    histLabel: { fontSize: 12, color: c.textLight, flex: 1 },
    histScore: { fontSize: 14, fontWeight: '800', color: c.secondary, marginHorizontal: 10 },
    histWinner: { fontSize: 12, fontWeight: '700', color: c.primary, minWidth: 80, textAlign: 'right' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    achCard: { width: '47%', backgroundColor: c.cardBg, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 0, borderColor: 'transparent', shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
    achEmoji: { fontSize: 36, marginBottom: 6 },
    achLabel: { fontSize: 13, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
    achDesc: { fontSize: 10, color: '#999', textAlign: 'center', lineHeight: 14 },
  });
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function VersusScreen() {
  const { userProfile } = useAuth();
  const colors = useColors();
  const { sessions, loading } = useHistory();
  const language = userProfile?.language ?? 'fr';
  const fr = language === 'fr';

  const [view, setView] = useState<'versus' | 'games'>('versus');

  const myUid       = userProfile?.uid ?? '';
  const partnerUid  = userProfile?.partnerId ?? '';
  const myTz        = userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const partnerTz   = userProfile?.partnerTimezone || myTz;
  const myName      = userProfile?.displayName ?? 'Moi';
  const partnerName = userProfile?.partnerName ?? '?';

  const s = useMemo(() => makeStyles(colors), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Pill switcher */}
      <View style={s.switcherWrap}>
        <TouchableOpacity
          style={[s.pill, view === 'versus' && { backgroundColor: colors.primary }]}
          onPress={() => setView('versus')}
          activeOpacity={0.8}
        >
          <Text style={[s.pillText, view === 'versus' && { color: colors.white }]}>⚔️ Versus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.pill, view === 'games' && { backgroundColor: colors.primary }]}
          onPress={() => setView('games')}
          activeOpacity={0.8}
        >
          <Text style={[s.pillText, view === 'games' && { color: colors.white }]}>🎮 {fr ? 'Défis' : 'Challenges'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {view === 'versus' ? (
          <VersusContent
            sessions={sessions} myUid={myUid} partnerUid={partnerUid}
            myTz={myTz} partnerTz={partnerTz} language={language}
            myName={myName} partnerName={partnerName} colors={colors}
          />
        ) : (
          <GamesContent
            sessions={sessions} myUid={myUid} partnerUid={partnerUid}
            tz={myTz} language={language} myName={myName} partnerName={partnerName}
            userEmoji={userProfile?.emoji ?? '😊'}
            achievements={userProfile?.achievements ?? {}}
            colors={colors}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    safe:        { flex: 1, backgroundColor: c.background },
    switcherWrap: {
      flexDirection: 'row', margin: 16, marginBottom: 0,
      backgroundColor: c.lightGray, borderRadius: 14, padding: 4,
    },
    pill: {
      flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center',
    },
    pillText: { fontSize: 14, fontWeight: '700', color: c.gray },
    content:     { padding: 16, paddingBottom: 40 },
  });
}
