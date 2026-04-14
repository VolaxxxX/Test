import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '@/lib/useColors';
import { useAuth } from '@/lib/auth-context';
import { getT } from '@/lib/i18n';
import type { ColorScheme } from '@/constants/Colors';

interface Props {
  data: number[]; // 7 values, index 0 = oldest day
  dayLabels: string[]; // 7 short day labels
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    container: {
      backgroundColor: c.cardBg,
      borderRadius: 18,
      padding: 16,
      marginBottom: 16,
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    label: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textLight,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 12,
    },
    chart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      height: 108,
    },
    barCol: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    barCount: {
      fontSize: 11,
      fontWeight: '700',
      color: c.secondary,
      marginBottom: 2,
    },
    bar: {
      width: '65%',
      borderRadius: 6,
      minHeight: 2,
    },
    barEmpty: {
      backgroundColor: c.lightGray,
    },
    dayLabel: {
      fontSize: 10,
      color: c.gray,
      marginTop: 4,
      fontWeight: '600',
    },
    dayLabelToday: {
      color: c.primary,
    },
    barPrimary: {
      backgroundColor: c.primary,
    },
    barPrimaryLight: {
      backgroundColor: c.primaryLight,
    },
  });
}

export function WeeklyChart({ data, dayLabels }: Props) {
  const { userProfile } = useAuth();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const t = getT(userProfile?.language ?? 'fr');
  const maxVal = Math.max(...data, 1);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t.weeklyLabel}</Text>
      <View style={styles.chart}>
        {data.map((val, i) => {
          const barHeight = Math.max((val / maxVal) * 80, val > 0 ? 8 : 2);
          const isToday = i === 6;
          return (
            <View key={i} style={styles.barCol}>
              {val > 0 && <Text style={styles.barCount}>{val}</Text>}
              <View
                style={[
                  styles.bar,
                  { height: barHeight },
                  isToday ? styles.barPrimary : styles.barPrimaryLight,
                  val === 0 && styles.barEmpty,
                ]}
              />
              <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                {dayLabels[i]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
