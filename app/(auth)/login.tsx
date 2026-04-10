import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Colors } from '@/constants/Colors';

const EMOJIS = ['😊', '🤠', '🐻', '🦊', '🐱', '🐶', '🦁', '🐼', '🐸', '🐨'];

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('😊');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Oups!', 'Remplis tous les champs 😅');
      return;
    }
    if (isSignUp && !displayName) {
      Alert.alert('Oups!', 'Choisis un prénom ou surnom 😊');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, displayName, selectedEmoji);
        router.replace('/(auth)/pair');
      } else {
        await signIn(email, password);
        router.replace('/');
      }
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use' ? 'Email déjà utilisé 📧' :
        err.code === 'auth/wrong-password' ? 'Mauvais mot de passe 🔐' :
        err.code === 'auth/user-not-found' ? 'Compte introuvable 🔍' :
        err.code === 'auth/weak-password' ? 'Mot de passe trop court (6+ caractères) 🔐' :
        'Une erreur est survenue. Réessaie !';
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>💩</Text>
        <Text style={styles.title}>PoopTracker</Text>
        <Text style={styles.subtitle}>L'app couple dont vous aviez besoin 😂</Text>

        <View style={styles.card}>
          {isSignUp && (
            <>
              <Text style={styles.label}>Ton prénom / surnom</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="ex: Chouchou 💕"
                placeholderTextColor={Colors.gray}
              />

              <Text style={styles.label}>Ton emoji</Text>
              <View style={styles.emojiRow}>
                {EMOJIS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.emojiBtn, selectedEmoji === e && styles.emojiBtnActive]}
                    onPress={() => setSelectedEmoji(e)}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="ton@email.com"
            placeholderTextColor={Colors.gray}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••"
            placeholderTextColor={Colors.gray}
            secureTextEntry
          />

          <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.btnText}>
                {isSignUp ? '🚀 Créer mon compte' : '🔓 Se connecter'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.switchBtn}>
            <Text style={styles.switchText}>
              {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas encore de compte ? S'inscrire"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logo: { fontSize: 72, marginBottom: 8 },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.secondary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textLight,
    marginBottom: 32,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: Colors.cardBg,
    borderRadius: 24,
    padding: 24,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.secondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  emojiText: { fontSize: 22 },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
  switchBtn: { marginTop: 16, alignItems: 'center' },
  switchText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
