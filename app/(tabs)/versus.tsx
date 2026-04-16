import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  SafeAreaView, TouchableOpacity, Animated,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { useColors } from '@/lib/useColors';
import { useHistory } from '@/lib/useHistory';
import { unlockAchievement } from '@/lib/database';
import { AnimatedNumber } from '@/components/AnimatedNumber';
import { CircularProgress } from '@/components/CircularProgress';
import { RingChart } from '@/components/RingChart';
import { getT } from '@/lib/i18n';
import type { ColorScheme } from '@/constants/Colors';
import type { PoopSession } from '@/lib/database';

// ─── Placeholder sections (filled in next steps) ─────────────────────────────

function VersusContent(_p: { sessions: PoopSession[]; myUid: string; partnerUid: string; myTz: string; partnerTz: string; language: string; myName: string; partnerName: string; colors: ColorScheme }) {
  return <Text style={{ color: _p.colors.textLight, textAlign: 'center', marginTop: 40 }}>Versus (à remplir)</Text>;
}

function GamesContent(_p: { sessions: PoopSession[]; myUid: string; partnerUid: string; tz: string; language: string; myName: string; partnerName: string; userEmoji: string; achievements: Record<string, boolean>; colors: ColorScheme }) {
  return <Text style={{ color: _p.colors.textLight, textAlign: 'center', marginTop: 40 }}>Défis (à remplir)</Text>;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function VersusScreen() {
  const { userProfile } = useAuth();
  const colors = useColors();
  const { sessions, loading } = useHistory();
  const language = userProfile?.language ?? 'fr';
  const fr = language === 'fr';

  const [view, setView] = useState<'versus' | 'games'>('versus');

  const myUid       = userProfile?.uid ?? '';
  const partnerUid  = userProfile?.partnerId ?? '';
  const myTz        = userProfile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const partnerTz   = userProfile?.partnerTimezone || myTz;
  const myName      = userProfile?.displayName ?? 'Moi';
  const partnerName = userProfile?.partnerName ?? '?';

  const s = useMemo(() => makeStyles(colors), [colors]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      {/* Pill switcher */}
      <View style={s.switcherWrap}>
        <TouchableOpacity
          style={[s.pill, view === 'versus' && { backgroundColor: colors.primary }]}
          onPress={() => setView('versus')}
          activeOpacity={0.8}
        >
          <Text style={[s.pillText, view === 'versus' && { color: colors.white }]}>⚔️ Versus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.pill, view === 'games' && { backgroundColor: colors.primary }]}
          onPress={() => setView('games')}
          activeOpacity={0.8}
        >
          <Text style={[s.pillText, view === 'games' && { color: colors.white }]}>🎮 {fr ? 'Défis' : 'Challenges'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {view === 'versus' ? (
          <VersusContent
            sessions={sessions} myUid={myUid} partnerUid={partnerUid}
            myTz={myTz} partnerTz={partnerTz} language={language}
            myName={myName} partnerName={partnerName} colors={colors}
          />
        ) : (
          <GamesContent
            sessions={sessions} myUid={myUid} partnerUid={partnerUid}
            tz={myTz} language={language} myName={myName} partnerName={partnerName}
            userEmoji={userProfile?.emoji ?? '😊'}
            achievements={userProfile?.achievements ?? {}}
            colors={colors}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ColorScheme) {
  return StyleSheet.create({
    safe:        { flex: 1, backgroundColor: c.background },
    switcherWrap: {
      flexDirection: 'row', margin: 16, marginBottom: 0,
      backgroundColor: c.lightGray, borderRadius: 14, padding: 4,
    },
    pill: {
      flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center',
    },
    pillText: { fontSize: 14, fontWeight: '700', color: c.gray },
    content:     { padding: 16, paddingBottom: 40 },
  });
}
