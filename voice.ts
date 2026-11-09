import type { VoiceSettings } from './types';

export interface VoicePreset {
  id: string;
  label: string;
  blurb: string;
  glyph: string;
}

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'friendly_male',
    label: 'Friendly Male',
    blurb: 'Warm and steady — the mate who aced the test',
    glyph: '🌤️',
  },
  {
    id: 'encouraging_female',
    label: 'Encouraging Female',
    blurb: 'Bright and patient — cheers you through the hard bit',
    glyph: '🌷',
  },
  {
    id: 'british_professor',
    label: 'British Professor',
    blurb: 'Measured and precise — exam-board energy',
    glyph: '🎓',
  },
  {
    id: 'energetic_coach',
    label: 'Energetic Tech Coach',
    blurb: 'Fast and punchy — five minutes before the bell',
    glyph: '⚡',
  },
];

export const VOICE_RATES = [1, 1.25, 1.5];

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voice: 'encouraging_female',
  rate: 1,
  volume: 0.9,
  autoplay: true,
};

export type VoiceMode = 'idle' | 'speaking' | 'paused';

export interface VoiceState {
  mode: VoiceMode;
  queueLength: number;
  voiceName: string | null;
  supported: boolean;
}

const SENTENCE_BREAK = /([.!?…]+["'”’)]?|\n+)(\s|$)/;

/** Splits streamed text into speakable sentences without losing the tail. */
function takeCompleteSentences(buffer: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let rest = buffer;
  let match: RegExpExecArray | null;

  while ((match = SENTENCE_BREAK.exec(rest)) !== null) {
    const end = match.index + match[0].length;
    const candidate = rest.slice(0, end).trim();
    if (candidate.length > 1) sentences.push(candidate);
    rest = rest.slice(end);
  }

  // Very long unpunctuated runs still start speaking promptly.
  while (rest.length > 220) {
    const cut = rest.lastIndexOf(' ', 220);
    const at = cut > 80 ? cut : 220;
    sentences.push(rest.slice(0, at).trim());
    rest = rest.slice(at);
  }

  return { sentences, rest };
}

function scoreVoice(voice: SpeechSynthesisVoice, preset: string): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase().replace('_', '-');
  let score = 0;

  if (preset === 'british_professor') {
    if (lang.startsWith('en-gb')) score += 5;
    if (/daniel|george|arthur|ryan|oliver/.test(name)) score += 2;
    if (/female|zira|aria|samantha/.test(name)) score -= 0.5;
  } else if (preset === 'friendly_male') {
    if (/david|guy|alex|daniel|mark|male|ryan|george/.test(name)) score += 3;
    if (lang.startsWith('en-us')) score += 1.5;
    if (lang.startsWith('en-gb')) score += 0.5;
  } else if (preset === 'encouraging_female') {
    if (/zira|aria|samantha|jenny|karen|female|hazel|susan|libby/.test(name)) score += 3;
    if (lang.startsWith('en-us')) score += 1.5;
  } else if (preset === 'energetic_coach') {
    if (/jenny|aria|guy|alex|samantha/.test(name)) score += 2;
    if (lang.startsWith('en-us')) score += 2;
  }

  if (lang.startsWith('en')) score += 1;
  if (!voice.localService) score += 0.4; // cloud voices on Chromium usually sound richer
  return score;
}

/**
 * A single, observable voice engine.
 *
 * Pause is implemented by cancelling the current utterance and remembering the
 * last spoken character (from boundary events). Play re-speaks only the
 * remainder, so it resumes from the exact syllable the student paused on.
 */
export class VoiceEngine {
  private synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private settings: VoiceSettings = { ...DEFAULT_VOICE_SETTINGS };
  private queue: string[] = [];
  private buffer = '';
  private current: SpeechSynthesisUtterance | null = null;
  private currentText = '';
  private startAt = 0;
  private charIndex = 0;
  private paused = false;
  private listeners = new Set<(state: VoiceState) => void>();
  private voices: SpeechSynthesisVoice[] = [];
  private chosenVoiceName: string | null = null;
  private lastSpoken = '';

  constructor() {
    if (typeof window === 'undefined' || !this.synth) return;
    const load = () => {
      this.voices = this.synth?.getVoices() ?? [];
    };
    load();
    this.synth.addEventListener?.('voiceschanged', load);
    // Chrome populates voices lazily on some platforms.
    window.setTimeout(load, 350);
  }

  get supported() {
    return Boolean(this.synth);
  }

  get state(): VoiceState {
    return {
      mode: this.paused ? 'paused' : this.current ? 'speaking' : 'idle',
      queueLength: this.queue.length,
      voiceName: this.chosenVoiceName,
      supported: Boolean(this.synth),
    };
  }

  subscribe(listener: (state: VoiceState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const state = this.state;
    for (const listener of this.listeners) listener(state);
  }

  configure(settings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...settings };
    if (settings.volume !== undefined && this.current) {
      this.current.volume = this.settings.volume;
    }
    if (settings.voice) this.pickVoice();
    this.emit();
  }

  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    if (!this.voices.length) {
      this.voices = this.synth?.getVoices() ?? [];
    }
    if (!this.voices.length) return null;
    let best: SpeechSynthesisVoice | null = null;
    let bestScore = -Infinity;
    for (const voice of this.voices) {
      const score = scoreVoice(voice, this.settings.voice);
      if (score > bestScore) {
        bestScore = score;
        best = voice;
      }
    }
    this.chosenVoiceName = best?.name ?? null;
    return best;
  }

  /** Queue a whole message (used for already-finished replies). */
  speak(text: string) {
    const clean = String(text || '').trim();
    if (!clean) return;
    this.stop();
    this.queue = takeCompleteSentences(clean).sentences.concat(
      takeCompleteSentences(clean).rest ? [takeCompleteSentences(clean).rest] : [],
    );
    this.playQueue();
  }

  /** Feed streamed text; each completed sentence starts speaking immediately. */
  stream(chunk: string) {
    if (!chunk) return;
    this.buffer += chunk;
    const { sentences, rest } = takeCompleteSentences(this.buffer);
    this.buffer = rest;
    if (sentences.length) {
      this.queue.push(...sentences);
      if (!this.paused) this.playQueue();
    }
  }

  /** End of stream: speak whatever text is left. */
  flush() {
    const tail = this.buffer.trim();
    this.buffer = '';
    if (tail) {
      this.queue.push(tail);
      if (!this.paused) this.playQueue();
    } else {
      this.emit();
    }
  }

  pause() {
    if (!this.synth) return;
    const text = this.currentText;
    const boundary = this.charIndex;
    const elapsed = this.startAt ? Date.now() - this.startAt : 0;
    // Fallback estimate if the browser never emitted a boundary event.
    const estimate = Math.min(text.length, Math.floor((elapsed / 1000) * 13 * this.settings.rate));
    const spoken = Math.max(boundary, estimate);
    const remainder = text.slice(spoken).trim();

    this.paused = true;
    this.current = null;
    this.currentText = '';
    this.charIndex = 0;
    if (remainder) this.queue.unshift(remainder);
    this.lastSpoken = text.slice(0, spoken);
    this.synth.cancel();
    this.emit();
  }

  /** Resume exactly where the student paused. */
  play() {
    if (!this.synth) return;
    this.paused = false;
    this.playQueue();
  }

  toggle() {
    if (this.paused) this.play();
    else if (this.current || this.queue.length) this.pause();
  }

  replayLast() {
    if (this.lastSpoken) this.speak(this.lastSpoken);
  }

  stop() {
    this.paused = false;
    this.queue = [];
    this.buffer = '';
    this.currentText = '';
    this.charIndex = 0;
    this.current = null;
    try {
      this.synth?.cancel();
    } catch {
      /* ignore */
    }
    this.emit();
  }

  private playQueue() {
    if (!this.synth || this.paused || this.current) return;
    const text = this.queue.shift();
    if (!text) {
      this.emit();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = this.settings.rate;
    utterance.volume = this.settings.volume;
    utterance.pitch = this.settings.voice === 'energetic_coach' ? 1.06 : 1;
    const voice = this.pickVoice();
    if (voice) utterance.voice = voice;

    utterance.onboundary = (event) => {
      if (this.current === utterance && typeof event.charIndex === 'number') {
        this.charIndex = event.charIndex;
      }
    };
    utterance.onstart = () => {
      this.startAt = Date.now();
      this.emit();
    };
    utterance.onend = () => {
      if (this.current !== utterance) return;
      this.current = null;
      this.currentText = '';
      this.charIndex = 0;
      this.playQueue();
    };
    utterance.onerror = () => {
      if (this.current !== utterance) return;
      this.current = null;
      this.currentText = '';
      this.charIndex = 0;
      this.playQueue();
    };

    this.current = utterance;
    this.currentText = text;
    this.charIndex = 0;
    this.startAt = Date.now();
    try {
      this.synth.speak(utterance);
    } catch {
      this.current = null;
      this.currentText = '';
    }
    this.emit();
  }
}

export const voiceEngine = new VoiceEngine();
