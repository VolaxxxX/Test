import React, { useState, useEffect } from 'react';
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
import { getT } from '@/lib/i18n';

export default function PairScreen() {
  const { userProfile, signOut } = useAuth();
  const router = useRouter();
  const [partnerCode, setPartnerCode] = useState('');
  const [loading, setLoading] = useState(false);

  const t = getT(userProfile?.language ?? 'fr');

  // User B passive flow: when User A pairs with us, our partnerId is written
  // to RTDB → subscribeToProfile fires → userProfile updates → navigate here.
  const partnerId = userProfile?.partnerId;
  useEffect(() => {
    if (partnerId) {
      router.replace('/(tabs)');
    }
  }, [partnerId]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `💩 PoopTracker — ${t.myCodeLabel}: ${userProfile?.coupleCode}`,
        title: 'PoopTracker',
      });
    } catch {}
  };

  const handlePair = async () => {
    if (!userProfile) return;
    const code = partnerCode.trim().toUpperCase();
    if (code.length !== 6) {
      Alert.alert(t.errLabel, t.invalidCode);
      return;
    }
    if (code === userProfile.coupleCode) {
      Alert.alert('🙃', t.selfPair);
      return;
    }

    setLoading(true);
    try {
      const partner = await findUserByCode(code);
      if (!partner) {
        Alert.alert(t.notFoundLabel, t.codeNotFound);
        return;
      }
      // Prevent overwriting an existing pairing on the partner's side.
      if (partner.partnerId && partner.partnerId !== userProfile.uid) {
        Alert.alert(
          t.errLabel,
          userProfile.language === 'fr'
            ? "Ce compte est déjà lié à quelqu'un d'autre."
            : 'This account is already linked with someone else.',
        );
        return;
      }
      await pairCouple(
        userProfile.uid, partner.uid,
        partner.displayName, userProfile.displayName,
        userProfile.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        partner.timezone ?? '',
      );
      // subscribeToProfile fires automatically — no manual refresh needed.
      Alert.alert(
        '🎉',
        `${partner.emoji} ${partner.displayName}`,
        [{ text: "Let's go ! 💩", onPress: () => router.replace('/(tabs)') }]
      );
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      Alert.alert(t.errLabel, msg || t.pairError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.logo}>💩💞</Text>
      <Text style={styles.title}>{t.pairTitle}</Text>
      <Text style={styles.subtitle}>{t.pairSubtitle}</Text>

      {/* My code */}
      <View style={styles.myCodeCard}>
        <Text style={styles.myCodeLabel}>{t.myCodeLabel}</Text>
        <Text style={styles.myCodeValue}>{userProfile?.coupleCode}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>{t.shareCodeBtn}</Text>
        </TouchableOpacity>
      </View>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>{t.orEnterCode}</Text>
        <View style={styles.divider} />
      </View>

      {/* Partner code input */}
      <View style={styles.card}>
        <Text style={styles.label}>{t.partnerCodeLabel}</Text>
        <TextInput
          style={styles.codeInput}
          value={partnerCode}
          onChangeText={(v) => setPartnerCode(v.toUpperCase())}
          placeholder={t.partnerCodePlaceholder}
          placeholderTextColor={Colors.gray}
          maxLength={6}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.btn} onPress={handlePair} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.btnText}>{t.linkBtn}</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
        <Text style={styles.logoutText}>{t.signOutLink}</Text>
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
