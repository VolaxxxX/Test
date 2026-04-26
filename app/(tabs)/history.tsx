import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useColors } from '@/lib/useColors';
import { useHistory } from '@/lib/useHistory';
import { PoopSession, getCoupleId, updateSessionReaction, updateSessionDuration, deletePoopSession } from '@/lib/database';
import { Modal } from 'react-native';
import { EmojiReactPicker } from '@/components/EmojiReactPicker';
import { WeeklyChart } from '@/components/WeeklyChart';
import { MonthlyChart } from '@/components/MonthlyChart';
import { WeeklyInsights } from '@/components/WeeklyInsights';
import { CalendarView } from '@/components/CalendarView';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { CircularProgress } from '@/components/CircularProgress';
import { RingChart } from '@/components/RingChart';
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

function currentMonthPrefix(tz: string): string {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date()).slice(0, 7); }
  catch { return new Date().toISOString().slice(0, 7); }
}
function prevMonthPrefix(tz: string): string {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d).slice(0, 7); }
  catch { return d.toISOString().slice(0, 7); }
}
function daysInCurrentMonth(tz: string): number {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
  const [y, m] = today.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export default function HistoryScreen() {
  const { userProfile } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { sessions, loading } = useHistory();

  const language = userProfile?.language ?? 'fr';
  const t = getT(language);

  const [reactingSession, setReactingSession] = useState<PoopSession | null>(null);
  const [editingSession, setEditingSession] = useState<PoopSession | null>(null);
  const [editHour, setEditHour] = useState('');
  const [editMin, setEditMin] = useState('');
  const [editSec, setEditSec] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const today = getLocalToday(userProfile?.timezone);
  const myUid = userProfile?.uid ?? '';
  const partnerUid = userProfile?.partnerId ?? '';
  const coupleId = myUid && partnerUid ? getCoupleId(myUid, partnerUid) : null;

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

  // ── Advanced stats ──────────────────────────────────────────────────────
  const totalCouple = myAllTime + partnerAllTime;
  const myPercent = totalCouple > 0 ? Math.round((myAllTime / totalCouple) * 100) : 50;

  const myActiveDays = new Set(sessions.filter(s => s.userId === myUid).map(s => s.date)).size;
  const myAvgPerDay = myActiveDays > 0 ? (myAllTime / myActiveDays) : 0;

  const tz = userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const monthPfx = currentMonthPrefix(tz);
  const prevPfx  = prevMonthPrefix(tz);
  const myThisMonth = sessions.filter(s => s.userId === myUid && s.date?.startsWith(monthPfx)).length;
  const myLastMonth = sessions.filter(s => s.userId === myUid && s.date?.startsWith(prevPfx)).length;
  const monthDiff = myThisMonth - myLastMonth;

  const activeDaysThisMonth = new Set(
    sessions.filter(s => s.userId === myUid && s.date?.startsWith(monthPfx)).map(s => s.date)
  ).size;
  const totalDaysInMonth = daysInCurrentMonth(tz);
  const regularity = Math.round((activeDaysThisMonth / totalDaysInMonth) * 100);

  const dayOfWeekCount: Record<number, number> = {};
  for (const s of sessions.filter(s => s.userId === myUid)) {
    const dow = new Date(s.startTime).getDay();
    dayOfWeekCount[dow] = (dayOfWeekCount[dow] ?? 0) + 1;
  }
  const bestDow = Object.entries(dayOfWeekCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  const bestDayLabel = bestDow !== undefined
    ? new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long' }).format(
        new Date(2024, 0, parseInt(bestDow) === 0 ? 7 : parseInt(bestDow))
      ) : '—';

  // ── Search + filter ─────────────────────────────────────────────────────
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    if (filterPeriod === 'today') {
      result = result.filter(s => s.date === today);
    } else if (filterPeriod === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 6);
      const tz2 = userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const weekStart = new Intl.DateTimeFormat('en-CA', { timeZone: tz2 }).format(weekAgo);
      result = result.filter(s => s.date >= weekStart);
    } else if (filterPeriod === 'month') {
      result = result.filter(s => s.date?.startsWith(monthPfx));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.userName?.toLowerCase().includes(q) ||
        s.location?.address?.toLowerCase().includes(q) ||
        s.date?.includes(q) ||
        s.tag?.toLowerCase().includes(q),
      );
    }

    return result;
  }, [sessions, filterPeriod, searchQuery, today, monthPfx, userProfile?.timezone]);

  const FILTER_OPTS = [
    { key: 'all' as const, labelFr: 'Tout', labelEn: 'All' },
    { key: 'today' as const, labelFr: "Aujourd'hui", labelEn: 'Today' },
    { key: 'week' as const, labelFr: '7 jours', labelEn: '7 days' },
    { key: 'month' as const, labelFr: 'Ce mois', labelEn: 'Month' },
  ];

  const ListHeader = (
    <View style={styles.header}>
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
          <AnimatedNumber value={myAllTime} style={styles.statValue} />
          <Text style={styles.statLabel}>{t.myPoops}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⏱️</Text>
          <Text style={styles.statValue}>{formatDuration(Math.round(myAvgDuration))}</Text>
          <Text style={styles.statLabel}>{t.avgDuration}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🔥</Text>
          <AnimatedNumber value={myStreak} style={styles.statValue} />
          <Text style={styles.statLabel}>{t.daysLabel}</Text>
          <Text style={styles.statSubLabel}>{t.streakLabel}</Text>
        </View>
      </View>

      {/* Partner stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💞</Text>
          <AnimatedNumber value={partnerAllTime} style={styles.statValue} />
          <Text style={styles.statLabel}>{t.partnerPoops}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⏱️</Text>
          <Text style={styles.statValue}>{formatDuration(Math.round(partnerAvgDuration))}</Text>
          <Text style={styles.statLabel}>{t.partnerAvgDuration}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🔥</Text>
          <AnimatedNumber value={partnerStreak} style={styles.statValue} />
          <Text style={styles.statLabel}>{t.daysLabel}</Text>
          <Text style={styles.statSubLabel}>{t.partnerStreakLabel}</Text>
        </View>
      </View>

      {/* Couple streak + record */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.coupleCard]}>
          <Text style={styles.statIcon}>💑</Text>
          <AnimatedNumber value={coupleStreak} style={[styles.statValue, { color: colors.primary }]} />
          <Text style={styles.statLabel}>{t.bothDays}</Text>
          <Text style={styles.statSubLabel}>{t.coupleStreakLabel}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📅</Text>
          <AnimatedNumber value={myRecord} style={styles.statValue} />
          <Text style={styles.statLabel}>{t.maxPerDay}</Text>
          <Text style={styles.statSubLabel}>{t.recordLabel}</Text>
        </View>
      </View>

      <WeeklyChart data={weekData} dayLabels={dayLabels} />

      {/* Weekly insights */}
      <WeeklyInsights
        sessions={sessions}
        myUid={myUid}
        partnerUid={partnerUid}
        myName={userProfile?.displayName ?? 'Moi'}
        partnerName={userProfile?.partnerName ?? '?'}
        colors={colors}
        language={language}
        timezone={userProfile?.timezone}
      />

      {/* Monthly chart */}
      <View style={styles.monthCard}>
        <Text style={styles.ringLabel}>
          {language === 'fr' ? '📅 Ce mois — jour par jour' : '📅 This month — day by day'}
        </Text>
        <MonthlyChart
          sessions={sessions}
          myUid={myUid}
          partnerUid={partnerUid}
          myName={userProfile?.displayName ?? 'Moi'}
          partnerName={userProfile?.partnerName ?? '?'}
          colors={colors}
          language={language}
          timezone={userProfile?.timezone}
        />
      </View>

      {/* Advanced stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>💑</Text>
          <AnimatedNumber value={totalCouple} style={styles.statValue} />
          <Text style={styles.statLabel}>{language === 'fr' ? 'Total couple' : 'Couple total'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📈</Text>
          <AnimatedNumber value={myAvgPerDay} style={styles.statValue} decimals={1} />
          <Text style={styles.statLabel}>{language === 'fr' ? 'Moy./jour actif' : 'Avg./active day'}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📅</Text>
          <Text numberOfLines={1} style={[styles.statValue, { fontSize: 12 }]}>
            {bestDayLabel !== '—' ? bestDayLabel.charAt(0).toUpperCase() + bestDayLabel.slice(1) : '—'}
          </Text>
          <Text style={styles.statLabel}>{language === 'fr' ? 'Jour favori' : 'Fav. day'}</Text>
        </View>
      </View>

      {/* Regularity circle + Ring chart */}
      <View style={styles.ringCard}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={styles.ringLabel}>{language === 'fr' ? 'Régularité' : 'Regularity'}</Text>
          <CircularProgress
            percent={regularity}
            fillColor={colors.primary}
            bgColor={colors.lightGray}
            centerValue={`${regularity}%`}
            centerLabel={`${activeDaysThisMonth}/${totalDaysInMonth}j`}
            labelColor={colors.secondary}
          />
        </View>
        {totalCouple > 0 && (
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Text style={styles.ringLabel}>{language === 'fr' ? 'Qui poope + ?' : 'Who poops more?'}</Text>
            <RingChart
              myPercent={myPercent}
              myColor={colors.primary}
              partnerColor={colors.primaryLight}
              myLabel={userProfile?.displayName ?? 'Moi'}
              partnerLabel={userProfile?.partnerName ?? '?'}
              textColor={colors.secondary}
              size={110}
              centerLabel={`${totalCouple}`}
            />
          </View>
        )}
      </View>

      {/* Month comparison */}
      <View style={styles.monthCard}>
        <Text style={styles.ringLabel}>{language === 'fr' ? '📈 Ce mois vs mois dernier' : '📈 This month vs last month'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 8 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: colors.textLight, marginBottom: 4 }}>
              {language === 'fr' ? 'Mois dernier' : 'Last month'}
            </Text>
            <AnimatedNumber value={myLastMonth} style={[styles.statValue, { fontSize: 28 }]} />
          </View>
          <Text style={{
            fontSize: 24, fontWeight: '800',
            color: monthDiff > 0 ? colors.success : monthDiff < 0 ? colors.danger : colors.gray,
          }}>
            {monthDiff > 0 ? `+${monthDiff}` : monthDiff === 0 ? '=' : `${monthDiff}`}
          </Text>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: colors.textLight, marginBottom: 4 }}>
              {language === 'fr' ? 'Ce mois' : 'This month'}
            </Text>
            <AnimatedNumber value={myThisMonth} style={[styles.statValue, { fontSize: 28, color: colors.primary }]} />
          </View>
        </View>
      </View>

      {/* Calendar */}
      <Text style={styles.sectionTitle}>
        {language === 'fr' ? '📅 Calendrier' : '📅 Calendar'}
      </Text>
      <CalendarView
        sessions={sessions}
        myUid={myUid}
        partnerUid={partnerUid}
        colors={colors}
        language={language}
        timezone={userProfile?.timezone}
      />

      <Text style={styles.sectionTitle}>{t.recentHistory}</Text>

      {/* Search bar */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: colors.cardBg, borderRadius: 12,
        paddingHorizontal: 12, marginBottom: 10,
        shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
      }}>
        <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={language === 'fr' ? 'Rechercher...' : 'Search...'}
          placeholderTextColor={colors.gray}
          style={{ flex: 1, fontSize: 14, color: colors.text, paddingVertical: 10 }}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={{ fontSize: 16, color: colors.gray }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {FILTER_OPTS.map(opt => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => setFilterPeriod(opt.key)}
            style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
              backgroundColor: filterPeriod === opt.key ? colors.primary : colors.cardBg,
              borderWidth: 1.5,
              borderColor: filterPeriod === opt.key ? colors.primary : colors.lightGray,
            }}
          >
            <Text style={{
              fontSize: 12, fontWeight: '700',
              color: filterPeriod === opt.key ? '#fff' : colors.textLight,
            }}>
              {language === 'fr' ? opt.labelFr : opt.labelEn}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20, marginBottom: 20 }} />}
    </View>
  );

  const handleReact = async (emoji: string) => {
    if (!reactingSession || !coupleId) return;
    try { await updateSessionReaction(coupleId, reactingSession.id, emoji); } catch {}
    setReactingSession(null);
  };

  const handleEditOpen = (session: PoopSession) => {
    const cur = session.duration ?? 0;
    setEditHour(String(Math.floor(cur / 3600)));
    setEditMin(String(Math.floor((cur % 3600) / 60)));
    setEditSec(String(cur % 60));
    setEditingSession(session);
  };

  const handleEditSave = async () => {
    if (!editingSession || !coupleId) return;
    const total = (parseInt(editHour, 10) || 0) * 3600
                + (parseInt(editMin,  10) || 0) * 60
                + (parseInt(editSec,  10) || 0);
    try { await updateSessionDuration(coupleId, editingSession.id, total); } catch {}
    setEditingSession(null);
  };

  const fr = language === 'fr';

  const inputStyle = {
    backgroundColor: colors.lightGray, borderRadius: 12, padding: 12,
    fontSize: 26, fontWeight: '800' as const, color: colors.secondary,
    width: 72, textAlign: 'center' as const,
  };
  const sepStyle = { fontSize: 26, fontWeight: '800' as const, color: colors.secondary, marginBottom: 18 };
  const subStyle = { fontSize: 11, color: colors.textLight, marginTop: 4 };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Edit duration modal */}
      <Modal visible={!!editingSession} transparent animationType="fade" onRequestClose={() => setEditingSession(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <View style={{ backgroundColor: colors.cardBg, borderRadius: 22, padding: 24, width: '100%' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.secondary, marginBottom: 18, textAlign: 'center' }}>
              ✏️ {fr ? 'Modifier la durée' : 'Edit duration'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <View style={{ alignItems: 'center' }}>
                <TextInput value={editHour} onChangeText={setEditHour} keyboardType="number-pad" style={inputStyle} maxLength={4} />
                <Text style={subStyle}>{fr ? 'heures' : 'hours'}</Text>
              </View>
              <Text style={sepStyle}>:</Text>
              <View style={{ alignItems: 'center' }}>
                <TextInput value={editMin} onChangeText={setEditMin} keyboardType="number-pad" style={inputStyle} maxLength={2} />
                <Text style={subStyle}>{fr ? 'min' : 'min'}</Text>
              </View>
              <Text style={sepStyle}>:</Text>
              <View style={{ alignItems: 'center' }}>
                <TextInput value={editSec} onChangeText={setEditSec} keyboardType="number-pad" style={inputStyle} maxLength={2} />
                <Text style={subStyle}>{fr ? 'sec' : 'sec'}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setEditingSession(null)} style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: colors.lightGray, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: colors.gray }}>{fr ? 'Annuler' : 'Cancel'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleEditSave} style={{ flex: 1, padding: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center' }}>
                <Text style={{ fontWeight: '800', color: colors.white }}>{fr ? 'Enregistrer' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <EmojiReactPicker
        visible={!!reactingSession}
        onSelect={handleReact}
        onClose={() => setReactingSession(null)}
      />
      <FlatList
        data={loading ? [] : filteredSessions}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>
                {searchQuery || filterPeriod !== 'all' ? '🔍' : '🚽'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery || filterPeriod !== 'all'
                  ? (language === 'fr' ? 'Aucun résultat' : 'No results')
                  : t.noHistory}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery || filterPeriod !== 'all'
                  ? (language === 'fr' ? 'Essaie un autre filtre' : 'Try a different filter')
                  : t.goFirst}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <SessionRow
            session={item}
            isMe={item.userId === myUid}
            language={language}
            t={t}
            colors={colors}
            onReact={item.userId !== myUid ? () => setReactingSession(item) : undefined}
            onEditDuration={item.userId === myUid ? () => handleEditOpen(item) : undefined}
            onDelete={item.userId === myUid ? () => {
              Alert.alert(
                fr ? 'Supprimer ce poop ?' : 'Delete this poop?',
                fr ? 'Cette action est irréversible.' : 'This cannot be undone.',
                [
                  { text: fr ? 'Annuler' : 'Cancel', style: 'cancel' },
                  { text: fr ? 'Supprimer' : 'Delete', style: 'destructive', onPress: async () => {
                    if (!coupleId) return;
                    try { await deletePoopSession(coupleId, item.id); } catch {}
                  }},
                ],
              );
            } : undefined}
          />
        )}
      />
    </SafeAreaView>
  );
}

function SessionRow({ session, isMe, language, t, colors, onReact, onEditDuration, onDelete }: {
  session: PoopSession; isMe: boolean; language: Language;
  t: ReturnType<typeof getT>; colors: ColorScheme;
  onReact?: () => void;
  onEditDuration?: () => void;
  onDelete?: () => void;
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
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.secondary }}>{session.userName}</Text>
          <Text style={{ fontSize: 11, color: colors.textLight }}>{formatDate(session.startTime, language)}</Text>
          {session.location?.address && (
            <Text style={{ fontSize: 10, color: colors.gray, maxWidth: 180 }} numberOfLines={1}>
              📍 {session.location.address}
            </Text>
          )}
          {/* Quality display */}
          {isMe && session.quality ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <Text style={{ fontSize: 11 }}>{'💩'.repeat(session.quality)}</Text>
              {session.tag ? (
                <Text style={{ fontSize: 10, color: colors.primary, fontWeight: '700' }}>
                  · {session.tag}
                </Text>
              ) : null}
            </View>
          ) : null}
          {/* Reaction / React button */}
          {session.reaction ? (
            <Text style={{ fontSize: 18, marginTop: 2 }}>{session.reaction}</Text>
          ) : !isMe && onReact ? (
            <TouchableOpacity onPress={onReact} style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>
                {language === 'fr' ? '➕ Réagir' : '➕ React'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: colors.primary }}>{formatDuration(session.duration)}</Text>
        <Text style={{ fontSize: 10, color: colors.textLight }}>{t.durationLabel}</Text>
        {onEditDuration && (
          <TouchableOpacity onPress={onEditDuration} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 16 }}>✏️</Text>
          </TouchableOpacity>
        )}
        {onDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={{ fontSize: 16 }}>🗑️</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: 16, paddingTop: 16 },
    listContent: { paddingHorizontal: 16, paddingBottom: 32 },
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
    sectionTitle: { fontSize: 16, fontWeight: '700', color: c.secondary, marginBottom: 10, marginTop: 4 },
    ringCard: {
      flexDirection: 'row', backgroundColor: c.cardBg, borderRadius: 16, padding: 16,
      marginBottom: 10, alignItems: 'center', justifyContent: 'space-around',
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    },
    ringLabel: { fontSize: 11, fontWeight: '700', color: c.textLight, marginBottom: 10, textAlign: 'center' },
    monthCard: {
      backgroundColor: c.cardBg, borderRadius: 16, padding: 16, marginBottom: 10,
      shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyEmoji: { fontSize: 64, marginBottom: 12 },
    emptyText: { fontSize: 16, fontWeight: '600', color: c.secondary, textAlign: 'center' },
    emptySubtext: { fontSize: 13, color: c.textLight, marginTop: 6 },
  });
}
