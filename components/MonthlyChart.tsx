import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
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

const MAX_BAR_H = 64;
const BAR_W = 6;
const COL_W = 18;

export function MonthlyChart({
  sessions, myUid, partnerUid, myName, partnerName, colors, language, timezone,
}: Props) {
  const today = getLocalToday(timezone);
  const [y, m] = today.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthStr = String(m).padStart(2, '0');

  const data = useMemo(() =>
    Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0');
      const date = `${y}-${monthStr}-${day}`;
      return {
        day: i + 1,
        date,
        myCount: sessions.filter(s => s.userId === myUid && s.date === date).length,
        partnerCount: sessions.filter(s => s.userId === partnerUid && s.date === date).length,
      };
    }),
    [sessions, myUid, partnerUid, y, monthStr, daysInMonth],
  );

  const maxCount = Math.max(...data.map(d => d.myCount + d.partnerCount), 1);
  const fr = language === 'fr';

  return (
    <View>
      {/* Legend */}
      <View style={{ flexDirection: 'row', gap: 14, marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.primary }} />
          <Text style={{ fontSize: 11, color: colors.textLight, fontWeight: '600' }}>{myName}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: colors.primaryLight }} />
          <Text style={{ fontSize: 11, color: colors.textLight, fontWeight: '600' }}>{partnerName}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: MAX_BAR_H + 28, gap: 3, paddingHorizontal: 2 }}>
          {data.map(({ day, date, myCount, partnerCount }) => {
            const isToday = date === today;
            const isFuture = date > today;
            const myH = myCount > 0 ? Math.max(5, (myCount / maxCount) * MAX_BAR_H) : 0;
            const partnerH = partnerCount > 0 ? Math.max(5, (partnerCount / maxCount) * MAX_BAR_H) : 0;
            const isEmpty = myCount === 0 && partnerCount === 0;

            return (
              <View key={day} style={{ alignItems: 'center', width: COL_W }}>
                {/* Bars */}
                <View style={{ height: MAX_BAR_H, flexDirection: 'row', alignItems: 'flex-end', gap: 1 }}>
                  <View style={{
                    width: BAR_W,
                    height: isEmpty ? 3 : myH || 3,
                    borderRadius: 3,
                    backgroundColor: myH ? colors.primary : colors.lightGray,
                    opacity: isFuture ? 0.25 : 1,
                  }} />
                  <View style={{
                    width: BAR_W,
                    height: isEmpty ? 3 : partnerH || 3,
                    borderRadius: 3,
                    backgroundColor: partnerH ? colors.primaryLight : colors.lightGray,
                    opacity: isFuture ? 0.25 : 1,
                  }} />
                </View>

                {/* Day number */}
                <Text style={{
                  fontSize: 8,
                  marginTop: 3,
                  color: isToday ? colors.primary : colors.gray,
                  fontWeight: isToday ? '900' : '400',
                }}>
                  {day}
                </Text>
                {isToday && (
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 1 }} />
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
