import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/lib/auth-context';
import { Colors } from '@/constants/Colors';

export default function ProfileScreen() {
  const { userProfile, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Se déconnecter ?',
      'Tu devras te reconnecter ensuite.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se déconnecter', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `💩 Rejoins-moi sur PoopTracker ! Mon code couple : ${userProfile?.coupleCode}\n\nTélécharge l'app et entre ce code !`,
      });
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>⚙️ Profil</Text>

        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <Text style={styles.avatar}>{userProfile?.emoji}</Text>
          <Text style={styles.name}>{userProfile?.displayName}</Text>
          <Text style={styles.coupled}>
            {userProfile?.partnerId
              ? `💞 Lié(e) avec ${userProfile.partnerName}`
              : '🔗 Pas encore lié(e)'}
          </Text>
        </View>

        {/* Couple code */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Mon code couple</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeValue}>{userProfile?.coupleCode}</Text>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤 Partager mon code</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Comment ça marche ?</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="1️⃣" text="Inscris-toi et partage ton code couple" />
            <InfoRow icon="2️⃣" text="Ton/ta partenaire entre ton code dans l'app" />
            <InfoRow icon="3️⃣" text="Appuie sur 💩 quand tu vas aux toilettes" />
            <InfoRow icon="4️⃣" text="L'autre voit l'animation en temps réel !" />
            <InfoRow icon="5️⃣" text="Appuie sur ✅ quand tu as fini" />
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut}>
          <Text style={styles.logoutText}>🚪 Se déconnecter</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>PoopTracker v1.0.0 💩</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoIcon}>{icon}</Text>
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.secondary,
    marginBottom: 20,
    paddingTop: 8,
  },
  avatarCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  avatar: { fontSize: 72, marginBottom: 10 },
  name: { fontSize: 24, fontWeight: '800', color: Colors.secondary, marginBottom: 4 },
  coupled: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  codeBox: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  codeValue: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.secondary,
    letterSpacing: 8,
  },
  shareBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  shareBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  infoCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoIcon: { fontSize: 18, width: 26 },
  infoText: { fontSize: 13, color: Colors.text, flex: 1, lineHeight: 20 },
  logoutBtn: {
    backgroundColor: Colors.lightGray,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  logoutText: { color: Colors.danger, fontWeight: '700', fontSize: 15 },
  footer: {
    textAlign: 'center',
    color: Colors.gray,
    fontSize: 12,
    marginTop: 8,
  },
});
