import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useColors } from '@/lib/useColors';
import { subscribeToHistory, getCoupleId, PoopSession } from '@/lib/database';
import { WeeklyChart } from '@/components/WeeklyChart';
import { getT } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';
import type { ColorScheme } from '@/constants/Colors';

function formatDuration(seconds?: number): string {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}min ${s.toString().padStart(2, '0')}s` : `${s}s`;
}

function formatDate(ts: number, language: Language): string {
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(ts));
}

/**
 * Returns today's date in YYYY-MM-DD using the user's own timezone.
 * toISOString() uses UTC which misattributes sessions for users far from UTC
 * (e.g. Indonesia UTC+7: 1am local = previous UTC day → wrong streak/stats).
 */
function getLocalToday(timezone?: string): string {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function computeStreak(sessions: PoopSession[], userId: string, timezone?: string): number {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dates = new Set(sessions.filter(s => s.userId === userId).map(s => s.date));
  const today = getLocalToday(tz);
  let streak = 0;
  const cursor = new Date();
  if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(cursor);
    if (dates.has(dateStr)) { streak++; cursor.setDate(cursor.getDate() - 1); }
    else break;
  }
  return streak;
}

function computeCoupleStreak(sessions: PoopSession[], uid1: string, uid2: string, timezone?: string): number {
  const d1 = new Set(sessions.filter(s => s.userId === uid1).map(s => s.date));
  const d2 = new Set(sessions.filter(s => s.userId === uid2).map(s => s.date));
  const both = new Set([...d1].filter(d => d2.has(d)));
  const today = getLocalToday(timezone);
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  let streak = 0;
  const cursor = new Date();
  if (!both.has(today)) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    const ds = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(cursor);
    if (both.has(ds)) { streak++; cursor.setDate(cursor.getDate() - 1); }
    else break;
  }
  return streak;
}

function computeRecord(sessions: PoopSession[], userId: string): number {
  const byDate: Record<string, number> = {};
  for (const s of sessions.filter(s => s.userId === userId)) {
    byDate[s.date] = (byDate[s.date] ?? 0) + 1;
  }
  return Math.max(0, ...Object.values(byDate));
}

function getWeeklyData(sessions: PoopSession[], userId: string, language: Language, timezone?: string) {
  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = new Date();
  const data: number[] = [];
  const dayLabels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d);
    data.push(sessions.filter(s => s.userId === userId && s.date === dateStr).length);
    dayLabels.push(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d));
  }
  return { data, dayLabels };
}

export default function HistoryScreen() {
  const { userProfile } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [sessions, setSessions] = useState<PoopSession[]>([]);
  const [loading, setLoading] = useState(true);

  const language = userProfile?.language ?? 'fr';
  const t = getT(language);

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

  const today = getLocalToday(userProfile?.timezone);
  const myUid = userProfile?.uid ?? '';
  const partnerUid = userProfile?.partnerId ?? '';

  const myTodayCount = sessions.filter(s => s.userId === myUid && s.date === today).length;
  const partnerTodayCount = sessions.filter(s => s.userId === partnerUid && s.date === today).length;
  const myAllTime = sessions.filter(s => s.userId === myUid).length;
  const partnerAllTime = sessions.filter(s => s.userId === partnerUid).length;

  const mySessionsWithDuration = sessions.filter(s => s.userId === myUid && s.duration);
  const myAvgDuration = mySessionsWithDuration.length > 0
    ? mySessionsWithDuration.reduce((a, s) => a + (s.duration ?? 0), 0) / mySessionsWithDuration.length : 0;

  const partnerSessionsWithDuration = sessions.filter(s => s.userId === partnerUid && s.duration);
  const partnerAvgDuration = partnerSessionsWithDuration.length > 0
    ? partnerSessionsWithDuration.reduce((a, s) => a + (s.duration ?? 0), 0) / partnerSessionsWithDuration.length : 0;

  const myStreak = computeStreak(sessions, myUid, userProfile?.timezone);
  const partnerStreak = computeStreak(sessions, partnerUid, userProfile?.partnerTimezone);
  const coupleStreak = computeCoupleStreak(sessions, myUid, partnerUid, userProfile?.timezone);
  const myRecord = computeRecord(sessions, myUid);
  const { data: weekData, dayLabels } = getWeeklyData(sessions, myUid, language, userProfile?.timezone);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>{t.statsTitle}</Text>

        {/* Today counter */}
        <View style={styles.todayCard}>
          <Text style={styles.todayLabel}>{t.todayLabel}</Text>
          <Text style={styles.todayCount}>{myTodayCount + partnerTodayCount}</Text>
          <Text style={styles.todaySubLabel}>{t.poopCount}</Text>
          <View style={styles.todayRow}>
            <View style={styles.todayItem}>
              <Text style={styles.todayItemEmoji}>{userProfile?.emoji}</Text>
              <Text style={styles.todayItemName}>{userProfile?.displayName}</Text>
              <Text style={styles.todayItemCount}>{myTodayCount} 💩</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayItem}>
              <Text style={styles.todayItemEmoji}>💞</Text>
              <Text style={styles.todayItemName}>{userProfile?.partnerName ?? '—'}</Text>
              <Text style={styles.todayItemCount}>{partnerTodayCount} 💩</Text>
            </View>
          </View>
        </View>

        {/* My stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={styles.statValue}>{myAllTime}</Text>
            <Text style={styles.statLabel}>{t.myPoops}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⏱️</Text>
            <Text style={styles.statValue}>{formatDuration(Math.round(myAvgDuration))}</Text>
            <Text style={styles.statLabel}>{t.avgDuration}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={styles.statValue}>{myStreak}</Text>
            <Text style={styles.statLabel}>{t.daysLabel}</Text>
            <Text style={styles.statSubLabel}>{t.streakLabel}</Text>
          </View>
        </View>

        {/* Partner stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💞</Text>
            <Text style={styles.statValue}>{partnerAllTime}</Text>
            <Text style={styles.statLabel}>{t.partnerPoops}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⏱️</Text>
            <Text style={styles.statValue}>{formatDuration(Math.round(partnerAvgDuration))}</Text>
            <Text style={styles.statLabel}>{t.partnerAvgDuration}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={styles.statValue}>{partnerStreak}</Text>
            <Text style={styles.statLabel}>{t.daysLabel}</Text>
            <Text style={styles.statSubLabel}>{t.partnerStreakLabel}</Text>
          </View>
        </View>

        {/* Couple streak + my record */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.coupleCard]}>
            <Text style={styles.statIcon}>💑</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>{coupleStreak}</Text>
            <Text style={styles.statLabel}>{t.bothDays}</Text>
            <Text style={styles.statSubLabel}>{t.coupleStreakLabel}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📅</Text>
            <Text style={styles.statValue}>{myRecord}</Text>
            <Text style={styles.statLabel}>{t.maxPerDay}</Text>
            <Text style={styles.statSubLabel}>{t.recordLabel}</Text>
          </View>
        </View>

        <WeeklyChart data={weekData} dayLabels={dayLabels} />

        <Text style={styles.sectionTitle}>{t.recentHistory}</Text>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🚽</Text>
            <Text style={styles.emptyText}>{t.noHistory}</Text>
            <Text style={styles.emptySubtext}>{t.goFirst}</Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            renderItem={({ item }) => (
              <SessionRow session={item} isMe={item.userId === myUid} language={language} t={t} colors={colors} />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function SessionRow({ session, isMe, language, t, colors }: {
  session: PoopSession; isMe: boolean; language: Language;
  t: ReturnType<typeof getT>; colors: ColorScheme;
}) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: colors.cardBg, borderRadius: 14, padding: 12, marginBottom: 8,
      borderLeftWidth: 4, borderLeftColor: isMe ? colors.primary : colors.primaryLight,
      shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06, shadowRadius: 6, elevation: 1,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <Text style={{ fontSize: 26 }}>{session.userPoopEmoji ?? session.userEmoji}</Text>
        <View>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.secondary }}>{session.userName}</Text>
          <Text style={{ fontSize: 11, color: colors.textLight }}>{formatDate(session.startTime, language)}</Text>
          {session.location?.address && (
            <Text style={{ fontSize: 10, color: colors.gray, maxWidth: 180 }} numberOfLines={1}>
              📍 {session.location.address}
            </Text>
          )}
          {session.reaction && <Text style={{ fontSize: 16, marginTop: 2 }}>{session.reaction}</Text>}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary }}>{formatDuration(session.duration)}</Text>
        <Text style={{ fontSize: 10, color: colors.textLight }}>{t.durationLabel}</Text>
      </View>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    title: { fontSize: 24, fontWeight: '800', color: c.secondary, marginBottom: 16, paddingTop: 8 },
    todayCard: {
      backgroundColor: c.accent, borderRadius: 20, padding: 20, alignItems: 'center',
      marginBottom: 14, shadowColor: c.shadow, shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
    },
    todayLabel: { fontSize: 13, fontWeight: '600', color: c.secondary, marginBottom: 2 },
    todayCount: { fontSize: 56, fontWeight: '900', color: c.secondary },
    todaySubLabel: { fontSize: 14, color: c.secondary, marginBottom: 14, opacity: 0.8 },
    todayRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
    todayItem: { alignItems: 'center', flex: 1 },
    todayDivider: { width: 1, backgroundColor: c.secondary, opacity: 0.2 },
    todayItemEmoji: { fontSize: 22 },
    todayItemName: { fontSize: 12, fontWeight: '600', color: c.secondary, marginTop: 2 },
    todayItemCount: { fontSize: 16, fontWeight: '800', color: c.secondary },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    statCard: {
      flex: 1, backgroundColor: c.cardBg, borderRadius: 16, padding: 14, alignItems: 'center',
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    },
    coupleCard: { borderWidth: 1.5, borderColor: c.primary },
    statIcon: { fontSize: 24, marginBottom: 4 },
    statValue: { fontSize: 18, fontWeight: '800', color: c.secondary },
    statLabel: { fontSize: 11, color: c.textLight, marginTop: 2, textAlign: 'center' },
    statSubLabel: { fontSize: 10, color: c.primary, fontWeight: '700', marginTop: 1 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: c.secondary, marginBottom: 10 },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyEmoji: { fontSize: 64, marginBottom: 12 },
    emptyText: { fontSize: 16, fontWeight: '600', color: c.secondary, textAlign: 'center' },
    emptySubtext: { fontSize: 13, color: c.textLight, marginTop: 6 },
  });
}
