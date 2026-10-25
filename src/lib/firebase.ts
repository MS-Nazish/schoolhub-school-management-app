/**
 * Firebase setup. Values come from .env (EXPO_PUBLIC_FIREBASE_*); when they are missing the
 * app runs in offline demo mode and nothing here is used.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { type Firestore, connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = !!(config.apiKey && config.projectId && config.appId);

/**
 * Local testing: EXPO_PUBLIC_USE_EMULATOR=1 connects to the Firebase emulators on this computer
 * (`npx firebase emulators:start --only auth,firestore --project demo-schoolhub`) instead of the real project.
 */
const useEmulator = process.env.EXPO_PUBLIC_USE_EMULATOR === '1';
const EMULATOR_HOST = '127.0.0.1';

// getReactNativePersistence exists only in the React Native build of firebase/auth, which
// Metro picks on Android/iOS; the default TypeScript types don't declare it.
type RNAuth = typeof FirebaseAuth & { getReactNativePersistence: (storage: unknown) => FirebaseAuth.Persistence };

let app: FirebaseApp | undefined;
let auth: FirebaseAuth.Auth | undefined;
let db: Firestore | undefined;

function init() {
  if (app) return;
  app = getApps().length ? getApp() : initializeApp(config);
  auth = Platform.OS === 'web'
    ? FirebaseAuth.getAuth(app)
    : FirebaseAuth.initializeAuth(app, { persistence: (FirebaseAuth as RNAuth).getReactNativePersistence(AsyncStorage) });
  // Optional fields (e.g. paidOn) are often undefined; let Firestore skip them
  db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  if (useEmulator) {
    FirebaseAuth.connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, EMULATOR_HOST, 8085);
  }
}

export function getAuthInstance() {
  init();
  return auth!;
}

export function getDb() {
  init();
  return db!;
}

/**
 * Creates a login without signing the current user out, by using a second Firebase app
 * instance that keeps its own (in-memory) session.
 */
let helperAuth: FirebaseAuth.Auth | undefined;

export async function createLogin(email: string, password: string) {
  init();
  if (!helperAuth) {
    const helperApp = initializeApp(config, 'account-helper');
    helperAuth = FirebaseAuth.initializeAuth(helperApp, { persistence: FirebaseAuth.inMemoryPersistence });
    if (useEmulator) FirebaseAuth.connectAuthEmulator(helperAuth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
  }
  try {
    await FirebaseAuth.createUserWithEmailAndPassword(helperAuth, email, password);
    return 'created' as const;
  } catch (e) {
    if ((e as { code?: string }).code === 'auth/email-already-in-use') return 'exists' as const;
    throw e;
  } finally {
    await FirebaseAuth.signOut(helperAuth).catch(() => {});
  }
}
