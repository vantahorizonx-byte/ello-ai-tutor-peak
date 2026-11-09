import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  fetchUserProfile,
  firebaseSignIn,
  firebaseSignOut,
  firebaseSignUp,
} from './lib/firebase-auth';
import {
  getLocalSession,
  subscribeLocalSession,
  toUiUser,
  type LocalUser,
} from './lib/local-auth';
import AuthScreen, { type AuthPayload } from './components/AuthScreen';
import BoardCanvas from './components/BoardCanvas';
import Flashcards from './components/Flashcards';
import MockTest from './components/MockTest';
import ChatPanel from './components/ChatPanel';
import UploadPanel from './components/UploadPanel';
import ListenPanel from './components/ListenPanel';
import ProgressPanel from './components/ProgressPanel';
import ResultsPanel from './components/ResultsPanel';
import { ElloFace, CloseIcon } from './components/Icons';
import { gradeLocalQuiz, localQuiz } from './lib/local-tutor';
import { recordExam, recordStudyDay, type ProgressState } from './lib/progress';
import type { Board, CanvasState, CardStatus, Flashcard, Quiz, User } from './types';

const CANVAS_KEY = 'ello.workspace.canvas';
const CARDS_KEY = 'ello.workspace.cards';

const readStored = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeStored = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked — the board still works for this tab */
  }
};

/** Human-readable copy for the Firebase error codes the form can return. */
function errorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const code = 'code' in err ? String((err as { code: unknown }).code) : '';
    switch (code) {
      case 'auth/invalid-email':
        return 'That email address looks invalid.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Incorrect email or password.';
      case 'auth/email-already-in-use':
        return 'An account already exists with that email.';
      case 'auth/weak-password':
        return 'Password must be at least 8 characters.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Please try again shortly.';
      case 'auth/network-request-failed':
        return 'Network error — switching to the offline board.';
      default:
        break;
    }
  }
  return err instanceof Error && err.message ? err.message : 'Something went wrong. Try again.';
}

function LoadingScreen() {
  return (
    <div className="app-loading">
      <div className="loading-spinner" />
      <p>Warming up your board…</p>
    </div>
  );
}

interface WorkspaceProps {
  user: User;
  backend: 'firebase' | 'local';
  onLogout: () => Promise<void>;
  error: string | null;
  onDismissError: () => void;
}

type WorkspaceTab = 'board' | 'cards' | 'test' | 'chat' | 'upload' | 'listen' | 'results' | 'progress';

const TABS: { id: WorkspaceTab; label: string; hint: string }[] = [
  { id: 'board', label: '🎨 Live board', hint: 'The lesson, drawn out' },
  { id: 'cards', label: '🗂 Flashcards', hint: 'Flip, then sort' },
  { id: 'test', label: '📝 Mock exam', hint: 'Marked at the end' },
  { id: 'chat', label: '💬 Chat', hint: 'Ask a question' },
  { id: 'upload', label: '📄 Upload PDF', hint: 'Add your notes' },
  { id: 'listen', label: '🔊 Listen', hint: 'Hear the board' },
  { id: 'results', label: '📈 Results', hint: 'Marked papers' },
  { id: 'progress', label: '📊 Progress', hint: 'Streak and scores' },
];

const GUIDE_STEPS: { title: string; body: string; go: WorkspaceTab }[] = [
  { title: 'Add your notes', body: 'Drop a PDF, slide deck or a photo of the chapter.', go: 'upload' },
  { title: 'Read the board', body: 'Plain-language notes, formulas and diagrams.', go: 'board' },
  { title: 'Check yourself', body: 'Flip flashcards, then sit a ten-question mock exam.', go: 'test' },
  { title: 'Ask when stuck', body: 'Chat for a step-by-step explanation, or press Listen.', go: 'chat' },
];

const GUIDE_KEY = 'ello.guide.dismissed';

function LiveBoardWorkspace({ user, backend, onLogout, error, onDismissError }: WorkspaceProps) {
  const [tab, setTab] = useState<WorkspaceTab>('board');
  const [canvas, setCanvas] = useState<CanvasState>(() => readStored<CanvasState>(CANVAS_KEY, {}));
  const [cards, setCards] = useState<Flashcard[]>(() => readStored<Flashcard[]>(CARDS_KEY, []));
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [progress, setProgress] = useState<ProgressState>(() => recordStudyDay());
  const [showGuide, setShowGuide] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_KEY) !== 'yes';
    } catch {
      return true;
    }
  });
  const [docCount, setDocCount] = useState(() => {
    try {
      const raw = localStorage.getItem('ello.workspace.uploads');
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  });

  const dismissGuide = () => {
    setShowGuide(false);
    try {
      localStorage.setItem(GUIDE_KEY, 'yes');
    } catch {
      /* ignore */
    }
  };

  const handleSaveCanvas = useCallback((next: CanvasState) => {
    setCanvas(next);
    writeStored(CANVAS_KEY, next);
  }, []);

  const handleSetCardStatus = useCallback((cardId: string, status: CardStatus) => {
    setCards((current) => {
      const next = current.map((card) => (card.id === cardId ? { ...card, status } : card));
      writeStored(CARDS_KEY, next);
      return next;
    });
  }, []);

  const handleSignOut = async () => {
    setSignedOut(true);
    try {
      await onLogout();
    } finally {
      setSignedOut(false);
    }
  };

  return (
    <main className="app-dashboard">
      <header className="app-dashboard-header">
        <div className="app-dashboard-brand">
          <ElloFace size={30} />
          <strong>Ello AI</strong>
          <span className="live-tag">LIVE BOARD</span>
        </div>
        <div className="app-dashboard-user">
          <span className="app-streak">🔥 {user.streak} day streak</span>
          {backend === 'local' && <span className="offline-tag">offline mode</span>}
          <span>{user.name}</span>
          <button type="button" onClick={handleSignOut} disabled={signedOut}>
            {signedOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>

      {error && (
        <div className="app-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onDismissError} aria-label="Dismiss error">
            ✕
          </button>
        </div>
      )}

      <div className="workspace-tabs" role="tablist" aria-label="Workspace sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'workspace-tab active' : 'workspace-tab'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice && (
        <p className="workspace-notice" role="status">
          {notice}
        </p>
      )}

      <section id="dashboard-canvas" className="app-workspace">
        {tab === 'board' && showGuide && (
          <div className="guide-card">
            <div className="guide-head">
              <div>
                <span className="panel-eyebrow">new here?</span>
                <h2 className="guide-title">Four steps to your first board</h2>
              </div>
              <button type="button" className="guide-close" onClick={dismissGuide} aria-label="Dismiss guide">
                <CloseIcon size={14} />
              </button>
            </div>
            <ol className="guide-steps">
              {GUIDE_STEPS.map((step, index) => (
                <li key={step.title}>
                  <button type="button" onClick={() => setTab(step.go)}>
                    <span className="guide-num">{index + 1}</span>
                    <strong>{step.title}</strong>
                    <span>{step.body}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}
        {tab === 'board' && (
          <BoardCanvas board={null} canvas={canvas} onSaveCanvas={handleSaveCanvas} hasFile={docCount > 0} />
        )}
        {tab === 'cards' && (
          <Flashcards
            cards={cards}
            loading={false}
            onGenerate={() => setNotice('Flashcards are generated on the server once it is connected.')}
            onSetStatus={handleSetCardStatus}
            hasFile={docCount > 0}
            onNotice={setNotice}
          />
        )}
        {tab === 'test' && (
          <MockTest
            quiz={quiz}
            loading={false}
            onGenerate={() => {
              setQuiz(localQuiz());
              setNotice('Your mock paper is ready — four questions, one mark at the end.');
            }}
            onGrade={async (answers) => {
              const result = gradeLocalQuiz(answers);
              setProgress(recordExam(result));
              return result;
            }}
            hasFile
            onNotice={setNotice}
          />
        )}
        {tab === 'chat' && <ChatPanel />}
        {tab === 'upload' && <UploadPanel onCountChange={setDocCount} />}
        {tab === 'results' && (
          <ResultsPanel
            exams={progress.exams}
            onStartExam={() => {
              setQuiz(localQuiz());
              setTab('test');
            }}
          />
        )}
        {tab === 'progress' && (
          <ProgressPanel
            activity={progress.activity}
            exams={progress.exams}
            cards={cards}
            docCount={docCount}
            onNavigate={(target) => setTab(target)}
          />
        )}
        {tab === 'listen' && (
          <ListenPanel headline="" passages={[]} />
        )}
      </section>
    </main>
  );
}

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [localUser, setLocalUser] = useState<LocalUser | null>(() => getLocalSession());
  const [authReady, setAuthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ name: string; streak: number } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setFirebaseUser(nextUser);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  // Keep the offline session in sync across tabs and sign-ins.
  useEffect(() => subscribeLocalSession(setLocalUser), []);

  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    fetchUserProfile(firebaseUser.uid)
      .then((next) => {
        if (!cancelled) setProfile(next);
      })
      .catch(() => {
        /* the dashboard still works without a profile document */
      });
    return () => {
      cancelled = true;
    };
  }, [firebaseUser]);

  const handleAuthSubmit = async (mode: 'login' | 'signup', payload: AuthPayload) => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const result = await firebaseSignUp(
          payload.name || payload.email.split('@')[0],
          payload.email,
          payload.password,
        );
        if (result.backend === 'local') {
          setError(null); // fallback succeeded — keep the red box empty
          setLocalUser(getLocalSession());
        }
      } else {
        const result = await firebaseSignIn(payload.email, payload.password);
        if (result.backend === 'local') {
          setError(null);
          setLocalUser(getLocalSession());
        }
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setError(null);
    try {
      await firebaseSignOut();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLocalUser(getLocalSession());
    }
  };

  if (!authReady) return <LoadingScreen />;

  // Firebase wins when present; the offline session keeps the board reachable
  // when it is not.
  const session: { user: User; backend: 'firebase' | 'local' } | null = firebaseUser
    ? {
        backend: 'firebase',
        user: {
          id: firebaseUser.uid,
          name: profile?.name || firebaseUser.email?.split('@')[0] || 'Student',
          email: firebaseUser.email ?? '',
          initials: (profile?.name || firebaseUser.email || 'E').slice(0, 2).toUpperCase(),
          streak: profile?.streak ?? 0,
          settings: {},
        },
      }
    : localUser
      ? { backend: 'local', user: toUiUser(localUser) }
      : null;

  if (session) {
    return (
      <LiveBoardWorkspace
        user={session.user}
        backend={session.backend}
        onLogout={handleLogout}
        error={error}
        onDismissError={() => setError(null)}
      />
    );
  }

  return <AuthScreen onSubmit={handleAuthSubmit} busy={busy} error={error} />;
}
