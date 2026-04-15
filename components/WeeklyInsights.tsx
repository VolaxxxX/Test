import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import type { ColorScheme } from '@/constants/Colors';
import type { PoopSession } from '@/lib/database';
import type { Language } from '@/lib/i18n';

interface Props {
  sessions: PoopSession[];
  myUid: string;
  partnerUid: string;
  myName: string;
  partnerName: string;
  colors: ColorScheme;
  language: Language;
  timezone?: string;
}

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

export function WeeklyInsights({
  sessions, myUid, partnerUid, myName, partnerName, colors, language, timezone,
}: Props) {
  const fr = language === 'fr';

  const insights = useMemo(() => {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const thisWeek = getWeekDates(0, tz);
    const lastWeek = getWeekDates(1, tz);
    const mySessions = sessions.filter(s => s.userId === myUid);

    const thisWeekCount = mySessions.filter(s => thisWeek.includes(s.date)).length;
    const lastWeekCount = mySessions.filter(s => lastWeek.includes(s.date)).length;
    const partnerThisWeek = sessions.filter(s => s.userId === partnerUid && thisWeek.includes(s.date)).length;
    const diff = thisWeekCount - lastWeekCount;

    // Favorite hour (all-time)
    const hourCounts: Record<number, number> = {};
    for (const s of mySessions) {
      const h = new Date(s.startTime).getHours();
      hourCounts[h] = (hourCounts[h] ?? 0) + 1;
    }
    const bestHourEntry = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const bestHour = bestHourEntry ? parseInt(bestHourEntry[0]) : null;

    // Current streak
    const today = getLocalToday(tz);
    const dates = new Set(mySessions.map(s => s.date));
    let streak = 0;
    const cursor = new Date();
    if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const ds = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(cursor);
      if (dates.has(ds)) { streak++; cursor.setDate(cursor.getDate() - 1); }
      else break;
    }

    const rows: { icon: string; text: string; color: string }[] = [];

    // Week comparison
    rows.push({
      icon: diff > 0 ? '📈' : diff < 0 ? '📉' : '📊',
      text: fr
        ? `${thisWeekCount} poop${thisWeekCount > 1 ? 's' : ''} cette semaine (${diff > 0 ? '+' : ''}${diff} vs sem. dernière)`
        : `${thisWeekCount} poop${thisWeekCount > 1 ? 's' : ''} this week (${diff > 0 ? '+' : ''}${diff} vs last week)`,
      color: diff > 0 ? colors.success : diff < 0 ? colors.danger : colors.secondary,
    });

    // Who leads this week
    if (thisWeekCount > partnerThisWeek) {
      rows.push({ icon: '👑', text: fr ? `Tu mènes ${thisWeekCount}–${partnerThisWeek} cette semaine` : `You lead ${thisWeekCount}–${partnerThisWeek} this week`, color: colors.primary });
    } else if (partnerThisWeek > thisWeekCount) {
      rows.push({ icon: '😤', text: fr ? `${partnerName} mène ${partnerThisWeek}–${thisWeekCount} cette semaine` : `${partnerName} leads ${partnerThisWeek}–${thisWeekCount} this week`, color: colors.secondary });
    } else if (thisWeekCount > 0) {
      rows.push({ icon: '🤝', text: fr ? `Égalité ${thisWeekCount}–${partnerThisWeek} cette semaine` : `Tied ${thisWeekCount}–${partnerThisWeek} this week`, color: colors.secondary });
    }

    // Favorite hour
    if (bestHour !== null) {
      rows.push({
        icon: '⏰',
        text: fr ? `Ton heure de pointe : ${bestHour}h–${bestHour + 1}h` : `Your peak hour: ${bestHour}:00–${bestHour + 1}:00`,
        color: colors.secondary,
      });
    }

    // Streak
    if (streak > 0) {
      rows.push({
        icon: '🔥',
        text: fr ? `Streak actuel : ${streak} jour${streak > 1 ? 's' : ''}` : `Current streak: ${streak} day${streak > 1 ? 's' : ''}`,
        color: streak >= 7 ? colors.danger : colors.secondary,
      });
    }

    return rows;
  }, [sessions, myUid, partnerUid, timezone, fr]);

  return (
    <View style={{
      backgroundColor: colors.cardBg, borderRadius: 16, padding: 16, marginBottom: 10,
      shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    }}>
      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.secondary, marginBottom: 12, textAlign: 'center' }}>
        💡 {fr ? 'Insights de la semaine' : 'Weekly insights'}
      </Text>
      {insights.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: i < insights.length - 1 ? 10 : 0 }}>
          <Text style={{ fontSize: 20, width: 28 }}>{item.icon}</Text>
          <Text style={{ fontSize: 13, color: item.color, flex: 1, fontWeight: '600', lineHeight: 18 }}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}
