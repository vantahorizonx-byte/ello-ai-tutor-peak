import { useState } from 'react';
import { api } from '../api';
import type { BoardTab, GradeResult, StudySession } from '../types';
import BoardCanvas from './BoardCanvas';
import Flashcards from './Flashcards';
import MockTest from './MockTest';
import {
  CheckIcon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  SparkIcon,
} from './Icons';

interface Props {
  session: StudySession | null;
  tab: BoardTab;
  onTabChange: (tab: BoardTab) => void;
  onSaveCanvas: (canvas: unknown) => void;
  saveState: 'saved' | 'saving';
  onSessionPatch: (patch: Partial<StudySession>) => void;
  onNotice: (message: string) => void;
  onOpenSettings: () => void;
  voiceMode: 'idle' | 'speaking' | 'paused';
  onToggleVoice: () => void;
}

const TABS: { id: BoardTab; label: string }[] = [
  { id: 'board', label: 'Interactive Board' },
  { id: 'cards', label: 'Study Flashcards' },
  { id: 'test', label: 'Mock Test Engine' },
];

export default function LiveBoard({
  session,
  tab,
  onTabChange,
  onSaveCanvas,
  saveState,
  onSessionPatch,
  onNotice,
  onOpenSettings,
  voiceMode,
  onToggleVoice,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  const generateCards = async () => {
    if (!session) return;
    setCardsLoading(true);
    try {
      const result = await api.generateFlashcards(session.id);
      onSessionPatch({ flashcards: result.flashcards });
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Ello could not build those cards.');
    } finally {
      setCardsLoading(false);
    }
  };

  const generateQuiz = async () => {
    if (!session) return;
    setQuizLoading(true);
    try {
      const result = await api.generateQuiz(session.id);
      onSessionPatch({ quiz: result.quiz });
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Ello could not write that test.');
    } finally {
      setQuizLoading(false);
    }
  };

  const gradeQuiz = async (answers: { questionId: string; value: string | number }[]): Promise<GradeResult> => {
    if (!session) throw new Error('No board open.');
    const result = await api.gradeQuiz(session.id, answers);
    return result.grade;
  };

  const setCardStatus = async (cardId: string, status: 'new' | 'mastered' | 'review') => {
    if (!session) return;
    const previous = session.flashcards;
    onSessionPatch({
      flashcards: previous.map((card) => (card.id === cardId ? { ...card, status } : card)),
    });
    try {
      const result = await api.setCardStatus(session.id, cardId, status);
      onSessionPatch({ flashcards: result.flashcards });
    } catch {
      onSessionPatch({ flashcards: previous });
      onNotice('That card change did not save. Try again.');
    }
  };

  const regenerateBoard = async () => {
    if (!session?.file) {
      onNotice('Upload your notes first — then I can redraw the board.');
      return;
    }
    setRefreshing(true);
    try {
      const result = await api.regenerateLesson(session.id);
      onSessionPatch({ board: result.board });
      onNotice('Fresh board, same notes.');
    } catch (err) {
      onNotice(err instanceof Error ? err.message : 'Ello could not redraw the board.');
    } finally {
      setRefreshing(false);
    }
  };

  const masteredCount = session?.flashcards.filter((card) => card.status === 'mastered').length ?? 0;
  const boardTitle = session?.file ? session.file.name.replace(/\.[a-z0-9]{2,5}$/i, '') : session?.title || 'lesc107';

  return (
    <section className="panel board-panel" aria-label="Live board">
      <div className="board-top">
        <div className="board-title-block">
          <span className="eyebrow">Live board</span>
          <div className="board-file-row">
            <h1 className="board-file-title" title={boardTitle}>
              <span className="board-dot">•</span> {boardTitle}
            </h1>
            <span className="hand-badge">✍️ hand-drawn</span>
            <span className={`saved-pill ${saveState}`}>
              <CheckIcon size={12} /> {saveState === 'saved' ? 'SAVED' : 'SAVING'}
            </span>
          </div>
        </div>

        <div className="board-actions">
          <button
            type="button"
            className={`icon-btn voice-btn ${voiceMode}`}
            onClick={onToggleVoice}
            title={voiceMode === 'speaking' ? 'Pause Ello’s voice' : 'Read the board aloud'}
            aria-label={voiceMode === 'speaking' ? 'Pause Ello’s voice' : 'Read the board aloud'}
          >
            {voiceMode === 'speaking' ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onOpenSettings}
            title="Voice settings"
            aria-label="Voice settings"
          >
            <SparkIcon size={16} />
          </button>
          <button
            type="button"
            className={`icon-btn ${refreshing ? 'spin' : ''}`}
            onClick={regenerateBoard}
            title="Redraw the board from these notes"
            aria-label="Redraw the board"
            disabled={refreshing}
          >
            <RefreshIcon size={16} />
          </button>
        </div>
      </div>

      <div className="board-tabs" role="tablist" aria-label="Board modes">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`board-tab ${tab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            {item.label}
            {item.id === 'cards' && session?.flashcards.length ? (
              <span className="tab-count">{masteredCount}/{session.flashcards.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="board-body">
        {!session ? (
          <div className="board-loading">
            <span className="loader-ring" />
            <p>Opening your board…</p>
          </div>
        ) : tab === 'board' ? (
          <BoardCanvas
            board={session.board}
            canvas={session.canvas}
            onSaveCanvas={onSaveCanvas}
            hasFile={Boolean(session.file)}
          />
        ) : tab === 'cards' ? (
          <Flashcards
            cards={session.flashcards}
            loading={cardsLoading}
            onGenerate={generateCards}
            onSetStatus={setCardStatus}
            hasFile={Boolean(session.file)}
            onNotice={onNotice}
          />
        ) : (
          <MockTest
            quiz={session.quiz}
            loading={quizLoading}
            onGenerate={generateQuiz}
            onGrade={gradeQuiz}
            hasFile={Boolean(session.file)}
            onNotice={onNotice}
          />
        )}
      </div>
    </section>
  );
}
