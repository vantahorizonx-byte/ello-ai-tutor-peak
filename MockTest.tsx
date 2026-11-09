import { useEffect, useMemo, useState } from 'react';
import type { GradeResult, Quiz } from '../types';
import { CheckIcon, CloseIcon, RefreshIcon, SendIcon } from './Icons';

interface Props {
  quiz: Quiz | null;
  loading: boolean;
  onGenerate: () => Promise<void> | void;
  onGrade: (answers: { questionId: string; value: string | number }[]) => Promise<GradeResult>;
  hasFile: boolean;
  onNotice: (message: string) => void;
}

export default function MockTest({ quiz, loading, onGenerate, onGrade, hasFile, onNotice }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const questions = useMemo(() => quiz?.questions ?? [], [quiz]);
  const total = questions.length;
  const question = questions[index];
  const answeredCount = questions.filter((item) => (answers[item.id] ?? '').trim().length > 0).length;
  const allAnswered = total > 0 && answeredCount === total;

  useEffect(() => {
    setIndex(0);
    setAnswers({});
    setGrade(null);
  }, [quiz?.generatedAt]);

  const retake = async () => {
    setGrade(null);
    setAnswers({});
    setIndex(0);
    await onGenerate();
  };

  const submit = async () => {
    if (!quiz) return;
    if (!allAnswered) {
      onNotice('Answer every question first — Ello marks the whole paper in one go.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await onGrade(
        questions.map((item) => ({
          questionId: item.id,
          value: item.type === 'short' ? answers[item.id] ?? '' : Number(answers[item.id]),
        })),
      );
      setGrade(result);
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Ello could not mark that paper.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------- results -------------------------------- */

  if (grade) {
    const circumference = 2 * Math.PI * 42;
    return (
      <div className="test-wrap">
        <div className="grade-card">
          <div className="grade-hero">
            <div className="score-ring">
              <svg viewBox="0 0 100 100" aria-hidden>
                <circle cx="50" cy="50" r="42" className="ring-track" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="ring-value"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (circumference * grade.percent) / 100}
                />
              </svg>
              <span className="score-text">
                {grade.percent}
                <small>%</small>
              </span>
            </div>
            <div className="grade-copy">
              <span className="canvas-eyebrow">Marked paper</span>
              <h2 className="grade-verdict">{grade.verdict}</h2>
              <p className="grade-score">
                {grade.score} of {grade.total} correct · all at once, just like the real thing
              </p>
            </div>
          </div>

          <div className="grade-list">
            {grade.results.map((result, itemIndex) => (
              <article key={result.id} className={`grade-item ${result.correct ? 'right' : 'wrong'}`}>
                <span className="grade-mark" aria-hidden>
                  {result.correct ? <CheckIcon size={16} /> : <CloseIcon size={16} />}
                </span>
                <div className="grade-body">
                  <p className="grade-q">
                    <span>{itemIndex + 1}.</span> {result.prompt}
                  </p>
                  <p className="grade-answer">
                    Your answer: <strong>{result.yourAnswer}</strong>
                  </p>
                  {!result.correct && (
                    <p className="grade-correct">
                      Correct answer: <strong>{result.correctAnswer}</strong>
                    </p>
                  )}
                  <p className="grade-fix">
                    <span>how to fix it</span>
                    {result.explanation}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="grade-actions">
            <button type="button" className="primary-btn" onClick={retake} disabled={loading}>
              <RefreshIcon size={16} /> {loading ? 'Writing new questions…' : 'New mock test'}
            </button>
            <button
              type="button"
              className="ghost-action"
              onClick={() => {
                setGrade(null);
                setIndex(0);
              }}
            >
              Review my answers
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------- intro --------------------------------- */

  if (!quiz) {
    return (
      <div className="deck-empty">
        <span className="deck-empty-glyph">📝</span>
        <h2 className="deck-empty-title">Ten questions. One mark at the end.</h2>
        <p className="deck-empty-body">
          Ello writes a mock test from this chapter — ten multiple-choice questions. You get{' '}
          <strong>no right-or-wrong feedback</strong> while you answer. The full marked paper appears only after you
          submit the last question.
        </p>
        {hasFile ? (
          <button type="button" className="big-cta" onClick={() => void onGenerate()} disabled={loading}>
            {loading ? 'Writing your paper…' : '📝 Start my mock test'}
          </button>
        ) : (
          <p className="deck-empty-hint">Upload your notes first so Ello knows what to test you on.</p>
        )}
      </div>
    );
  }

  /* ------------------------------- in progress ---------------------------- */

  const value = question ? answers[question.id] ?? '' : '';

  return (
    <div className="test-wrap">
      <div className="test-head">
        <div>
          <p className="canvas-eyebrow">Mock test engine</p>
          <h2 className="test-title">
            Question {index + 1} of {total}
          </h2>
        </div>
        <span className="no-feedback-pill">feedback after submit</span>
      </div>

      <div className="test-dots" aria-hidden>
        {questions.map((item, dotIndex) => (
          <span
            key={item.id}
            className={`test-dot ${dotIndex < index ? 'done' : ''} ${dotIndex === index ? 'current' : ''} ${
              answers[item.id] ? 'answered' : ''
            }`}
          />
        ))}
      </div>

      {question && (
        <article className="question-card" key={question.id}>
          <div className="question-meta">
            <span className="question-index">{String(index + 1).padStart(2, '0')}</span>
            <span className="question-type">
              {question.type === 'mcq' ? 'multiple choice' : 'written answer'}
            </span>
          </div>

          <p className="question-prompt">{question.prompt}</p>

          {question.type === 'mcq' && question.options ? (
            <div className="option-list" role="radiogroup" aria-label="Answer options">
              {question.options.map((option, optionIndex) => {
                const selected = value === String(optionIndex);
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`option ${selected ? 'selected' : ''}`}
                    onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: String(optionIndex) }))}
                  >
                    <span className="option-key">{String.fromCharCode(65 + optionIndex)}</span>
                    <span className="option-text">{option}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <textarea
              className="short-answer"
              rows={4}
              value={value}
              placeholder="Write your answer in one or two sentences…"
              onChange={(event) => setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))}
            />
          )}
        </article>
      )}

      <div className="test-nav">
        <button
          type="button"
          className="ghost-action"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0}
        >
          ← Back
        </button>

        <span className="test-progress">
          {answeredCount} of {total} answered
        </span>

        {index < total - 1 ? (
          <button
            type="button"
            className="primary-btn"
            onClick={() => setIndex((current) => Math.min(total - 1, current + 1))}
            disabled={!value.trim()}
          >
            Next question →
          </button>
        ) : (
          <button type="button" className="primary-btn submit" onClick={submit} disabled={!allAnswered || submitting}>
            <SendIcon size={16} /> {submitting ? 'Marking…' : 'Submit paper'}
          </button>
        )}
      </div>

      <p className="test-note">
        Ello is holding your marks back until the last question — exactly how it should feel in an exam hall.
      </p>
    </div>
  );
}
