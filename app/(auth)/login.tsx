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
import { getT, POOP_EMOJIS } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';

const EMOJIS = ['😊', '🤠', '🐻', '🦊', '🐱', '🐶', '🦁', '🐼', '🐸', '🐨'];

export default function LoginScreen() {
  const { signIn, signUp, authError } = useAuth();
  const router = useRouter();

  const [language, setLanguage] = useState<Language>('fr');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('😊');
  const [selectedPoopEmoji, setSelectedPoopEmoji] = useState('💩');
  const [loading, setLoading] = useState(false);

  const t = getT(language);

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert(t.oops, t.fillFields);
      return;
    }
    if (isSignUp && !displayName) {
      Alert.alert(t.oops, t.chooseName);
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, displayName, selectedEmoji, selectedPoopEmoji, language);
        router.replace('/(auth)/pair');
      } else {
        await signIn(email, password);
        router.replace('/');
      }
    } catch (err: any) {
      const code: string = err?.code ?? '';
      const msg =
        code === 'auth/email-already-in-use'   ? t.emailUsed :
        // Firebase v9 uses 'wrong-password'; v10+ may use 'invalid-credential'
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'      ? t.wrongPassword :
        code === 'auth/user-not-found'          ? t.userNotFound :
        code === 'auth/weak-password'           ? t.weakPassword :
        code === 'auth/invalid-email'           ? (language === 'fr' ? 'Adresse email invalide.' : 'Invalid email address.') :
        code === 'auth/operation-not-allowed'   ? (language === 'fr' ? 'Connexion email désactivée. Active-la dans la Firebase Console.' : 'Email sign-in is disabled. Enable it in Firebase Console.') :
        code === 'auth/network-request-failed'  ? (language === 'fr' ? 'Erreur réseau. Vérifie ta connexion.' : 'Network error. Check your connection.') :
        code === 'auth/too-many-requests'       ? (language === 'fr' ? 'Trop de tentatives. Réessaie plus tard.' : 'Too many attempts. Try again later.') :
        code === 'auth/not-ready'               ? (language === 'fr' ? 'Auth non initialisée. Relance l\'app.' : 'Auth not ready. Restart the app.') :
        // Fallback: show the real error message so nothing is hidden
        (err?.message ?? t.genericError);
      Alert.alert(t.errLabel, msg);
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
        {/* Auth init error banner — only visible if firebase/auth failed to load */}
        {authError ? (
          <View style={styles.authErrBanner}>
            <Text style={styles.authErrText}>⚠️ Auth error: {authError}</Text>
          </View>
        ) : null}

        {/* Language toggle */}
        <TouchableOpacity
          style={styles.langBtn}
          onPress={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
        >
          <Text style={styles.langBtnText}>{t.langToggle}</Text>
        </TouchableOpacity>

        <Text style={styles.logo}>💩</Text>
        <Text style={styles.title}>PoopTracker</Text>
        <Text style={styles.subtitle}>{t.appSubtitle}</Text>

        <View style={styles.card}>
          {isSignUp && (
            <>
              <Text style={styles.label}>
                {language === 'fr' ? 'Ton prénom / surnom' : 'Your name / nickname'}
              </Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t.nicknamePlaceholder}
                placeholderTextColor={Colors.gray}
              />

              <Text style={styles.label}>{t.yourEmoji}</Text>
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

              <Text style={styles.label}>{t.yourPoopEmoji}</Text>
              <View style={styles.emojiRow}>
                {POOP_EMOJIS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.emojiBtn, selectedPoopEmoji === e && styles.emojiBtnActive]}
                    onPress={() => setSelectedPoopEmoji(e)}
                  >
                    <Text style={styles.poopEmojiText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>{t.emailLabel}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            placeholderTextColor={Colors.gray}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>{t.passwordLabel}</Text>
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
                {isSignUp ? t.createAccountBtn : t.signInBtn}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.switchBtn}>
            <Text style={styles.switchText}>
              {isSignUp ? t.switchToSignin : t.switchToSignup}
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
  langBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.lightGray,
    borderRadius: 20,
    marginBottom: 16,
  },
  langBtnText: { fontSize: 13, fontWeight: '600', color: Colors.secondary },
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
  poopEmojiText: { fontSize: 18 },
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
  authErrBanner: {
    width: '100%',
    backgroundColor: '#FDECEA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E74C3C',
  },
  authErrText: { fontSize: 12, color: '#C0392B', textAlign: 'center' },
});
