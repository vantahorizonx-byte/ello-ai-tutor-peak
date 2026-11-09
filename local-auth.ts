import type { User, VoiceSettings } from '../types';

/**
 * Offline fallback authentication.
 *
 * Firebase is the source of truth when it is reachable. When the project is
 * unconfigured (missing/invalid API key, auth/configuration-not-found) or the
 * network blocks Google's endpoints, the app falls back to this local store so
 * the student can still get into their board instead of staring at a red error.
 *
 * Everything lives in localStorage: no password ever leaves the browser, and
 * only a non-reversible fingerprint of it is kept.
 */

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  streak: number;
  longestStreak: number;
  createdAt: string;
  lastActiveDate: string;
  settings: Required<VoiceSettings>;
}

interface StoredUser extends LocalUser {
  passwordHash: string;
}

const USERS_KEY = 'ello.local.users';
const SESSION_KEY = 'ello.local.session';
export const LOCAL_SESSION_EVENT = 'ello:local-session';

const DEFAULT_SETTINGS: Required<VoiceSettings> = {
  voice: 'encouraging_female',
  rate: 1,
  volume: 0.9,
  autoplay: true,
};

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

/** Tiny non-cryptographic digest — this is a local mock, not real security. */
const fingerprint = (value: string): string => {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
};

const readUsers = (): StoredUser[] => {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
};

const writeUsers = (users: StoredUser[]) => {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch {
    /* storage full or blocked — the session still works for this tab */
  }
};

const notify = () => {
  try {
    window.dispatchEvent(new Event(LOCAL_SESSION_EVENT));
  } catch {
    /* non-browser environment */
  }
};

const initialsFor = (name: string, email: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email.trim()[0] ?? 'E').toUpperCase();
};

/** Roll the streak forward once per calendar day. */
export const rollStreak = (user: LocalUser): LocalUser => {
  const t = today();
  if (user.lastActiveDate === t) return user;
  const next = user.lastActiveDate === yesterday() ? user.streak + 1 : 1;
  return {
    ...user,
    streak: next,
    longestStreak: Math.max(user.longestStreak, next),
    lastActiveDate: t,
  };
};

const persist = (user: LocalUser): LocalUser => {
  const users = readUsers();
  const index = users.findIndex((candidate) => candidate.id === user.id);
  if (index !== -1) {
    users[index] = { ...users[index], ...user };
    writeUsers(users);
  }
  try {
    localStorage.setItem(SESSION_KEY, user.id);
  } catch {
    /* ignore */
  }
  notify();
  return user;
};

export function createLocalAccount(name: string, email: string, password: string): LocalUser {
  const users = readUsers();
  const normalisedEmail = email.trim().toLowerCase();
  if (users.some((candidate) => candidate.email === normalisedEmail)) {
    throw new Error('An account already exists with that email.');
  }

  const displayName = name.trim().slice(0, 60) || normalisedEmail.split('@')[0] || 'Student';
  const stamp = new Date().toISOString();
  const user: StoredUser = {
    id: `local_${fingerprint(normalisedEmail + stamp)}`,
    name: displayName,
    email: normalisedEmail,
    initials: initialsFor(displayName, normalisedEmail),
    streak: 1,
    longestStreak: 1,
    createdAt: stamp,
    lastActiveDate: today(),
    settings: { ...DEFAULT_SETTINGS },
    passwordHash: fingerprint(`${normalisedEmail}:${password}`),
  };

  writeUsers([...users, user]);
  const { passwordHash: _ignored, ...session } = user;
  return persist(session);
}

export function authenticateLocal(email: string, password: string): LocalUser {
  const normalisedEmail = email.trim().toLowerCase();
  const user = readUsers().find((candidate) => candidate.email === normalisedEmail);
  if (!user) throw new Error('No local account found with that email.');
  if (user.passwordHash !== fingerprint(`${normalisedEmail}:${password}`)) {
    throw new Error('Incorrect email or password.');
  }
  const { passwordHash: _ignored, ...session } = user;
  return persist(rollStreak(session));
}

export function clearLocalSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

export function getLocalSession(): LocalUser | null {
  let id: string | null = null;
  try {
    id = localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
  if (!id) return null;
  const stored = readUsers().find((candidate) => candidate.id === id);
  if (!stored) return null;
  const { passwordHash: _ignored, ...session } = stored;
  const rolled = rollStreak(session);
  if (rolled.streak !== session.streak) persist(rolled);
  return rolled;
}

/** Subscribe to local session changes (sign in, sign out, other tabs). */
export function subscribeLocalSession(handler: (user: LocalUser | null) => void): () => void {
  const emit = () => handler(getLocalSession());
  window.addEventListener(LOCAL_SESSION_EVENT, emit);
  window.addEventListener('storage', emit);
  return () => {
    window.removeEventListener(LOCAL_SESSION_EVENT, emit);
    window.removeEventListener('storage', emit);
  };
}

/** Map the local record onto the shape the dashboard already renders. */
export const toUiUser = (user: LocalUser): User => ({
  id: user.id,
  name: user.name,
  email: user.email,
  initials: user.initials,
  streak: user.streak,
  longestStreak: user.longestStreak,
  settings: user.settings,
});
