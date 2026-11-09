import { useState } from 'react';
import { bestExam, type ExamRecord } from '../lib/progress';
import { QUIZ_TOPICS } from '../lib/local-tutor';
import { CheckIcon, CloseIcon, SparkIcon } from './Icons';

interface Props {
  exams: ExamRecord[];
  onStartExam: () => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export default function ResultsPanel({ exams, onStartExam }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(exams.length ? exams.length - 1 : null);
  const best = bestExam(exams);
  const newestFirst = [...exams].reverse();
  const average = exams.length
    ? Math.round(exams.reduce((sum, exam) => sum + exam.percent, 0) / exams.length)
    : 0;

  if (!exams.length) {
    return (
      <div className="results-panel">
        <header className="panel-head">
          <div>
            <span className="panel-eyebrow">
              <SparkIcon size={14} /> results
            </span>
            <h2 className="panel-title">Your marked papers</h2>
          </div>
        </header>
        <div className="deck-empty">
          <span className="deck-empty-glyph">📈</span>
          <h2 className="deck-empty-title">No papers marked yet</h2>
          <p className="deck-empty-body">
            Sit the ten-question mock exam and every mark, score and topic breakdown lands here.
          </p>
          <button type="button" className="big-cta" onClick={onStartExam}>
            📝 Start my mock exam
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="results-panel">
      <header className="panel-head">
        <div>
          <span className="panel-eyebrow">
            <SparkIcon size={14} /> results
          </span>
          <h2 className="panel-title">Your marked papers</h2>
        </div>
        <button type="button" className="workspace-tab" onClick={onStartExam}>
          New attempt
        </button>
      </header>

      <div className="stat-grid">
        <div className="stat-card sky">
          <span className="stat-label">Best</span>
          <strong className="stat-value">{best ? `${best.percent}%` : '—'}</strong>
          <span className="stat-foot">{best ? `${best.score} of ${best.total}` : 'no marks yet'}</span>
        </div>
        <div className="stat-card sage">
          <span className="stat-label">Average</span>
          <strong className="stat-value">{average}%</strong>
          <span className="stat-foot">across {exams.length} paper{exams.length === 1 ? '' : 's'}</span>
        </div>
        <div className="stat-card coral">
          <span className="stat-label">Attempts</span>
          <strong className="stat-value">{exams.length}</strong>
          <span className="stat-foot">last on {formatDate(exams[exams.length - 1].at)}</span>
        </div>
      </div>

      <ul className="attempt-list">
        {newestFirst.map((exam, index) => {
          const original = exams.length - 1 - index;
          const open = openIndex === original;
          return (
            <li key={`${exam.at}-${index}`} className={open ? 'attempt open' : 'attempt'}>
              <button
                type="button"
                className="attempt-head"
                onClick={() => setOpenIndex(open ? null : original)}
                aria-expanded={open}
              >
                <span className="attempt-date">{formatDate(exam.at)}</span>
                <span className="attempt-bar" aria-hidden>
                  <span style={{ width: `${exam.percent}%` }} />
                </span>
                <span className="attempt-score">
                  {exam.score}/{exam.total}
                  <em>{exam.percent}%</em>
                </span>
              </button>

              {open && exam.breakdown && (
                <ul className="attempt-breakdown">
                  {exam.breakdown.map((item) => (
                    <li key={item.id} className={item.correct ? 'right' : 'wrong'}>
                      <span className="attempt-mark">
                        {item.correct ? <CheckIcon size={12} /> : <CloseIcon size={12} />}
                      </span>
                      {QUIZ_TOPICS[item.id] ?? item.id}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
