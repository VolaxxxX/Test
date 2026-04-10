import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { subscribeToHistory, getCoupleId, PoopSession } from '@/lib/database';
import { Colors } from '@/constants/Colors';

function formatDuration(seconds?: number): string {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}min ${s.toString().padStart(2, '0')}s` : `${s}s`;
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(ts));
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

export default function HistoryScreen() {
  const { userProfile } = useAuth();
  const [sessions, setSessions] = useState<PoopSession[]>([]);
  const [loading, setLoading] = useState(true);

  const coupleId =
    userProfile?.uid && userProfile?.partnerId
      ? getCoupleId(userProfile.uid, userProfile.partnerId)
      : null;

  useEffect(() => {
    if (!coupleId) return;
    const unsub = subscribeToHistory(coupleId, (data) => {
      setSessions(data);
      setLoading(false);
    });
    return unsub;
  }, [coupleId]);

  const today = getToday();
  const myTodayCount = sessions.filter((s) => s.userId === userProfile?.uid && s.date === today).length;
  const partnerTodayCount = sessions.filter((s) => s.userId === userProfile?.partnerId && s.date === today).length;
  const totalToday = myTodayCount + partnerTodayCount;

  const myAllTime = sessions.filter((s) => s.userId === userProfile?.uid).length;
  const partnerAllTime = sessions.filter((s) => s.userId === userProfile?.partnerId).length;

  const myAvgDuration =
    sessions.filter((s) => s.userId === userProfile?.uid && s.duration).reduce((a, s) => a + (s.duration ?? 0), 0) /
    (myAllTime || 1);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>📊 Statistiques</Text>

        {/* Today counter */}
        <View style={styles.todayCard}>
          <Text style={styles.todayLabel}>Aujourd'hui</Text>
          <Text style={styles.todayCount}>{totalToday}</Text>
          <Text style={styles.todaySubLabel}>poop au total 💩</Text>
          <View style={styles.todayRow}>
            <View style={styles.todayItem}>
              <Text style={styles.todayItemEmoji}>{userProfile?.emoji}</Text>
              <Text style={styles.todayItemName}>{userProfile?.displayName}</Text>
              <Text style={styles.todayItemCount}>{myTodayCount} 💩</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayItem}>
              <Text style={styles.todayItemEmoji}>💞</Text>
              <Text style={styles.todayItemName}>{userProfile?.partnerName ?? 'Partenaire'}</Text>
              <Text style={styles.todayItemCount}>{partnerTodayCount} 💩</Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🏆</Text>
            <Text style={styles.statValue}>{myAllTime}</Text>
            <Text style={styles.statLabel}>Mes poops</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⏱️</Text>
            <Text style={styles.statValue}>{formatDuration(Math.round(myAvgDuration))}</Text>
            <Text style={styles.statLabel}>Durée moy.</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💞</Text>
            <Text style={styles.statValue}>{partnerAllTime}</Text>
            <Text style={styles.statLabel}>Ses poops</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Historique récent</Text>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
        ) : sessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🚽</Text>
            <Text style={styles.emptyText}>Aucun poop enregistré pour l'instant !</Text>
            <Text style={styles.emptySubtext}>Allez, qui sera le premier ? 😄</Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1 }}
            renderItem={({ item }) => (
              <SessionRow session={item} isMe={item.userId === userProfile?.uid} />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function SessionRow({ session, isMe }: { session: PoopSession; isMe: boolean }) {
  return (
    <View style={[styles.row, isMe ? styles.rowMe : styles.rowPartner]}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowEmoji}>{session.userEmoji}</Text>
        <View>
          <Text style={styles.rowName}>{session.userName}</Text>
          <Text style={styles.rowDate}>{formatDate(session.startTime)}</Text>
          {session.location?.address && (
            <Text style={styles.rowLocation} numberOfLines={1}>
              📍 {session.location.address}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowDuration}>{formatDuration(session.duration)}</Text>
        <Text style={styles.rowDurationLabel}>durée</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.secondary,
    marginBottom: 16,
    paddingTop: 8,
  },
  todayCard: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  todayLabel: { fontSize: 13, fontWeight: '600', color: Colors.secondary, marginBottom: 2 },
  todayCount: { fontSize: 56, fontWeight: '900', color: Colors.secondary },
  todaySubLabel: { fontSize: 14, color: Colors.secondary, marginBottom: 14, opacity: 0.8 },
  todayRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around' },
  todayItem: { alignItems: 'center', flex: 1 },
  todayDivider: { width: 1, backgroundColor: Colors.secondary, opacity: 0.2 },
  todayItemEmoji: { fontSize: 22 },
  todayItemName: { fontSize: 12, fontWeight: '600', color: Colors.secondary, marginTop: 2 },
  todayItemCount: { fontSize: 16, fontWeight: '800', color: Colors.secondary },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.secondary },
  statLabel: { fontSize: 11, color: Colors.textLight, marginTop: 2, textAlign: 'center' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.secondary,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  rowMe: { borderLeftColor: Colors.primary },
  rowPartner: { borderLeftColor: Colors.primaryLight },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rowEmoji: { fontSize: 26 },
  rowName: { fontSize: 13, fontWeight: '700', color: Colors.secondary },
  rowDate: { fontSize: 11, color: Colors.textLight },
  rowLocation: { fontSize: 10, color: Colors.gray, maxWidth: 180 },
  rowRight: { alignItems: 'flex-end' },
  rowDuration: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  rowDurationLabel: { fontSize: 10, color: Colors.textLight },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 64, marginBottom: 12 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.secondary, textAlign: 'center' },
  emptySubtext: { fontSize: 13, color: Colors.textLight, marginTop: 6 },
});
