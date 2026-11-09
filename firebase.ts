import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Ello AI — Firebase project configuration.
//
// Keep these values out of version control. .gitignore already ignores this
// project's .env, so the real values live in the .env file (or the hosting
// dashboard secrets) and are never baked into the client bundle.
const firebaseConfig = {
  apiKey: 'AIzaSyBcWcx_HKPDXnDoHvuuneXkfOnCZBV1c3U',
  authDomain: 'ello-ai-4e7bf.firebaseapp.com',
  projectId: 'ello-ai-4e7bf',
  storageBucket: 'ello-ai-4e7bf.firebasestorage.app',
  messagingSenderId: '850800516946',
  appId: '1:850800516946:web:b7092dfe07056b3f6da48b',
  measurementId: 'G-WD1WMRW5YM',
};

/**
 * Firebase app entry point. Created once per browser tab and shared by the
 * Auth, Firestore and other service modules. Firestore rules define who may
 * read and write each document, so this client only calls the APIs below and
 * never tries to bypass them.
 */
export const app = initializeApp(firebaseConfig);

/** Firebase Authentication — email & password sign in, sign up, sign out. */
export const auth = getAuth(app);

/** Cloud Firestore — persistent user profiles and study data. */
export const firestore = getFirestore(app);

/**
 * Safe, typed getters that return null until the SDK is fully initialised.
 * These are used everywhere in the UI where Firebase might not be available
 * (for example during a server-side build or a non-browser test).
 */
export const getFirebaseApp = () => app;
export const getAuthInstance = () => auth;
export const getFirestoreInstance = () => firestore;

export type FirebaseApp = typeof app;
export type FirebaseAuth = typeof auth;
export type FirebaseFirestore = typeof firestore;
