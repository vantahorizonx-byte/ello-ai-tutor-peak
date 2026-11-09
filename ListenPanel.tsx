import { useEffect, useMemo, useRef, useState } from 'react';
import { PauseIcon, PlayIcon, RefreshIcon, VolumeIcon } from './Icons';

interface Passage {
  title: string;
  body: string;
}

interface Props {
  headline: string;
  passages: Passage[];
}

interface Persona {
  id: string;
  name: string;
  tag: string;
  rate: number;
  pitch: number;
  /** Preferred system engine, matched against the installed voice names. */
  match: RegExp;
}

/**
 * Six ready-made Ello voices. They are built on whatever speech engines the
 * device exposes, shaped with rate/pitch so each one sounds distinct even when
 * the browser only ships a couple of system voices.
 */
const PERSONAS: Persona[] = [
  { id: 'aria', name: 'Aria', tag: 'Bright tutor', rate: 1.06, pitch: 1.25, match: /aria|jenny|zira|samantha|female/i },
  { id: 'zira', name: 'Zira', tag: 'Calm explainer', rate: 0.9, pitch: 0.98, match: /zira|hazel|susan|samantha|female/i },
  { id: 'david', name: 'David', tag: 'Deep narrator', rate: 0.95, pitch: 0.72, match: /david|mark|guy|george|ryan|male/i },
  { id: 'mark', name: 'Mark', tag: 'Exam reader', rate: 1, pitch: 1.02, match: /mark|david|guy|male/i },
  { id: 'sam', name: 'Sam', tag: 'Upbeat coach', rate: 1.18, pitch: 1.35, match: /guy|mark|david|male/i },
  { id: 'sage', name: 'Sage', tag: 'Slow & clear', rate: 0.78, pitch: 1.06, match: /zira|susan|karen|female/i },
];

const PERSONA_KEY = 'ello.listen.persona';

const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;

export default function ListenPanel({ headline, passages }: Props) {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voiceName, setVoiceName] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [personaId, setPersonaId] = useState(() => {
    try {
      return localStorage.getItem(PERSONA_KEY) || 'aria';
    } catch {
      return 'aria';
    }
  });
  const [rate, setRate] = useState(1.06);
  const [pitch, setPitch] = useState(1.25);
  const [notes, setNotes] = useState(() => {
    try {
      return localStorage.getItem('ello.listen.notes') ?? '';
    } catch {
      return '';
    }
  });
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);

  const persona = PERSONAS.find((item) => item.id === personaId) ?? PERSONAS[0];

  const boardScript = useMemo(
    () => [headline, ...passages.map((item) => `${item.title}. ${item.body}`)].filter(Boolean).join(' '),
    [headline, passages],
  );

  // With no generated board, read whatever notes the student pastes in.
  const script = boardScript.trim() ? boardScript : notes.trim();
  const hasScript = script.trim().length > 0;

  const updateNotes = (value: string) => {
    setNotes(value);
    try {
      localStorage.setItem('ello.listen.notes', value);
    } catch {
      /* ignore */
    }
  };

  const pickEngine = (target: Persona): SpeechSynthesisVoice | undefined => {
    const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
    const pool = english.length ? english : voices;
    return pool.find((voice) => target.match.test(voice.name)) ?? pool[0] ?? voices[0];
  };

  useEffect(() => {
    if (!supported) return;
    let poll: number | null = null;
    const load = () => {
      const available = window.speechSynthesis.getVoices();
      if (!available.length) return;
      setVoices(available);
    };
    load();
    // Chromium fills the voice list asynchronously after first use.
    let ticks = 0;
    poll = window.setInterval(() => {
      ticks += 1;
      load();
      if (ticks > 12 && poll) {
        window.clearInterval(poll);
        poll = null;
      }
    }, 400);
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      if (poll) window.clearInterval(poll);
      window.speechSynthesis.removeEventListener('voiceschanged', load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = () => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    utterance.current = null;
    setSpeaking(false);
    setPaused(false);
  };

  const play = (nextPersona: Persona = persona, nextRate = rate, nextPitch = pitch) => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const next = new SpeechSynthesisUtterance(script);
    const engine = (voiceName && voices.find((voice) => voice.name === voiceName)) || pickEngine(nextPersona);
    if (engine) next.voice = engine;
    next.rate = nextRate;
    next.pitch = nextPitch;
    next.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    next.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };
    utterance.current = next;
    window.speechSynthesis.speak(next);
    setSpeaking(true);
    setPaused(false);
  };

  const choosePersona = (next: Persona) => {
    setPersonaId(next.id);
    setRate(next.rate);
    setPitch(next.pitch);
    try {
      localStorage.setItem(PERSONA_KEY, next.id);
    } catch {
      /* ignore */
    }
    if (speaking) play(next, next.rate, next.pitch);
  };

  const togglePause = () => {
    if (!supported) return;
    if (paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  };

  const notesField = !boardScript.trim() && (
    <label className="listen-field listen-notes">
      <span>Text to read</span>
      <textarea
        rows={5}
        value={notes}
        placeholder="Paste your notes here and pick a voice — Ello reads them back at whatever speed you like."
        onChange={(event) => updateNotes(event.target.value)}
      />
    </label>
  );

  if (!hasScript) {
    return (
      <div className="listen-panel">
        <header className="panel-head">
          <div>
            <span className="panel-eyebrow">
              <VolumeIcon size={14} /> read aloud
            </span>
            <h2 className="panel-title">Listen to this board</h2>
          </div>
        </header>
        {notesField}
        <div className="deck-empty">
          <span className="deck-empty-glyph">🔊</span>
          <h2 className="deck-empty-title">Nothing to read yet</h2>
          <p className="deck-empty-body">
            Upload your notes to hear the finished board, or paste any text above and Ello will read it aloud.
          </p>
        </div>
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="listen-panel">
        <header className="panel-head">
          <div>
            <span className="panel-eyebrow">voice</span>
            <h2 className="panel-title">Listen to this board</h2>
          </div>
        </header>
        <p className="panel-hint">This browser does not support speech synthesis. Try Chrome, Edge or Safari.</p>
      </div>
    );
  }

  const activeEngine = (voiceName && voices.find((voice) => voice.name === voiceName)) || pickEngine(persona);

  return (
    <div className="listen-panel">
      <header className="panel-head">
        <div>
          <span className="panel-eyebrow">
            <VolumeIcon size={14} /> read aloud
          </span>
          <h2 className="panel-title">Choose a voice</h2>
        </div>
        <span className="panel-hint">
          {PERSONAS.length} Ello voices · {voices.length} system engine{voices.length === 1 ? '' : 's'}
        </span>
      </header>

      <div className="voice-grid" role="radiogroup" aria-label="Ello voice">
        {PERSONAS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={personaId === item.id}
            className={personaId === item.id ? 'voice-card active' : 'voice-card'}
            onClick={() => choosePersona(item)}
          >
            <span className="voice-avatar" aria-hidden>
              {item.name[0]}
            </span>
            <span className="voice-copy">
              <strong>{item.name}</strong>
              <span>{item.tag}</span>
            </span>
            <span className="voice-meta">
              {item.rate.toFixed(2)}× · p{item.pitch.toFixed(1)}
            </span>
          </button>
        ))}
      </div>

      <div className="listen-controls">
        <button type="button" className="listen-play" onClick={() => (speaking ? stop() : play())}>
          {speaking ? <RefreshIcon size={16} /> : <PlayIcon size={16} />}
          {speaking ? 'Restart' : `Play as ${persona.name}`}
        </button>
        <button type="button" className="ghost-action" onClick={togglePause} disabled={!speaking}>
          <PauseIcon size={16} /> {paused ? 'Resume' : 'Pause'}
        </button>
        <button type="button" className="ghost-action" onClick={stop} disabled={!speaking}>
          Stop
        </button>
      </div>

      {notesField}

      <p className="listen-preview">{script}</p>

      <label className="listen-field">
        <span>Speed · {rate.toFixed(2)}×</span>
        <input
          type="range"
          min={0.6}
          max={1.6}
          step={0.05}
          value={rate}
          onChange={(event) => setRate(Number(event.target.value))}
          onPointerUp={() => speaking && play()}
        />
      </label>

      <label className="listen-field">
        <span>Pitch · {pitch.toFixed(2)}</span>
        <input
          type="range"
          min={0.5}
          max={1.7}
          step={0.05}
          value={pitch}
          onChange={(event) => setPitch(Number(event.target.value))}
          onPointerUp={() => speaking && play()}
        />
      </label>

      <label className="listen-field">
        <span>
          System engine · {activeEngine ? activeEngine.name : 'device default'}
        </span>
        <select value={voiceName} onChange={(event) => setVoiceName(event.target.value)}>
          <option value="">Auto — best match for {persona.name}</option>
          {voices.map((voice) => (
            <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
              {voice.name} ({voice.lang}){voice.localService ? '' : ' · online'}
            </option>
          ))}
        </select>
      </label>

      {voices.length <= 3 && (
        <p className="panel-hint">
          This browser exposes only {voices.length} system engines, so the six Ello voices are shaped from them with
          rate and pitch. Edge or Safari usually exposes many more engines.
        </p>
      )}
    </div>
  );
}
