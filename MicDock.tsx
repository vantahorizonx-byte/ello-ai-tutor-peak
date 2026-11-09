import { useEffect, useRef, useState } from 'react';
import { KeyboardIcon, MicIcon, MicOffIcon, PauseIcon, PlayIcon } from './Icons';

interface Dictation {
  supported: boolean;
  listening: boolean;
  interim: string;
  toggle: () => void;
}

interface Props {
  dictation: Dictation;
  voiceMode: 'idle' | 'speaking' | 'paused';
  onToggleVoice: () => void;
}

const SHORTCUTS = [
  { keys: ['⌘', 'K'], label: 'New board' },
  { keys: ['Space'], label: 'Play / pause Ello' },
  { keys: ['M'], label: 'Start dictation' },
  { keys: ['Enter'], label: 'Send message' },
  { keys: ['⇧', 'Enter'], label: 'New line' },
];

export default function MicDock({ dictation, voiceMode, onToggleVoice }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="dock dock-right" ref={wrapRef}>
      {open && (
        <div className="keys-pop">
          <p className="keys-title">Keyboard</p>
          {SHORTCUTS.map((item) => (
            <div className="keys-row" key={item.label}>
              <span>{item.label}</span>
              <span className="key-caps">
                {item.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </span>
            </div>
          ))}
          <button type="button" className="keys-voice" onClick={onToggleVoice}>
            {voiceMode === 'speaking' ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
            {voiceMode === 'speaking' ? 'Pause voice' : 'Play voice'}
          </button>
        </div>
      )}

      <button
        type="button"
        className={`dock-btn subtle ${open ? 'active' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-label="Keyboard shortcuts"
        aria-expanded={open}
        title="Keyboard shortcuts"
      >
        <KeyboardIcon size={17} />
      </button>

      <div className="mic-zone">
        {dictation.listening && (
          <span className="listening-bubble">{dictation.interim || 'listening…'}</span>
        )}
        <button
          type="button"
          className={`mic-btn ${dictation.listening ? 'live' : ''}`}
          onClick={dictation.toggle}
          aria-label={dictation.listening ? 'Stop voice dictation' : 'Start voice dictation'}
          aria-pressed={dictation.listening}
          title={dictation.supported ? 'Speak to Ello (M)' : 'Voice needs Chrome or Edge'}
        >
          {dictation.listening && <span className="mic-ring" aria-hidden />}
          {dictation.listening ? <MicOffIcon size={19} /> : <MicIcon size={19} />}
        </button>
      </div>
    </div>
  );
}
