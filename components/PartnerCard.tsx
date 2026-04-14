import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PoopAnimation } from './PoopAnimation';
import { ActiveSession } from '@/lib/database';
import { useColors } from '@/lib/useColors';
import { getT } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';
import type { ColorScheme } from '@/constants/Colors';

interface Props {
  name: string;
  emoji: string;
  poopEmoji?: string;
  isMe: boolean;
  active: boolean;
  session?: ActiveSession;
  elapsedSeconds?: number;
  language?: Language;
  onStartPoop?: () => void;
  onEndPoop?: () => void;
  isFirstToday?: boolean;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}min ${s.toString().padStart(2, '0')}s` : `${s}s`;
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.cardBg,
      borderRadius: 24,
      padding: 20,
      alignItems: 'center',
      flex: 1,
      marginHorizontal: 6,
      borderWidth: 2,
      borderColor: 'transparent',
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 12,
      elevation: 3,
      minHeight: 260,
    },
    cardActive: {
      borderColor: c.primaryLight,
      backgroundColor: c.primaryLight,
      shadowOpacity: 0.18,
    },
    liveTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.danger + '22',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginBottom: 8,
      gap: 5,
    },
    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: c.danger,
    },
    liveText: {
      fontSize: 10,
      fontWeight: '800',
      color: c.danger,
      letterSpacing: 1.5,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
      gap: 4,
    },
    name: {
      fontSize: 16,
      fontWeight: '700',
      color: c.secondary,
      textAlign: 'center',
    },
    firstBadge: {
      fontSize: 14,
    },
    who: {
      fontSize: 12,
      color: c.textLight,
      marginBottom: 8,
    },
    timerBox: {
      alignItems: 'center',
      backgroundColor: c.accent + '40',
      borderRadius: 14,
      padding: 10,
      width: '100%',
      marginVertical: 6,
    },
    timerLabel: { fontSize: 11, color: c.textLight },
    timerValue: {
      fontSize: 22,
      fontWeight: '800',
      color: c.secondary,
      marginTop: 2,
    },
    location: {
      fontSize: 11,
      color: c.textLight,
      marginTop: 4,
      maxWidth: '90%',
      textAlign: 'center',
    },
    idle: { fontSize: 13, color: c.gray, marginVertical: 8 },
    btn: {
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 11,
      alignItems: 'center',
      marginTop: 10,
      width: '100%',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.22,
      shadowRadius: 6,
      elevation: 3,
    },
    btnStart: {
      backgroundColor: c.primary,
      shadowColor: c.primary,
    },
    btnStop: {
      backgroundColor: c.success,
      shadowColor: c.success,
    },
    btnText: { color: c.white, fontWeight: '700', fontSize: 14 },
  });
}

export function PartnerCard({
  name,
  emoji,
  poopEmoji = '💩',
  isMe,
  active,
  session,
  elapsedSeconds = 0,
  language = 'fr',
  onStartPoop,
  onEndPoop,
  isFirstToday = false,
}: Props) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const t = getT(language);

  return (
    <View style={[styles.card, active && styles.cardActive]}>
      {active && (
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{t.liveLabel}</Text>
        </View>
      )}

      <PoopAnimation active={active} size={isMe ? 70 : 56} poopEmoji={poopEmoji} />

      <View style={styles.nameRow}>
        <Text style={styles.name}>{emoji} {name}</Text>
        {isFirstToday && <Text style={styles.firstBadge}>🥇</Text>}
      </View>
      <Text style={styles.who}>{isMe ? t.me : t.myLove}</Text>

      {active ? (
        <View style={styles.timerBox}>
          <Text style={styles.timerLabel}>{t.poopingSince}</Text>
          <Text style={styles.timerValue}>{formatDuration(elapsedSeconds)}</Text>
          {session?.location?.address && (
            <Text style={styles.location} numberOfLines={1}>
              📍 {session.location.address}
            </Text>
          )}
        </View>
      ) : (
        <Text style={styles.idle}>{t.notPooping}</Text>
      )}

      {isMe && (
        <TouchableOpacity
          style={[styles.btn, active ? styles.btnStop : styles.btnStart]}
          onPress={active ? onEndPoop : onStartPoop}
        >
          <Text style={styles.btnText}>
            {active ? t.endBtn : t.startBtn}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
