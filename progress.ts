/** Local study progress: activity days, exam history, mastered cards. */

export interface ExamRecord {
  percent: number;
  score: number;
  total: number;
  at: string;
  /** Per-question outcome, kept small so history stays cheap. */
  breakdown?: { id: string; correct: boolean }[];
}

export interface ProgressState {
  /** ISO dates (yyyy-mm-dd) the student opened the workspace. */
  activity: string[];
  exams: ExamRecord[];
}

const KEY = 'ello.progress';

const today = () => new Date().toISOString().slice(0, 10);

export function readProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      const value = parsed as Partial<ProgressState>;
      return {
        activity: Array.isArray(value.activity) ? value.activity.slice(-120) : [],
        exams: Array.isArray(value.exams) ? value.exams.slice(-40) : [],
      };
    }
  } catch {
    /* ignore */
  }
  return { activity: [], exams: [] };
}

const write = (state: ProgressState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage blocked */
  }
};

/** Mark today as a study day (called when the workspace opens). */
export function recordStudyDay(): ProgressState {
  const state = readProgress();
  const day = today();
  if (!state.activity.includes(day)) {
    state.activity = [...state.activity, day].slice(-120);
    write(state);
  }
  return state;
}

export function recordExam(result: {
  percent: number;
  score: number;
  total: number;
  results?: { id: string; correct: boolean }[];
}): ProgressState {
  const state = readProgress();
  // Keep only the summary and a tiny per-question flag — never the full paper.
  const entry: ExamRecord = {
    percent: result.percent,
    score: result.score,
    total: result.total,
    at: new Date().toISOString(),
    ...(result.results
      ? { breakdown: result.results.map((item) => ({ id: item.id, correct: item.correct })) }
      : {}),
  };
  state.exams = [...state.exams, entry].slice(-40);
  write(state);
  return state;
}

/** Consecutive study days ending today (or yesterday, before studying today). */
export function studyStreak(activity: string[]): number {
  const days = new Set(activity);
  const cursor = new Date();
  if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Last seven days, oldest first, with an `active` flag for the chart. */
export function lastWeek(activity: string[]): { date: string; label: string; active: boolean }[] {
  const days = new Set(activity);
  const out: { date: string; label: string; active: boolean }[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const iso = date.toISOString().slice(0, 10);
    out.push({
      date: iso,
      label: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
      active: days.has(iso),
    });
  }
  return out;
}

export const bestExam = (exams: ExamRecord[]): ExamRecord | null =>
  exams.length ? exams.reduce((best, item) => (item.percent > best.percent ? item : best)) : null;
