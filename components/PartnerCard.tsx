import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PoopAnimation } from './PoopAnimation';
import { ActiveSession } from '@/lib/database';
import { Colors } from '@/constants/Colors';
import { getT } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

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
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}min ${s.toString().padStart(2, '0')}s` : `${s}s`;
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
}: Props) {
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

      <Text style={styles.name}>{emoji} {name}</Text>
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
    minHeight: 260,
  },
  cardActive: {
    borderColor: Colors.primaryLight,
    backgroundColor: '#FFFBF0',
    shadowOpacity: 0.18,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger + '22',
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
    backgroundColor: Colors.danger,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.danger,
    letterSpacing: 1.5,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  who: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  timerBox: {
    alignItems: 'center',
    backgroundColor: Colors.accent + '40',
    borderRadius: 14,
    padding: 10,
    width: '100%',
    marginVertical: 6,
  },
  timerLabel: { fontSize: 11, color: Colors.textLight },
  timerValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.secondary,
    marginTop: 2,
  },
  location: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 4,
    maxWidth: '90%',
    textAlign: 'center',
  },
  idle: { fontSize: 13, color: Colors.gray, marginVertical: 8 },
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
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
  },
  btnStop: {
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
  },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
