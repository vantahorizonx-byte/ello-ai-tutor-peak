import { bestExam, lastWeek, studyStreak, type ExamRecord } from '../lib/progress';
import { SparkIcon } from './Icons';
import type { Flashcard } from '../types';

interface Props {
  activity: string[];
  exams: ExamRecord[];
  cards: Flashcard[];
  docCount: number;
  onNavigate: (target: 'upload' | 'cards' | 'test' | 'chat') => void;
}

const readUploadCount = (): number => {
  try {
    const raw = localStorage.getItem('ello.workspace.uploads');
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
};

export default function ProgressPanel({ activity, exams, cards, docCount, onNavigate }: Props) {
  const streak = studyStreak(activity);
  const week = lastWeek(activity);
  const mastered = cards.filter((card) => card.status === 'mastered').length;
  const best = bestExam(exams);
  const docs = docCount || readUploadCount();
  const lastExam = exams[exams.length - 1];

  const nextStep =
    docs === 0
      ? { label: 'Upload your first chapter', action: 'upload' as const, hint: 'A PDF or a photo of your notes is enough.' }
      : mastered < cards.length
        ? { label: 'Master a few flashcards', action: 'cards' as const, hint: `${mastered} of ${cards.length} cards sorted so far.` }
        : !best
          ? { label: 'Sit your first mock exam', action: 'test' as const, hint: 'Four questions, marked at the end.' }
          : { label: 'Ask Ello a question', action: 'chat' as const, hint: 'Stuck on a step? Ask for the working.' };

  return (
    <div className="progress-panel">
      <header className="panel-head">
        <div>
          <span className="panel-eyebrow">
            <SparkIcon size={14} /> your progress
          </span>
          <h2 className="panel-title">How it’s going</h2>
        </div>
        <span className="panel-hint">{activity.length} study day{activity.length === 1 ? '' : 's'} logged</span>
      </header>

      <div className="stat-grid">
        <div className="stat-card coral">
          <span className="stat-label">Streak</span>
          <strong className="stat-value">🔥 {streak}</strong>
          <span className="stat-foot">day{streak === 1 ? '' : 's'} in a row</span>
        </div>
        <div className="stat-card sage">
          <span className="stat-label">Cards mastered</span>
          <strong className="stat-value">
            {mastered}
            <em>/{cards.length}</em>
          </strong>
          <span className="stat-foot">flashcards sorted</span>
        </div>
        <div className="stat-card sky">
          <span className="stat-label">Best exam</span>
          <strong className="stat-value">{best ? `${best.percent}%` : '—'}</strong>
          <span className="stat-foot">{best ? `${best.score} of ${best.total} correct` : 'not attempted yet'}</span>
        </div>
        <div className="stat-card sand">
          <span className="stat-label">Documents</span>
          <strong className="stat-value">{docs}</strong>
          <span className="stat-foot">uploaded to this board</span>
        </div>
      </div>

      <section className="week-card">
        <div className="week-head">
          <h3>This week</h3>
          <span>{week.filter((day) => day.active).length} of 7 days</span>
        </div>
        <div className="week-bars">
          {week.map((day) => (
            <div key={day.date} className={day.active ? 'week-day active' : 'week-day'}>
              <span className="week-bar" />
              <span className="week-label">{day.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="next-card">
        <span className="next-eyebrow">Suggested next step</span>
        <h3>{nextStep.label}</h3>
        <p>{nextStep.hint}</p>
        <button type="button" className="listen-play" onClick={() => onNavigate(nextStep.action)}>
          Go to {nextStep.action === 'upload' ? 'upload' : nextStep.action === 'cards' ? 'flashcards' : nextStep.action === 'test' ? 'mock exam' : 'chat'}
        </button>
        {lastExam && (
          <p className="next-foot">
            Last paper: {lastExam.percent}% · {new Date(lastExam.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
        )}
      </section>
    </div>
  );
}
