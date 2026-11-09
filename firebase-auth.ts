import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, firestore } from './firebase';
import {
  authenticateLocal,
  clearLocalSession,
  createLocalAccount,
  toUiUser,
  type LocalUser,
} from './local-auth';
import type { User } from '../types';

/**
 * Hybrid authentication.
 *
 * Firebase is tried first. If the project is not configured (missing or invalid
 * API key, `auth/configuration-not-found`) or Google's endpoints are blocked,
 * the same call transparently falls back to the localStorage engine so the
 * student lands on their board instead of an error box.
 */

export type AuthBackend = 'firebase' | 'local';

export interface AuthResult {
  user: User | null;
  backend: AuthBackend;
  /** Present only when the local fallback created the account. */
  localUser?: LocalUser;
}

/** Codes that mean "Firebase is not usable here", not "wrong password". */
const FALLBACK_CODES = new Set([
  'auth/configuration-not-found',
  'auth/invalid-api-key',
  'auth/api-key-not-valid',
  'auth/app-not-authorized',
  'auth/operation-not-allowed',
  'auth/unauthorized-domain',
  'auth/network-request-failed',
  'auth/internal-error',
  'auth/timeout',
  'auth/web-storage-unsupported',
]);

const codeOf = (err: unknown): string =>
  err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';

/** True when the failure is a configuration/network block, not bad credentials. */
export const shouldUseLocalFallback = (err: unknown): boolean => {
  const code = codeOf(err);
  if (FALLBACK_CODES.has(code)) return true;
  // A blocked request often surfaces as a bare TypeError ("Failed to fetch").
  if (err instanceof TypeError) return true;
  const message = err instanceof Error ? err.message : '';
  return /configuration-not-found|api-key|network|failed to fetch|offline/i.test(message);
};

const localResult = (user: LocalUser): AuthResult => ({
  user: toUiUser(user),
  backend: 'local',
  localUser: user,
});

/** Email/password sign in — Firebase first, local store as a safety net. */
export async function firebaseSignIn(email: string, password: string): Promise<AuthResult> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    clearLocalSession(); // Firebase won; drop any stale offline session.
    return { user: mapFirebaseUser(result.user), backend: 'firebase' };
  } catch (err) {
    if (!shouldUseLocalFallback(err)) throw err;
    return localResult(authenticateLocal(email, password));
  }
}

/** Email/password sign up — Firebase first, local store as a safety net. */
export async function firebaseSignUp(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult & { createdProfile: boolean }> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = result.user;
    clearLocalSession();

    const createdAt = firebaseUser.metadata.creationTime ?? new Date().toISOString();
    const displayName = name.trim().slice(0, 60) || 'Student';

    try {
      await setDoc(doc(firestore, 'user_profiles', firebaseUser.uid), {
        display_name: displayName,
        email: firebaseUser.email ?? '',
        avatar_initials: displayName.slice(0, 2).toUpperCase(),
        uid: firebaseUser.uid,
        created_at: createdAt,
        updated_at: new Date().toISOString(),
        last_active_date: new Date().toISOString().slice(0, 10),
        streak: 1,
        longest_streak: 1,
        settings: { voice: 'encouraging_female', rate: 1, volume: 0.9, autoplay: true },
      });
    } catch {
      // A rejected Firestore write must not lock the new student out of auth.
    }

    return {
      user: mapFirebaseUser(firebaseUser),
      backend: 'firebase',
      createdProfile: true,
    };
  } catch (err) {
    if (!shouldUseLocalFallback(err)) throw err;
    return { ...localResult(createLocalAccount(name, email, password)), createdProfile: true };
  }
}

/** Sign out of whichever backend is active. */
export async function firebaseSignOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    /* offline fallback sessions still need clearing */
  }
  clearLocalSession();
}

/** Read the current user profile from Firestore, if one exists. */
export async function fetchUserProfile(
  uid: string,
): Promise<{ name: string; streak: number } | null> {
  const snapshot = await getDoc(doc(firestore, 'user_profiles', uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    name: typeof data.display_name === 'string' ? data.display_name : 'Student',
    streak: Number(data.streak ?? 0),
  };
}

/** Seed a brand-new user profile the first time they sign up. */
export async function createUserProfile(uid: string, name: string): Promise<void> {
  await setDoc(doc(firestore, 'user_profiles', uid), {
    display_name: name.trim().slice(0, 60) || 'Student',
    email: '',
    avatar_initials: 'EE',
    uid,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_active_date: new Date().toISOString().slice(0, 10),
    streak: 1,
    longest_streak: 1,
    settings: { voice: 'encouraging_female', rate: 1, volume: 0.9, autoplay: true },
  });
}

/**
 * Turn a Firebase user object into the shape Ello's UI already expects.
 */
function mapFirebaseUser(firebaseUser: FirebaseUser | null): User | null {
  if (!firebaseUser) return null;

  const displayName =
    firebaseUser.displayName?.trim().slice(0, 60) ||
    firebaseUser.email?.split('@')[0] ||
    'Student';

  return {
    id: firebaseUser.uid,
    name: displayName,
    email: firebaseUser.email ?? '',
    initials: displayName.slice(0, 2).toUpperCase(),
    streak: 0,
    longestStreak: 0,
    settings: { voice: 'encouraging_female', rate: 1, volume: 0.9, autoplay: true },
  };
}
