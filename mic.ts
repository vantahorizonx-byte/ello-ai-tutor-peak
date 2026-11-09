import { useCallback, useEffect, useRef, useState } from 'react';

/* The Web Speech API is not in lib.dom for every TypeScript version, so it is
 * described here explicitly instead of being reached through `any`. */
interface SpeechAlternative {
  readonly transcript: string;
  readonly confidence?: number;
}

interface SpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechAlternative | undefined;
}

interface SpeechResultList {
  readonly length: number;
  readonly [index: number]: SpeechResult | undefined;
}

interface SpeechResultEvent {
  readonly resultIndex: number;
  readonly results: SpeechResultList;
}

interface SpeechErrorEvent {
  readonly error: string;
  readonly message?: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

/** Browser-only: never touched while rendering in a non-DOM (build/SSR) context. */
const getRecognition = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  const win = window as SpeechWindow;
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
};

interface DictationOptions {
  onTranscript?: (text: string) => void;
  onComplete?: (text: string) => void;
  onError?: (message: string) => void;
  silenceMs?: number;
  lang?: string;
}

/**
 * Live dictation on top of the Web Speech Recognition API.
 *
 * Interim results are pushed into the composer as the student speaks, and a
 * short silence window finalises the utterance so the message can be sent
 * automatically — voice pauses are handled as sentence boundaries, not stops.
 */
export function useDictation({
  onTranscript,
  onComplete,
  onError,
  silenceMs = 1150,
  lang = 'en-US',
}: DictationOptions) {
  const [supported] = useState(() => Boolean(getRecognition()));
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const manualStopRef = useRef(false);
  const finalTextRef = useRef('');
  const silenceTimer = useRef<number | null>(null);
  const completeRef = useRef(onComplete);
  const transcriptRef = useRef(onTranscript);
  const errorRef = useRef(onError);

  completeRef.current = onComplete;
  transcriptRef.current = onTranscript;
  errorRef.current = onError;

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimer.current !== null) {
      window.clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  }, []);

  const finalise = useCallback(() => {
    clearSilenceTimer();
    const text = finalTextRef.current.trim();
    finalTextRef.current = '';
    setInterim('');
    if (text) completeRef.current?.(text);
  }, [clearSilenceTimer]);

  const scheduleFinalise = useCallback(() => {
    clearSilenceTimer();
    silenceTimer.current = window.setTimeout(() => {
      const text = finalTextRef.current.trim();
      if (text) {
        finalise();
        manualStopRef.current = true;
        try {
          recognitionRef.current?.stop();
        } catch {
          /* ignore */
        }
      }
    }, silenceMs);
  }, [clearSilenceTimer, finalise, silenceMs]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    clearSilenceTimer();
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setListening(false);
    finalise();
  }, [clearSilenceTimer, finalise]);

  const start = useCallback(() => {
    const Recognition = getRecognition();
    if (!Recognition) {
      errorRef.current?.('Voice dictation needs Chrome or Edge. Typing still works!');
      return;
    }
    if (recognitionRef.current) return;

    const recognition = new Recognition();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      manualStopRef.current = false;
      setListening(true);
    };

    recognition.onresult = (event: SpeechResultEvent) => {
      let live = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalTextRef.current += `${text.trim()} `;
        } else {
          live += text;
        }
      }
      const combined = `${finalTextRef.current}${live}`.replace(/\s+/g, ' ').trim();
      setInterim(live.trim());
      transcriptRef.current?.(combined);
      scheduleFinalise();
    };

    recognition.onerror = (event: SpeechErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errorRef.current?.('Microphone permission was blocked. Allow it in your browser settings.');
        manualStopRef.current = true;
      } else if (event.error === 'no-speech') {
        return;
      } else if (event.error !== 'aborted') {
        errorRef.current?.('Ello could not hear that. Try the mic again.');
      }
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (!manualStopRef.current) {
        // Chrome ends continuous sessions on its own; restart while the student
        // is still talking and keep the transcript.
        try {
          recognition.start();
          recognitionRef.current = recognition;
          setListening(true);
          return;
        } catch {
          /* fall through */
        }
      }
      finalise();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setListening(false);
      errorRef.current?.('Ello could not start the microphone.');
    }
  }, [finalise, lang, scheduleFinalise]);

  const toggle = useCallback(() => {
    if (listening) {
      manualStopRef.current = true;
      clearSilenceTimer();
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
      setListening(false);
      finalise();
    } else {
      finalTextRef.current = '';
      start();
    }
  }, [clearSilenceTimer, finalise, listening, start]);

  useEffect(
    () => () => {
      clearSilenceTimer();
      manualStopRef.current = true;
      try {
        recognitionRef.current?.abort?.();
      } catch {
        /* ignore */
      }
    },
    [clearSilenceTimer],
  );

  return { supported, listening, interim, start, stop, toggle };
}
