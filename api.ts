import type { Flashcard, QuizQuestion, SessionSummary, StudySession, User, VoiceSettings } from './types';
import {
  isNumber,
  isRecord,
  isString,
  normalizeBoard,
  normalizeFlashcards,
  normalizeGrade,
  normalizeMessage,
  normalizeQuiz,
  normalizeSession,
  normalizeSessionPayload,
  normalizeSessionSummary,
  normalizeUser,
} from './guards';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body && !(init.body instanceof FormData)) headers['content-type'] = 'application/json';

  const res = await fetch(path, { credentials: 'same-origin', ...init, headers });
  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }
  if (!res.ok) {
    throw new ApiError(errorFrom(data, 'Ello could not complete that request.'), res.status);
  }
  return data as T;
}

const errorFrom = (raw: unknown, fallback: string): string =>
  isRecord(raw) && isString(raw.error) && raw.error ? raw.error : fallback;

const requireUser = (raw: unknown): User => {
  const user = isRecord(raw) ? normalizeUser(raw.user) : null;
  if (!user) throw new ApiError('Ello could not read your account.', 500);
  return user;
};

const post = <T,>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

const patch = <T,>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

/** Every response below is treated as untrusted JSON and normalised before use. */
export const api = {
  me: async () => {
    const raw = await request<unknown>('/api/auth/me');
    return { user: isRecord(raw) ? normalizeUser(raw.user) : null };
  },

  login: async (email: string, password: string) => ({
    user: requireUser(await post<unknown>('/api/auth/login', { email, password })),
  }),

  signup: async (name: string, email: string, password: string) => ({
    user: requireUser(await post<unknown>('/api/auth/signup', { name, email, password })),
  }),

  logout: () => post<{ ok: true }>('/api/auth/logout'),

  updateProfile: async (body: { display_name?: string; settings?: Partial<VoiceSettings> }) => ({
    user: requireUser(await patch<unknown>('/api/auth/profile', body)),
  }),

  listSessions: async () => {
    const raw = await request<unknown>('/api/sessions');
    const sessions = (isRecord(raw) && Array.isArray(raw.sessions) ? raw.sessions : [])
      .map(normalizeSessionSummary)
      .filter((summary): summary is SessionSummary => summary !== null);
    return { sessions };
  },

  createSession: async (title?: string) =>
    normalizeSessionPayload(await post<unknown>('/api/sessions', { title })),

  getSession: async (id: string) => normalizeSessionPayload(await request<unknown>(`/api/sessions/${id}`)),

  patchSession: async (id: string, body: { title?: string; canvas?: unknown }) => {
    const raw = await patch<unknown>(`/api/sessions/${id}`, body);
    return { session: normalizeSession(isRecord(raw) ? raw.session : null) };
  },

  deleteSession: (id: string) => request<{ ok: true }>(`/api/sessions/${id}`, { method: 'DELETE' }),

  regenerateLesson: async (id: string) => {
    const raw = await post<unknown>(`/api/sessions/${id}/lesson`);
    const session = normalizeSession(isRecord(raw) ? raw.session : null);
    return { session, board: session.board };
  },

  generateFlashcards: async (id: string) => {
    const raw = await post<unknown>(`/api/sessions/${id}/flashcards`);
    return {
      flashcards: normalizeFlashcards(isRecord(raw) ? raw.flashcards : null),
      session: normalizeSession(isRecord(raw) ? raw.session : null),
    };
  },

  setCardStatus: async (sessionId: string, cardId: string, status: Flashcard['status']) => {
    const raw = await patch<unknown>(`/api/sessions/${sessionId}/flashcards/${cardId}`, { status });
    return { flashcards: normalizeFlashcards(isRecord(raw) ? raw.flashcards : null) };
  },

  generateQuiz: async (id: string) => {
    const raw = await post<unknown>(`/api/sessions/${id}/quiz`);
    return { quiz: normalizeQuiz(isRecord(raw) ? raw.quiz : null) };
  },

  gradeQuiz: async (id: string, answers: { questionId: string; value: string | number }[]) => {
    const raw = await post<unknown>(`/api/sessions/${id}/quiz/grade`, { answers });
    return { grade: normalizeGrade(isRecord(raw) ? raw.grade : null) };
  },
};

export interface UploadResult {
  session: StudySession;
  messages: import('./types').ChatMessage[];
  parsed?: { kind: string; pages?: number | null; figures?: number; characters?: number; truncated?: boolean };
}

const normalizeUploadResult = (raw: unknown): UploadResult => {
  const { session, messages } = normalizeSessionPayload(raw);
  const parsed = isRecord(raw) && isRecord(raw.parsed) ? raw.parsed : null;
  return {
    session,
    messages,
    ...(parsed
      ? {
          parsed: {
            kind: isString(parsed.kind) ? parsed.kind : 'file',
            pages: isNumber(parsed.pages) ? parsed.pages : null,
            figures: isNumber(parsed.figures) ? parsed.figures : 0,
            characters: isNumber(parsed.characters) ? parsed.characters : 0,
            truncated: parsed.truncated === true,
          },
        }
      : {}),
  };
};

/** Upload with real progress — 500MB files need a progress bar, not a spinner. */
export function uploadDocument(
  sessionId: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/sessions/${sessionId}/upload`);
    xhr.withCredentials = true;
    xhr.responseType = 'text';

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new ApiError('Upload failed — check your connection.', 0));
    xhr.onload = () => {
      let data: unknown = {};
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        data = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve(normalizeUploadResult(data));
      } else {
        reject(new ApiError(errorFrom(data, 'Ello could not read that file.'), xhr.status));
      }
    };
    xhr.send(form);
  });
}

export interface StreamHandlers {
  onUser?: (message: import('./types').ChatMessage) => void;
  onDelta: (text: string) => void;
  onBoard?: (board: import('./types').Board) => void;
  onDone: (message: import('./types').ChatMessage) => void;
  onError?: (message: string) => void;
}

/** Streams the tutor reply over SSE and feeds text to the voice engine. */
export async function streamChat(
  sessionId: string,
  message: string,
  handlers: StreamHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`/api/sessions/${sessionId}/chat`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!res.ok) {
    const data: unknown = await res.json().catch(() => ({}));
    throw new ApiError(errorFrom(data, 'Ello could not answer that right now.'), res.status);
  }
  if (!res.body) throw new ApiError('Streaming is not supported in this browser.', 0);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let frameEnd: number;
    while ((frameEnd = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, frameEnd);
      buffer = buffer.slice(frameEnd + 2);
      const dataLine = frame
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.startsWith('data:'));
      if (!dataLine) continue;
      try {
        const payload: unknown = JSON.parse(dataLine.slice(5).trim());
        if (!isRecord(payload)) continue;

        switch (payload.type) {
          case 'user': {
            const message = normalizeMessage(payload.message);
            if (message) handlers.onUser?.(message);
            break;
          }
          case 'delta':
            if (isString(payload.text)) handlers.onDelta(payload.text);
            break;
          case 'board': {
            const board = normalizeBoard(payload.board);
            if (board) handlers.onBoard?.(board);
            break;
          }
          case 'done': {
            const message = normalizeMessage(payload.message);
            if (message) handlers.onDone(message);
            break;
          }
          case 'error':
            if (isString(payload.message)) handlers.onError?.(payload.message);
            break;
          default:
            break;
        }
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}

export const formatBytes = (bytes: number) => {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** index;
  return `${value >= 10 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
};

export const relativeTime = (iso: string) => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'recently';
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const initialsFromName = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'EE';

export type { QuizQuestion };
