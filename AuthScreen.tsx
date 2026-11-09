import { useState } from 'react';
import { ElloFace, SparkIcon, SendIcon } from './Icons';

export interface AuthPayload {
  name: string;
  email: string;
  password: string;
}

interface Props {
  onSubmit: (mode: 'login' | 'signup', payload: AuthPayload) => Promise<void>;
  busy: boolean;
  error: string | null;
}

export default function AuthScreen({ onSubmit, busy, error }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    await onSubmit(mode, {
      name: name.trim(),
      email: email.trim(),
      password,
    });
  };

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    setName('');
    setPassword('');
  };

  return (
    <div className="auth-page">
      <aside className="auth-brand">
        <div className="auth-brand-top">
          <ElloFace size={44} />
          <div>
            <p className="auth-wordmark">Ello AI</p>
            <p className="auth-tagline">your study sidekick</p>
          </div>
        </div>

        <div className="auth-copy">
          <span className="auth-eyebrow">
            <SparkIcon size={15} /> notes in · understanding out
          </span>
          <h1 className="auth-headline">Turn your notes into a board that talks back.</h1>
          <p className="auth-blurb">
            Drop in a chapter, a slide deck or a photo of tonight’s homework. Ello draws it, explains it out loud,
            and quizzes you until it sticks.
          </p>

          <ul className="auth-points">
            <li>
              <span>📄</span> PDFs &amp; slides up to 500MB
            </li>
            <li>
              <span>🎙️</span> talk to Ello, hear it answer
            </li>
            <li>
              <span>🧠</span> flashcards + delayed marking mock tests
            </li>
          </ul>
        </div>

        <div className="auth-doodle" aria-hidden>
          <svg viewBox="0 0 320 150" className="auth-doodle-svg">
            <path d="M12 120c48-46 96-46 144 0" />
            <path d="M28 44h84" />
            <path d="M28 62h56" />
            <circle cx="236" cy="52" r="24" />
            <path d="M212 52h48M236 28v48" />
            <path d="M176 118c22-18 44-18 66 0" />
            <path d="M258 108l26-26" />
            <path d="M270 78l16 16" />
          </svg>
          <p>F = m × a</p>
        </div>

        <p className="auth-footnote">built for the 11pm revision session.</p>
      </aside>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={mode === 'login' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => switchMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={mode === 'signup' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => switchMode('signup')}
            >
              Create account
            </button>
          </div>

          <h2 className="auth-title">{mode === 'login' ? 'Welcome back' : 'Make Ello yours'}</h2>
          <p className="auth-sub">
            {mode === 'login'
              ? 'Your boards, streaks and cards are right where you left them.'
              : 'Free forever study board. No credit card, no nonsense.'}
          </p>

          <form className="auth-form" onSubmit={submit}>
            {mode === 'signup' && (
              <label className="field">
                <span>Your name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={60}
                />
              </label>
            )}

            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@school.edu"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'signup' ? 'At least 8 characters, 1 number' : '••••••••'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={8}
              />
            </label>

            {error && (
              <p className="auth-error" role="alert">
                Ello could not complete that request. {error}
              </p>
            )}

            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? 'One sec…' : mode === 'login' ? 'Open my board' : 'Start studying'}
              <SendIcon size={17} />
            </button>
          </form>

          <p className="auth-legal">
            Accounts are secured by Firebase Authentication. Your profile lives in Cloud Firestore.
          </p>
        </div>
      </section>
    </div>
  );
}
