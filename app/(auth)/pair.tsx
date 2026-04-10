import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { findUserByCode, pairCouple } from '@/lib/database';
import { Colors } from '@/constants/Colors';

export default function PairScreen() {
  const { userProfile, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const [partnerCode, setPartnerCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `💩 Rejoins-moi sur PoopTracker ! Mon code couple : ${userProfile?.coupleCode}\n\nTélécharge l'app et entre ce code pour qu'on soit liés !`,
        title: 'Mon code PoopTracker',
      });
    } catch {}
  };

  const handlePair = async () => {
    const code = partnerCode.trim().toUpperCase();
    if (code.length !== 6) {
      Alert.alert('Code invalide', 'Le code doit faire 6 caractères 🔢');
      return;
    }
    if (code === userProfile?.coupleCode) {
      Alert.alert('Hé !', 'Tu ne peux pas te lier à toi-même 😄');
      return;
    }

    setLoading(true);
    try {
      const partner = await findUserByCode(code);
      if (!partner) {
        Alert.alert('Introuvable', "Aucun compte avec ce code 🔍\nVérifie avec ton/ta partenaire !");
        return;
      }
      await pairCouple(userProfile!.uid, partner.uid, partner.displayName, userProfile!.displayName);
      await refreshProfile();
      Alert.alert(
        '🎉 Couplé !',
        `Tu es maintenant lié(e) à ${partner.emoji} ${partner.displayName} !`,
        [{ text: "Let's go ! 💩", onPress: () => router.replace('/(tabs)') }]
      );
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de se lier. Réessaie !');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logo}>💩💞</Text>
      <Text style={styles.title}>Lier avec ton/ta partenaire</Text>
      <Text style={styles.subtitle}>
        Partagez vos codes pour vous connecter !
      </Text>

      {/* My code */}
      <View style={styles.myCodeCard}>
        <Text style={styles.myCodeLabel}>Ton code à partager</Text>
        <Text style={styles.myCodeValue}>{userProfile?.coupleCode}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>📤 Partager mon code</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>ou entre le code de l'autre</Text>
        <View style={styles.divider} />
      </View>

      {/* Partner code input */}
      <View style={styles.card}>
        <Text style={styles.label}>Code de ton/ta partenaire</Text>
        <TextInput
          style={styles.codeInput}
          value={partnerCode}
          onChangeText={(t) => setPartnerCode(t.toUpperCase())}
          placeholder="EX: AB3DE9"
          placeholderTextColor={Colors.gray}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.btn} onPress={handlePair} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.btnText}>💞 Me lier à mon partenaire</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  logo: { fontSize: 64, marginBottom: 8 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.secondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 28,
  },
  myCodeCard: {
    width: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  myCodeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 8,
  },
  myCodeValue: {
    fontSize: 36,
    fontWeight: '900',
    color: Colors.secondary,
    letterSpacing: 6,
    marginBottom: 16,
  },
  shareBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  shareBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
    gap: 10,
  },
  divider: { flex: 1, height: 1, backgroundColor: Colors.lightGray },
  dividerText: { color: Colors.textLight, fontSize: 13, fontWeight: '500' },
  card: {
    width: '100%',
    backgroundColor: Colors.cardBg,
    borderRadius: 20,
    padding: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 8,
  },
  codeInput: {
    backgroundColor: Colors.lightGray,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 8,
    textAlign: 'center',
    marginBottom: 8,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  logoutBtn: { marginTop: 24 },
  logoutText: { color: Colors.textLight, fontSize: 14 },
});
