import React, { useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import type { ColorScheme } from '@/constants/Colors';
import type { Language } from '@/lib/i18n';

interface EventDef {
  emoji: string;
  nameFr: string;
  nameEn: string;
  /** "MM-DD" for recurring or "YYYY-MM-DD" for one-time */
  dateStr: string;
  recurring: boolean;
}

const EVENTS: EventDef[] = [
  { emoji: '🎂', nameFr: 'Son anniversaire', nameEn: "Her birthday", dateStr: '10-06', recurring: true },
  { emoji: '🎉', nameFr: 'Mon anniversaire', nameEn: 'My birthday', dateStr: '03-09', recurring: true },
  { emoji: '✈️', nameFr: 'Indonésie', nameEn: 'Indonesia trip', dateStr: '2026-05-20', recurring: false },
];

function daysUntil(dateStr: string, recurring: boolean): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let target: Date;
  if (recurring) {
    // "MM-DD"
    const [mm, dd] = dateStr.split('-').map(Number);
    target = new Date(today.getFullYear(), mm - 1, dd);
    if (target < today) {
      target = new Date(today.getFullYear() + 1, mm - 1, dd);
    }
  } else {
    // "YYYY-MM-DD"
    const [y, mm, dd] = dateStr.split('-').map(Number);
    target = new Date(y, mm - 1, dd);
  }

  const diff = target.getTime() - today.getTime();
  return Math.max(0, Math.round(diff / 86400000));
}

function urgencyColor(days: number, colors: ColorScheme): string {
  if (days === 0) return colors.danger;
  if (days <= 7) return '#E07B39';
  if (days <= 30) return colors.primary;
  return colors.secondary;
}

interface Props {
  colors: ColorScheme;
  language: Language;
}

export function CountdownCards({ colors, language }: Props) {
  const fr = language === 'fr';

  const cards = useMemo(() =>
    EVENTS.map(ev => ({
      emoji: ev.emoji,
      name: fr ? ev.nameFr : ev.nameEn,
      days: daysUntil(ev.dateStr, ev.recurring),
    })),
    [fr],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 2, gap: 10, paddingVertical: 2 }}
    >
      {cards.map((card, i) => {
        const accent = urgencyColor(card.days, colors);
        return (
          <View
            key={i}
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: 16,
              padding: 14,
              minWidth: 130,
              alignItems: 'center',
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 2,
              borderWidth: 1.5,
              borderColor: accent + '44',
            }}
          >
            <Text style={{ fontSize: 32, marginBottom: 6 }}>{card.emoji}</Text>
            <Text style={{
              fontSize: card.days === 0 ? 28 : 22,
              fontWeight: '900',
              color: accent,
              lineHeight: card.days === 0 ? 32 : 26,
            }}>
              {card.days === 0
                ? (fr ? "Aujourd'hui!" : 'Today!')
                : card.days.toString()}
            </Text>
            {card.days > 0 && (
              <Text style={{ fontSize: 11, color: colors.textLight, fontWeight: '600', marginTop: 1 }}>
                {fr ? 'jour' : 'day'}{card.days > 1 ? 's' : ''}
              </Text>
            )}
            <Text style={{
              fontSize: 11,
              color: colors.textLight,
              fontWeight: '700',
              marginTop: 6,
              textAlign: 'center',
            }}>
              {card.name}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
