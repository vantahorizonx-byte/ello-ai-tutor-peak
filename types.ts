export type Role = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  created_at?: string;
  streaming?: boolean;
}

export type Tone = 'coral' | 'sage' | 'sky' | 'sand';
export type DiagramKind = 'forces' | 'flow' | 'cycle' | 'axes';

export interface BoardMediaItem {
  url: string;
  caption?: string;
}

export interface BoardSection {
  title: string;
  body: string;
  tone: Tone;
}

export interface Board {
  headline: string;
  kicker: string;
  subtitle: string;
  focus: { label: string; value: string; note: string };
  formulas: { label: string; expr: string }[];
  diagram: {
    kind: DiagramKind;
    caption: string;
    items: { label: string; dir: string }[];
  };
  sections: BoardSection[];
  recap: string[];
  media: BoardMediaItem[];
}

export type CardStatus = 'new' | 'mastered' | 'review';

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  hint?: string;
  status: CardStatus;
}

export interface QuizQuestion {
  id: string;
  type: 'mcq' | 'short';
  prompt: string;
  options?: string[];
}

export interface Quiz {
  questions: QuizQuestion[];
  generatedAt: string;
  lastAttempt?: { score: number; total: number; percent: number; gradedAt: string };
}

export interface SessionFile {
  name: string;
  size: number;
  kind: string;
}

export interface SessionSummary {
  id: string;
  title: string;
  subject?: string | null;
  source_file_name?: string | null;
  updated_at: string;
}

export interface CanvasState {
  strokes?: { d: string; color?: string }[];
  lastTurnAt?: string;
}

export interface StudySession {
  id: string;
  title: string;
  subject?: string | null;
  file: SessionFile | null;
  media: BoardMediaItem[];
  board: Board | null;
  flashcards: Flashcard[];
  quiz: Quiz | null;
  canvas: CanvasState;
  docSummary?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceSettings {
  voice: string;
  rate: number;
  volume: number;
  autoplay: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  initials: string;
  streak: number;
  longestStreak?: number;
  settings: Partial<VoiceSettings>;
}

export interface GradeQuestionResult {
  id: string;
  type: 'mcq' | 'short';
  prompt: string;
  yourAnswer: string;
  correctAnswer: string;
  correct: boolean;
  explanation: string;
  options?: string[];
}

export interface GradeResult {
  score: number;
  total: number;
  percent: number;
  verdict: string;
  results: GradeQuestionResult[];
  gradedAt: string;
}

export type BoardTab = 'board' | 'cards' | 'test';
