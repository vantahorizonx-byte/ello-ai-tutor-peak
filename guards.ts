import type {
  Board,
  BoardMediaItem,
  BoardSection,
  CanvasState,
  CardStatus,
  ChatMessage,
  DiagramKind,
  Flashcard,
  GradeQuestionResult,
  GradeResult,
  Quiz,
  QuizQuestion,
  SessionFile,
  SessionSummary,
  StudySession,
  Tone,
  User,
  VoiceSettings,
} from './types';

/* ------------------------------------------------------------------ *
 * Primitive guards.
 *
 * Everything the AI engine returns is untrusted: it comes from a model,
 * it is stored as JSON text, and it can be a partial object after a
 * failed generation. These helpers let the client prove the shape before
 * a component ever dereferences it, so a malformed reply can never crash
 * a render with `undefined.map is not a function`.
 * ------------------------------------------------------------------ */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isString = (value: unknown): value is string => typeof value === 'string';

export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const text = (value: unknown, max: number): string => (isString(value) ? value.trim().slice(0, max) : '');

const list = (value: unknown, max = 60): unknown[] => (Array.isArray(value) ? value.slice(0, max) : []);

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  isString(value) && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

const clampNumber = (value: unknown, min: number, max: number, fallback: number): number =>
  isNumber(value) ? Math.min(max, Math.max(min, value)) : fallback;

/* ------------------------------------------------------------------ *
 * Board
 * ------------------------------------------------------------------ */

const TONES = ['coral', 'sage', 'sky', 'sand'] as const;
const DIAGRAM_KINDS = ['forces', 'flow', 'cycle', 'axes'] as const;

export const isTone = (value: unknown): value is Tone => oneOf(value, TONES, 'sand') === value;

export const isDiagramKind = (value: unknown): value is DiagramKind =>
  oneOf(value, DIAGRAM_KINDS, 'forces') === value;

/** Only same-origin media paths, absolute http(s) URLs or inline images are renderable. */
export const isSafeMediaUrl = (value: unknown): value is string =>
  isString(value) &&
  (/^\/media\/[\w.-]+$/.test(value) || /^https?:\/\/[^\s]+$/.test(value) || /^data:image\/[\w.+-]+;base64,/.test(value));

export function isBoardSection(value: unknown): value is BoardSection {
  return isRecord(value) && isString(value.title) && isString(value.body);
}

export function isBoardMedia(value: unknown): value is BoardMediaItem {
  return isRecord(value) && isSafeMediaUrl(value.url);
}

export function isBoard(value: unknown): value is Board {
  return (
    isRecord(value) &&
    isString(value.headline) &&
    isRecord(value.focus) &&
    isRecord(value.diagram) &&
    Array.isArray(value.diagram.items) &&
    Array.isArray(value.sections) &&
    Array.isArray(value.formulas) &&
    Array.isArray(value.recap) &&
    Array.isArray(value.media)
  );
}

export function normalizeBoard(raw: unknown): Board | null {
  if (!isRecord(raw)) return null;

  const focus = isRecord(raw.focus) ? raw.focus : {};
  const diagram = isRecord(raw.diagram) ? raw.diagram : {};

  const sections: BoardSection[] = list(raw.sections, 4)
    .filter(isBoardSection)
    .map((section) => ({
      title: text(section.title, 60) || 'Key idea',
      body: text(section.body, 260),
      tone: oneOf(section.tone, TONES, 'sand'),
    }))
    .filter((section) => section.body.length > 0);

  const formulas = list(raw.formulas, 3)
    .filter(isRecord)
    .map((formula) => ({ label: text(formula.label, 40) || 'Formula', expr: text(formula.expr, 80) }))
    .filter((formula) => formula.expr.length > 0);

  const items = list(diagram.items, 6)
    .filter(isRecord)
    .map((item) => ({
      label: text(item.label, 40) || 'Idea',
      dir: oneOf(item.dir, ['left', 'right', 'up', 'down', 'diag', 'diag-left'] as const, 'right'),
    }));

  const media: BoardMediaItem[] = list(raw.media, 4)
    .filter(isBoardMedia)
    .map((item) => ({ url: item.url, caption: text(item.caption, 120) }));

  return {
    headline: text(raw.headline, 80) || 'Your board',
    kicker: text(raw.kicker, 80),
    subtitle: text(raw.subtitle, 220),
    focus: {
      label: text(focus.label, 40) || 'Focus',
      value: text(focus.value, 60) || '—',
      note: text(focus.note, 200),
    },
    formulas,
    diagram: {
      kind: oneOf(diagram.kind, DIAGRAM_KINDS, 'forces'),
      caption: text(diagram.caption, 140),
      items,
    },
    sections,
    recap: list(raw.recap, 4)
      .map((line) => text(line, 140))
      .filter(Boolean),
    media,
  };
}

/* ------------------------------------------------------------------ *
 * Canvas ink
 * ------------------------------------------------------------------ */

const CARD_STATUSES = ['new', 'mastered', 'review'] as const;

export const isCardStatus = (value: unknown): value is CardStatus =>
  oneOf(value, CARD_STATUSES, 'new') === value;

export function isCanvasStroke(value: unknown): value is { d: string; color?: string } {
  return (
    isRecord(value) &&
    isString(value.d) &&
    value.d.length > 0 &&
    value.d.length <= 6000 &&
    /^[MLQC0-9.,\s-]+$/.test(value.d)
  );
}

export function normalizeCanvas(raw: unknown): CanvasState {
  if (!isRecord(raw)) return {};
  const strokes = list(raw.strokes, 500)
    .filter(isCanvasStroke)
    .map((stroke) => ({
      d: stroke.d,
      color: isString(stroke.color) && /^#[0-9a-fA-F]{3,8}$/.test(stroke.color) ? stroke.color : undefined,
    }));
  return {
    ...(strokes.length ? { strokes } : {}),
    ...(isString(raw.lastTurnAt) ? { lastTurnAt: raw.lastTurnAt } : {}),
  };
}

/* ------------------------------------------------------------------ *
 * Flashcards + mock test
 * ------------------------------------------------------------------ */

export function isFlashcard(value: unknown): value is Flashcard {
  return isRecord(value) && isString(value.id) && isString(value.term) && isString(value.definition);
}

export function normalizeFlashcards(raw: unknown): Flashcard[] {
  return list(raw, 40)
    .filter(isFlashcard)
    .map((card) => ({
      id: card.id,
      term: text(card.term, 90),
      definition: text(card.definition, 260),
      hint: isString(card.hint) ? text(card.hint, 60) : undefined,
      status: oneOf(card.status, CARD_STATUSES, 'new'),
    }))
    .filter((card) => card.term.length > 0 && card.definition.length > 0);
}

export function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (!isRecord(value) || !isString(value.id) || !isString(value.prompt)) return false;
  if (value.type === 'short') return true;
  return value.type === 'mcq' && Array.isArray(value.options);
}

export function normalizeQuizQuestion(raw: unknown): QuizQuestion | null {
  if (!isRecord(raw) || !isString(raw.prompt)) return null;
  const prompt = text(raw.prompt, 300);
  if (!prompt) return null;

  if (raw.type === 'short') {
    return { id: text(raw.id, 40) || `q-${prompt.length}`, type: 'short', prompt };
  }

  const options = list(raw.options, 4)
    .map((option) => text(option, 100))
    .filter(Boolean);
  if (options.length < 2) return null;
  return { id: text(raw.id, 40) || `q-${prompt.length}`, type: 'mcq', prompt, options };
}

export function normalizeQuiz(raw: unknown): Quiz | null {
  if (!isRecord(raw)) return null;
  const questions = list(raw.questions, 10)
    .map(normalizeQuizQuestion)
    .filter((question): question is QuizQuestion => question !== null);
  if (!questions.length) return null;

  const attempt = isRecord(raw.lastAttempt) ? raw.lastAttempt : null;
  return {
    questions,
    generatedAt: text(raw.generatedAt, 40) || new Date().toISOString(),
    ...(attempt
      ? {
          lastAttempt: {
            score: clampNumber(attempt.score, 0, 999, 0),
            total: clampNumber(attempt.total, 0, 999, questions.length),
            percent: clampNumber(attempt.percent, 0, 100, 0),
            gradedAt: text(attempt.gradedAt, 40) || new Date().toISOString(),
          },
        }
      : {}),
  };
}

export function normalizeGrade(raw: unknown): GradeResult {
  const record = isRecord(raw) ? raw : {};
  const results: GradeQuestionResult[] = list(record.results, 20)
    .filter(isRecord)
    .map((item) => ({
      id: text(item.id, 40),
      type: item.type === 'short' ? 'short' : 'mcq',
      prompt: text(item.prompt, 300),
      yourAnswer: text(item.yourAnswer, 400),
      correctAnswer: text(item.correctAnswer, 400),
      correct: item.correct === true,
      explanation: text(item.explanation, 400),
      ...(Array.isArray(item.options)
        ? { options: list(item.options, 4).map((option) => text(option, 100)).filter(Boolean) }
        : {}),
    }));

  return {
    score: clampNumber(record.score, 0, 999, 0),
    total: clampNumber(record.total, 0, 999, results.length),
    percent: clampNumber(record.percent, 0, 100, 0),
    verdict: text(record.verdict, 240) || 'Marked.',
    results,
    gradedAt: text(record.gradedAt, 40) || new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ *
 * Chat + session records
 * ------------------------------------------------------------------ */

export function normalizeMessage(raw: unknown, fallbackId?: string): ChatMessage | null {
  if (!isRecord(raw)) return null;
  const content = isString(raw.content) ? raw.content : '';
  if (!content && !fallbackId) return null;
  const role = raw.role === 'user' || raw.role === 'assistant' ? raw.role : 'assistant';
  return {
    id: text(raw.id, 64) || fallbackId || `m-${Date.now()}`,
    role,
    content,
    ...(isString(raw.created_at) ? { created_at: raw.created_at } : {}),
    ...(raw.streaming === true ? { streaming: true } : {}),
  };
}

export function normalizeMessages(raw: unknown): ChatMessage[] {
  return list(raw, 400)
    .map((message, index) => normalizeMessage(message, `m-${index}`))
    .filter((message): message is ChatMessage => message !== null);
}

const normalizeFile = (raw: unknown): SessionFile | null => {
  if (!isRecord(raw) || !isString(raw.name)) return null;
  return {
    name: text(raw.name, 200),
    size: clampNumber(raw.size, 0, Number.MAX_SAFE_INTEGER, 0),
    kind: text(raw.kind, 20) || 'file',
  };
};

export function normalizeSession(raw: unknown): StudySession {
  const record = isRecord(raw) ? raw : {};
  return {
    id: text(record.id, 64),
    title: text(record.title, 200) || 'Untitled board',
    subject: isString(record.subject) ? text(record.subject, 80) : null,
    file: normalizeFile(record.file),
    media: list(record.media, 4)
      .filter(isBoardMedia)
      .map((item) => ({ url: item.url, caption: text(item.caption, 120) })),
    board: normalizeBoard(record.board),
    flashcards: normalizeFlashcards(record.flashcards),
    quiz: normalizeQuiz(record.quiz),
    canvas: normalizeCanvas(record.canvas),
    docSummary: isString(record.docSummary) ? text(record.docSummary, 400) : null,
    createdAt: text(record.createdAt, 40),
    updatedAt: text(record.updatedAt, 40),
  };
}

export function normalizeSessionSummary(raw: unknown): SessionSummary | null {
  if (!isRecord(raw) || !isString(raw.id)) return null;
  return {
    id: text(raw.id, 64),
    title: text(raw.title, 200) || 'Untitled board',
    subject: isString(raw.subject) ? text(raw.subject, 80) : null,
    source_file_name: isString(raw.source_file_name) ? text(raw.source_file_name, 200) : null,
    updated_at: text(raw.updated_at, 40),
  };
}

export interface SessionPayload {
  session: StudySession;
  messages: ChatMessage[];
}

export function normalizeSessionPayload(raw: unknown): SessionPayload {
  const record = isRecord(raw) ? raw : {};
  return {
    session: normalizeSession(record.session),
    messages: normalizeMessages(record.messages),
  };
}

/* ------------------------------------------------------------------ *
 * User + voice settings
 * ------------------------------------------------------------------ */

const VOICE_IDS = ['friendly_male', 'encouraging_female', 'british_professor', 'energetic_coach'] as const;

export function normalizeVoiceSettings(raw: unknown): Partial<VoiceSettings> {
  if (!isRecord(raw)) return {};
  const settings: Partial<VoiceSettings> = {};
  if (isString(raw.voice) && (VOICE_IDS as readonly string[]).includes(raw.voice)) {
    settings.voice = raw.voice;
  }
  if (isNumber(raw.rate)) settings.rate = clampNumber(raw.rate, 0.5, 2, 1);
  if (isNumber(raw.volume)) settings.volume = clampNumber(raw.volume, 0, 1, 0.9);
  if (typeof raw.autoplay === 'boolean') settings.autoplay = raw.autoplay;
  return settings;
}

export function normalizeUser(raw: unknown): User | null {
  if (!isRecord(raw) || !isString(raw.id)) return null;
  return {
    id: text(raw.id, 64),
    name: text(raw.name, 120) || 'Student',
    email: text(raw.email, 200),
    initials: text(raw.initials, 4) || 'EE',
    streak: clampNumber(raw.streak, 0, 10_000, 0),
    ...(isNumber(raw.longestStreak) ? { longestStreak: clampNumber(raw.longestStreak, 0, 10_000, 0) } : {}),
    settings: normalizeVoiceSettings(raw.settings),
  };
}
