import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { VoiceSettings } from '../types';
import { VOICE_PRESETS, VOICE_RATES } from '../voice';
import { CloseIcon, PlayIcon } from './Icons';

interface Props {
  open: boolean;
  settings: VoiceSettings;
  onChange: (settings: VoiceSettings) => void;
  onClose: () => void;
  onPreview: (text: string) => void;
}

const PREVIEW = "Hey, I'm Ello. Let's take this chapter one idea at a time, then I'll quiz you on it.";

export default function VoiceSettingsModal({ open, settings, onChange, onClose, onPreview }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal voice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <p className="canvas-eyebrow">Ello voice</p>
            <h2 className="modal-title" id="voice-modal-title">
              Make it sound like yours
            </h2>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close voice settings">
            <CloseIcon size={18} />
          </button>
        </div>

        <p className="modal-sub">
          Four voice models, tuned for pacing. Ello speaks as the answer streams in — pause any time and it picks up
          from the same syllable.
        </p>

        <div className="modal-section">
          <span className="section-label">voice model</span>
          <div className="voice-grid">
            {VOICE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`voice-option ${settings.voice === preset.id ? 'selected' : ''}`}
                onClick={() => onChange({ ...settings, voice: preset.id })}
                aria-pressed={settings.voice === preset.id}
              >
                <span className="voice-glyph" aria-hidden>
                  {preset.glyph}
                </span>
                <span className="voice-copy">
                  <span className="voice-name">{preset.label}</span>
                  <span className="voice-blurb">{preset.blurb}</span>
                </span>
                <span className="voice-check" aria-hidden>
                  ✓
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="modal-section">
          <span className="section-label">playback speed</span>
          <div className="speed-row">
            {VOICE_RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                className={`speed-pill ${settings.rate === rate ? 'active' : ''}`}
                onClick={() => onChange({ ...settings, rate })}
              >
                {rate.toFixed(2).replace(/0$/, '').replace(/\.$/, '.0')}x
              </button>
            ))}
          </div>
        </div>

        <div className="modal-section">
          <span className="section-label">volume</span>
          <div className="volume-row">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              aria-label="Volume"
              onChange={(event) => onChange({ ...settings, volume: Number(event.target.value) })}
            />
            <span>{Math.round(settings.volume * 100)}%</span>
          </div>
        </div>

        <label className="autoplay-row">
          <span>
            <strong>Speak replies automatically</strong>
            <small>Ello starts reading as soon as the answer appears.</small>
          </span>
          <span className={`switch ${settings.autoplay ? 'on' : ''}`}>
            <input
              type="checkbox"
              checked={settings.autoplay}
              onChange={(event) => onChange({ ...settings, autoplay: event.target.checked })}
            />
            <i aria-hidden />
          </span>
        </label>

        <div className="modal-actions">
          <button type="button" className="ghost-action" onClick={onClose}>
            Done
          </button>
          <button type="button" className="primary-btn" onClick={() => onPreview(PREVIEW)}>
            <PlayIcon size={15} /> Preview this voice
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
