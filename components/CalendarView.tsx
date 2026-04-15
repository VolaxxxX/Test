import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ColorScheme } from '@/constants/Colors';
import type { PoopSession } from '@/lib/database';
import type { Language } from '@/lib/i18n';

interface Props {
  sessions: PoopSession[];
  myUid: string;
  partnerUid: string;
  colors: ColorScheme;
  language: Language;
  timezone?: string;
}

function toLocalDate(ts: number, tz: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(ts));
  } catch {
    return new Date(ts).toISOString().split('T')[0];
  }
}

export function CalendarView({ sessions, myUid, partnerUid, colors, language, timezone }: Props) {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [current, setCurrent] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const locale = language === 'fr' ? 'fr-FR' : 'en-US';
  const dayHeaders = useMemo(() => {
    const base = new Date(2024, 0, 1); // Monday Jan 1 2024
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(1 + i);
      return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d).slice(0, 2);
    });
  }, [locale]);

  // Build day map for this month
  const dayMap = useMemo(() => {
    const map: Record<string, { mine: number; partner: number }> = {};
    for (const s of sessions) {
      const date = s.date || toLocalDate(s.startTime, tz);
      if (!map[date]) map[date] = { mine: 0, partner: 0 };
      if (s.userId === myUid) map[date].mine++;
      else if (s.userId === partnerUid) map[date].partner++;
    }
    return map;
  }, [sessions, myUid, partnerUid, tz]);

  const { year, month } = current;
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Monday-first offset (0=Mon … 6=Sun)
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(firstDay);

  const prevMonth = () => {
    setCurrent(c => {
      if (c.month === 0) return { year: c.year - 1, month: 11 };
      return { year: c.year, month: c.month - 1 };
    });
  };
  const nextMonth = () => {
    const now = new Date();
    if (current.year > now.getFullYear() || (current.year === now.getFullYear() && current.month >= now.getMonth())) return;
    setCurrent(c => {
      if (c.month === 11) return { year: c.year + 1, month: 0 };
      return { year: c.year, month: c.month + 1 };
    });
  };

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const s = makeStyles(colors);

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
          <Text style={s.navText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.monthLabel}>{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</Text>
        <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
          <Text style={s.navText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day headers */}
      <View style={s.row}>
        {dayHeaders.map(d => (
          <Text key={d} style={s.dayHeader}>{d}</Text>
        ))}
      </View>

      {/* Weeks */}
      {Array.from({ length: cells.length / 7 }, (_, week) => (
        <View key={week} style={s.row}>
          {cells.slice(week * 7, week * 7 + 7).map((day, i) => {
            if (!day) return <View key={i} style={s.cell} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const data = dayMap[dateStr];
            const isToday = dateStr === todayStr;
            const hasMine = (data?.mine ?? 0) > 0;
            const hasPartner = (data?.partner ?? 0) > 0;
            const total = (data?.mine ?? 0) + (data?.partner ?? 0);

            return (
              <View key={i} style={[s.cell, isToday && s.todayCell]}>
                <Text style={[s.dayNum, isToday && s.todayNum, total > 0 && s.activeNum]}>
                  {day}
                </Text>
                {total > 0 && (
                  <View style={s.dotsRow}>
                    {hasMine && <View style={[s.dot, { backgroundColor: colors.primary }]} />}
                    {hasPartner && <View style={[s.dot, { backgroundColor: colors.primaryLight }]} />}
                  </View>
                )}
                {total > 0 && (
                  <View style={[
                    s.badge,
                    hasMine && hasPartner ? { backgroundColor: colors.accent } :
                    hasMine ? { backgroundColor: colors.primary } :
                    { backgroundColor: colors.primaryLight },
                  ]}>
                    <Text style={[s.badgeText, { color: hasMine && hasPartner ? colors.secondary : colors.white }]}>
                      {total}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.dot, { backgroundColor: colors.primary }]} />
          <Text style={s.legendText}>{language === 'fr' ? 'Moi' : 'Me'}</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.dot, { backgroundColor: colors.primaryLight }]} />
          <Text style={s.legendText}>{language === 'fr' ? 'Partenaire' : 'Partner'}</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.dot, { backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.gray }]} />
          <Text style={s.legendText}>{language === 'fr' ? 'Tous les deux' : 'Both'}</Text>
        </View>
      </View>
    </View>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: c.cardBg,
      borderRadius: 20,
      padding: 16,
      marginBottom: 14,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    navBtn: { padding: 8 },
    navText: { fontSize: 24, color: c.primary, fontWeight: '700' },
    monthLabel: { fontSize: 16, fontWeight: '800', color: c.secondary },
    row: { flexDirection: 'row', marginBottom: 4 },
    dayHeader: {
      flex: 1, textAlign: 'center', fontSize: 11,
      fontWeight: '700', color: c.textLight, marginBottom: 4,
    },
    cell: { flex: 1, alignItems: 'center', minHeight: 46, paddingVertical: 2 },
    todayCell: {
      backgroundColor: c.accent,
      borderRadius: 10,
    },
    dayNum: { fontSize: 13, color: c.text, fontWeight: '500' },
    todayNum: { color: c.secondary, fontWeight: '800' },
    activeNum: { fontWeight: '700' },
    dotsRow: { flexDirection: 'row', gap: 2, marginTop: 1 },
    dot: { width: 5, height: 5, borderRadius: 3 },
    badge: {
      minWidth: 16, height: 16, borderRadius: 8,
      justifyContent: 'center', alignItems: 'center',
      paddingHorizontal: 4, marginTop: 1,
    },
    badgeText: { fontSize: 9, fontWeight: '800' },
    legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 16,
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: c.lightGray,
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendText: { fontSize: 11, color: c.textLight },
  });
}
