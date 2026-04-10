# 💩 PoopTracker — Guide d'installation

Application mobile couple pour iOS (iPhone) et Android.

---

## 🚀 Prérequis

- [Node.js](https://nodejs.org/) v18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) : `npm install -g expo-cli`
- Compte [Firebase](https://console.firebase.google.com/) (gratuit)
- **iOS** : Xcode (Mac uniquement) OU l'app [Expo Go](https://apps.apple.com/app/expo-go/id982107779)
- **Android** : Android Studio OU l'app [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)

---

## 🔥 Étape 1 — Configurer Firebase

1. Va sur [Firebase Console](https://console.firebase.google.com/)
2. Crée un nouveau projet (nom : `PoopTracker`)
3. Active **Authentication** → Email/Password
4. Active **Realtime Database** → règles en mode test (pour commencer) :
   ```json
   {
     "rules": {
       ".read": "auth != null",
       ".write": "auth != null"
     }
   }
   ```
5. Ajoute une app **Web** dans le projet → copie la config
6. Ouvre `lib/firebase.ts` et remplace `YOUR_API_KEY`, `YOUR_PROJECT_ID`, etc.

---

## 📦 Étape 2 — Installer les dépendances

```bash
npm install
```

---

## ▶️ Étape 3 — Lancer l'app

### Sur ton téléphone (le plus simple — iOS & Android)
```bash
npx expo start
```
→ Scanne le QR code avec **Expo Go** (App Store / Play Store)

### Sur simulateur iOS (Mac requis)
```bash
npx expo start --ios
```

### Sur émulateur Android
```bash
npx expo start --android
```

---

## 📱 Étape 4 — Build natif (pour distribuer)

Pour générer un vrai `.ipa` (iOS) ou `.apk` (Android) :

```bash
# Installer EAS CLI
npm install -g eas-cli

# Se connecter à Expo
eas login

# Configurer le build
eas build:configure

# Build Android (.apk)
eas build -p android --profile preview

# Build iOS (.ipa) — nécessite un compte Apple Developer ($99/an)
eas build -p ios --profile preview
```

---

## 🎮 Comment utiliser l'app

1. **Inscris-toi** avec ton email
2. **Partage ton code** à 6 caractères à ton/ta partenaire
3. **Ton/ta partenaire s'inscrit** et entre ton code
4. Vous êtes maintenant **liés en temps réel** !
5. Appuie sur **💩 Je vais poop !** quand tu vas aux toilettes
6. L'autre voit l'animation en **temps réel** avec le timer
7. Appuie sur **✅ J'ai fini !** quand tu as terminé
8. Tout est enregistré dans l'**historique** avec durée et localisation

---

## 🏗️ Structure du projet

```
poop-tracker/
├── app/
│   ├── _layout.tsx          # Layout racine
│   ├── index.tsx            # Redirection auth
│   ├── (auth)/
│   │   ├── login.tsx        # Connexion / Inscription
│   │   └── pair.tsx         # Liaison couple
│   └── (tabs)/
│       ├── index.tsx        # 🏠 Accueil (animations live)
│       ├── history.tsx      # 📊 Historique & stats
│       └── profile.tsx      # ⚙️ Profil & code couple
├── components/
│   ├── PoopAnimation.tsx    # Animation 💩 avec bounce
│   └── PartnerCard.tsx      # Carte de statut
├── hooks/
│   └── usePoopSession.ts    # Logique timer + Firebase
├── lib/
│   ├── firebase.ts          # Config Firebase
│   ├── database.ts          # CRUD Realtime Database
│   └── auth-context.tsx     # Contexte Auth
└── constants/
    └── Colors.ts            # Palette de couleurs
```

---

## ✨ Fonctionnalités

- ✅ iOS (iPhone 17 / iOS 18+) et Android natif via Expo
- ✅ Animations mignonnes 💩 avec bounce, squish, sparkles
- ✅ Sync en temps réel (Firebase Realtime Database)
- ✅ Timer de durée de séance
- ✅ Localisation GPS avec adresse
- ✅ Compteur quotidien par personne
- ✅ Historique complet avec statistiques
- ✅ Système de code couple pour se lier
- ✅ Notifications haptiques
