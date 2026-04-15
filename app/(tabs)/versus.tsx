import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useColors } from '@/lib/useColors';
import { useHistory } from '@/lib/useHistory';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { CircularProgress } from '@/components/CircularProgress';
import { RingChart } from '@/components/RingChart';
import { getT } from '@/lib/i18n';
import type { ColorScheme } from '@/constants/Colors';
import type { PoopSession } from '@/lib/database';
import type { Language } from '@/lib/i18n';

// ── Stat helpers ────────────────────────────────────────────────────────────

function getLocalToday(tz: string): string {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()); }
  catch { return new Date().toISOString().split('T')[0]; }
}

function currentMonthPrefix(tz: string): string {
  return getLocalToday(tz).slice(0, 7); // YYYY-MM
}

function prevMonthPrefix(tz: string): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d).slice(0, 7); }
  catch { return d.toISOString().slice(0, 7); }
}

function daysInCurrentMonth(tz: string): number {
  const today = getLocalToday(tz);
  const [y, m] = today.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function computeStats(sessions: PoopSession[], uid: string, tz: string) {
  const mine = sessions.filter(s => s.userId === uid);
  const monthPfx = currentMonthPrefix(tz);
  const prevPfx  = prevMonthPrefix(tz);

  const thisMonth  = mine.filter(s => s.date?.startsWith(monthPfx)).length;
  const lastMonth  = mine.filter(s => s.date?.startsWith(prevPfx)).length;
  const allTime    = mine.length;

  const withDur = mine.filter(s => s.duration);
  const avgDur  = withDur.length > 0
    ? withDur.reduce((a, s) => a + (s.duration ?? 0), 0) / withDur.length : 0;
  const maxDur  = mine.reduce((a, s) => Math.max(a, s.duration ?? 0), 0);

  const activeDaysThisMonth = new Set(
    mine.filter(s => s.date?.startsWith(monthPfx)).map(s => s.date)
  ).size;
  const totalDays = daysInCurrentMonth(tz);
  const regularity = Math.round((activeDaysThisMonth / totalDays) * 100);

  // Streak
  const dates = new Set(mine.map(s => s.date));
  let streak = 0;
  const cursor = new Date();
  const today = getLocalToday(tz);
  if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const ds = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(cursor);
    if (dates.has(ds)) { streak++; cursor.setDate(cursor.getDate() - 1); }
    else break;
  }

  // Best day of week
  const dow: Record<number, number> = {};
  for (const s of mine) { const d = new Date(s.startTime).getDay(); dow[d] = (dow[d] ?? 0) + 1; }
  const bestDow = Object.entries(dow).sort((a, b) => b[1] - a[1])[0]?.[0];

  return { allTime, thisMonth, lastMonth, avgDur, maxDur, streak, regularity, activeDaysThisMonth, totalDays, bestDow };
}

function formatDur(s?: number): string {
  if (!s) return '--';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}min ${String(sec).padStart(2, '0')}s` : `${s}s`;
}

function crown(a: number, b: number): [string, string] {
  if (a > b) return ['👑', ''];
  if (b > a) return ['', '👑'];
  return ['🤝', '🤝'];
}

// ── Row component ───────────────────────────────────────────────────────────

function VsRow({
  label,
  myVal, partnerVal,
  myNum, partnerNum,
  colors, isFirst = false,
}: {
  label: string;
  myVal: string;
  partnerVal: string;
  myNum: number;
  partnerNum: number;
  colors: ColorScheme;
  isFirst?: boolean;
}) {
  const [crownMe, crownPartner] = crown(myNum, partnerNum);
  const s = rowStyles(colors);
  return (
    <View style={[s.row, isFirst && s.rowFirst]}>
      <View style={s.side}>
        <Text style={s.crown}>{crownMe}</Text>
        <Text style={[s.val, crownMe === '👑' && s.valWinner]}>{myVal}</Text>
      </View>
      <Text style={s.label}>{label}</Text>
      <View style={s.side}>
        <Text style={[s.val, crownPartner === '👑' && s.valWinner]}>{partnerVal}</Text>
        <Text style={s.crown}>{crownPartner}</Text>
      </View>
    </View>
  );
}

function rowStyles(c: ColorScheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.lightGray,
    },
    rowFirst: { borderTopWidth: 1, borderTopColor: c.lightGray },
    side: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
    val: { fontSize: 18, fontWeight: '800', color: c.secondary },
    valWinner: { color: c.primary },
    label: { width: 90, textAlign: 'center', fontSize: 10, fontWeight: '600', color: c.textLight },
    crown: { fontSize: 14 },
  });
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function VersusScreen() {
  const { userProfile } = useAuth();
  const colors = useColors();
  const { sessions, loading } = useHistory();
  const language = userProfile?.language ?? 'fr';
  const t = getT(language);

  const myUid = userProfile?.uid ?? '';
  const partnerUid = userProfile?.partnerId ?? '';
  const myTz = userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const partnerTz = userProfile?.partnerTimezone || myTz;

  const me = useMemo(() => computeStats(sessions, myUid, myTz), [sessions, myUid, myTz]);
  const partner = useMemo(() => computeStats(sessions, partnerUid, partnerTz), [sessions, partnerUid, partnerTz]);

  const total = me.allTime + partner.allTime;
  const myPercent = total > 0 ? Math.round((me.allTime / total) * 100) : 50;

  const myName = userProfile?.displayName ?? 'Moi';
  const partnerName = userProfile?.partnerName ?? '?';

  const monthName = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'long' })
    .format(new Date());

  const s = makeStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const monthDiff = me.thisMonth - me.lastMonth;
  const monthDiffLabel = monthDiff > 0 ? `+${monthDiff}` : `${monthDiff}`;
  const monthDiffColor = monthDiff > 0 ? colors.success : monthDiff < 0 ? colors.danger : colors.textLight;

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={s.title}>⚔️ Versus</Text>
        <View style={s.namesRow}>
          <Text style={[s.playerName, { color: colors.primary }]}>{userProfile?.emoji} {myName}</Text>
          <Text style={s.vs}>VS</Text>
          <Text style={[s.playerName, { color: colors.primaryLight, textAlign: 'right' }]}>
            {partnerName} 💞
          </Text>
        </View>

        {/* Ring chart */}
        <View style={[s.card, { alignItems: 'center', paddingVertical: 20 }]}>
          <Text style={s.cardTitle}>
            {language === 'fr' ? '💩 Qui poope le plus ?' : '💩 Who poops more?'}
          </Text>
          <RingChart
            myPercent={myPercent}
            myColor={colors.primary}
            partnerColor={colors.primaryLight}
            myLabel={myName}
            partnerLabel={partnerName}
            textColor={colors.secondary}
            centerLabel={`${total} total`}
          />
        </View>

        {/* Comparison table */}
        <View style={s.card}>
          <Text style={s.cardTitle}>
            {language === 'fr' ? '📊 Comparaison' : '📊 Comparison'}
          </Text>
          <View style={s.tableHeader}>
            <Text style={[s.tableHeaderText, { color: colors.primary }]}>{myName}</Text>
            <View style={{ width: 90 }} />
            <Text style={[s.tableHeaderText, { color: colors.primaryLight, textAlign: 'right' }]}>{partnerName}</Text>
          </View>

          <VsRow label={language === 'fr' ? 'Total poops' : 'All time'} myVal={`${me.allTime}`} partnerVal={`${partner.allTime}`} myNum={me.allTime} partnerNum={partner.allTime} colors={colors} isFirst />
          <VsRow label={monthName} myVal={`${me.thisMonth}`} partnerVal={`${partner.thisMonth}`} myNum={me.thisMonth} partnerNum={partner.thisMonth} colors={colors} />
          <VsRow label={language === 'fr' ? '🔥 Streak' : '🔥 Streak'} myVal={`${me.streak}j`} partnerVal={`${partner.streak}j`} myNum={me.streak} partnerNum={partner.streak} colors={colors} />
          <VsRow label={language === 'fr' ? '⏱ Durée moy.' : '⏱ Avg time'} myVal={formatDur(Math.round(me.avgDur))} partnerVal={formatDur(Math.round(partner.avgDur))} myNum={me.avgDur} partnerNum={partner.avgDur} colors={colors} />
          <VsRow label={language === 'fr' ? '🏅 Record' : '🏅 Record'} myVal={formatDur(me.maxDur)} partnerVal={formatDur(partner.maxDur)} myNum={me.maxDur} partnerNum={partner.maxDur} colors={colors} />
        </View>

        {/* Regularity circles */}
        <View style={s.card}>
          <Text style={s.cardTitle}>
            {language === 'fr' ? `📅 Régularité — ${monthName}` : `📅 Regularity — ${monthName}`}
          </Text>
          <View style={s.circleRow}>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <CircularProgress
                percent={me.regularity}
                fillColor={colors.primary}
                bgColor={colors.lightGray}
                centerValue={`${me.regularity}%`}
                centerLabel={`${me.activeDaysThisMonth}/${me.totalDays}j`}
                labelColor={colors.secondary}
              />
              <Text style={[s.circleLabel, { color: colors.primary }]}>{myName}</Text>
            </View>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <CircularProgress
                percent={partner.regularity}
                fillColor={colors.primaryLight}
                bgColor={colors.lightGray}
                centerValue={`${partner.regularity}%`}
                centerLabel={`${partner.activeDaysThisMonth}/${partner.totalDays}j`}
                labelColor={colors.secondary}
              />
              <Text style={[s.circleLabel, { color: colors.primaryLight }]}>{partnerName}</Text>
            </View>
          </View>
        </View>

        {/* My month comparison */}
        <View style={s.card}>
          <Text style={s.cardTitle}>
            {language === 'fr' ? '📈 Mois actuel vs mois dernier' : '📈 This month vs last month'}
          </Text>
          <View style={s.monthRow}>
            <View style={s.monthBlock}>
              <Text style={s.monthBlockLabel}>{language === 'fr' ? 'Mois dernier' : 'Last month'}</Text>
              <AnimatedNumber value={me.lastMonth} style={s.monthNum} />
              <Text style={s.monthBlockSub}>{myName}</Text>
            </View>
            <View style={s.monthArrow}>
              <Text style={[s.monthDiff, { color: monthDiffColor }]}>{monthDiff !== 0 ? monthDiffLabel : '='}</Text>
            </View>
            <View style={s.monthBlock}>
              <Text style={s.monthBlockLabel}>{language === 'fr' ? 'Ce mois' : 'This month'}</Text>
              <AnimatedNumber value={me.thisMonth} style={[s.monthNum, { color: colors.primary }]} />
              <Text style={s.monthBlockSub}>{myName}</Text>
            </View>
          </View>

          {/* Partner month comparison */}
          <View style={[s.monthRow, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.lightGray }]}>
            <View style={s.monthBlock}>
              <Text style={s.monthBlockLabel}>{language === 'fr' ? 'Mois dernier' : 'Last month'}</Text>
              <AnimatedNumber value={partner.lastMonth} style={s.monthNum} />
              <Text style={s.monthBlockSub}>{partnerName}</Text>
            </View>
            <View style={s.monthArrow}>
              <Text style={[s.monthDiff, {
                color: partner.thisMonth > partner.lastMonth ? colors.success
                  : partner.thisMonth < partner.lastMonth ? colors.danger
                  : colors.textLight,
              }]}>
                {partner.thisMonth !== partner.lastMonth
                  ? (partner.thisMonth > partner.lastMonth ? '+' : '') + (partner.thisMonth - partner.lastMonth)
                  : '='}
              </Text>
            </View>
            <View style={s.monthBlock}>
              <Text style={s.monthBlockLabel}>{language === 'fr' ? 'Ce mois' : 'This month'}</Text>
              <AnimatedNumber value={partner.thisMonth} style={[s.monthNum, { color: colors.primaryLight }]} />
              <Text style={s.monthBlockSub}>{partnerName}</Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 40 },
    title: { fontSize: 26, fontWeight: '900', color: c.secondary, marginBottom: 8, paddingTop: 8 },
    namesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    playerName: { fontSize: 15, fontWeight: '800', flex: 1 },
    vs: { fontSize: 18, fontWeight: '900', color: c.gray, marginHorizontal: 8 },
    card: {
      backgroundColor: c.cardBg, borderRadius: 20, padding: 16, marginBottom: 14,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
    },
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
