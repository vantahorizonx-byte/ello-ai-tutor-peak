import { useEffect, useMemo, useState } from 'react';
import type { CardStatus, Flashcard } from '../types';
import { CheckIcon, RefreshIcon, SparkIcon } from './Icons';

interface Props {
  cards: Flashcard[];
  loading: boolean;
  onGenerate: () => void;
  onSetStatus: (cardId: string, status: CardStatus) => void;
  hasFile: boolean;
  onNotice: (message: string) => void;
}

type Filter = 'all' | 'mastered' | 'review';

export default function Flashcards({ cards, loading, onGenerate, onSetStatus, hasFile, onNotice }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const visible = useMemo(() => {
    if (filter === 'mastered') return cards.filter((card) => card.status === 'mastered');
    if (filter === 'review') return cards.filter((card) => card.status !== 'mastered');
    return cards;
  }, [cards, filter]);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [filter, cards.length]);

  useEffect(() => {
    if (index > visible.length - 1) setIndex(Math.max(0, visible.length - 1));
  }, [index, visible.length]);

  const mastered = cards.filter((card) => card.status === 'mastered').length;
  const progress = cards.length ? Math.round((mastered / cards.length) * 100) : 0;
  const card = visible[index];

  const move = (delta: number) => {
    if (!visible.length) return;
    setFlipped(false);
    setIndex((current) => (current + delta + visible.length) % visible.length);
  };

  const mark = (status: CardStatus) => {
    if (!card) return;
    onSetStatus(card.id, status);
    window.setTimeout(() => {
      setFlipped(false);
      setIndex((current) => (current + 1) % Math.max(visible.length, 1));
    }, 180);
  };

  if (!hasFile && !cards.length) {
    return (
      <div className="deck-empty">
        <span className="deck-empty-glyph">🗂️</span>
        <h2 className="deck-empty-title">Flashcards need a source</h2>
        <p className="deck-empty-body">
          Upload a chapter or a slide deck in the Upload PDF tab and Ello will pull out the terms and formulas worth
          memorising.
        </p>
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="deck-empty">
        <span className="deck-empty-glyph">🃏</span>
        <h2 className="deck-empty-title">Build your deck</h2>
        <p className="deck-empty-body">
          Ello will mine the key terms, formulas and definitions from this chapter and turn them into cards you can
          flip.
        </p>
        <button type="button" className="big-cta" onClick={onGenerate} disabled={loading}>
          {loading ? 'Shuffling cards…' : '✨ Make my flashcards'}
        </button>
      </div>
    );
  }

  return (
    <div className="flashcards-wrap">
      <div className="cards-head">
        <div>
          <p className="canvas-eyebrow">Study flashcards</p>
          <h2 className="cards-title">
            {mastered} of {cards.length} mastered
          </h2>
        </div>
        <button type="button" className="ghost-action" onClick={onGenerate} disabled={loading}>
          <RefreshIcon size={15} /> {loading ? 'Rebuilding…' : 'New deck'}
        </button>
      </div>

      <div className="mastery-track" aria-hidden>
        <div className="mastery-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="filter-row">
        {(
          [
            { id: 'all', label: 'All cards', count: cards.length },
            { id: 'review', label: 'Review later', count: cards.length - mastered },
            { id: 'mastered', label: 'Mastered', count: mastered },
          ] as { id: Filter; label: string; count: number }[]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            className={`filter-pill ${filter === item.id ? 'active' : ''}`}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
            <span>{item.count}</span>
          </button>
        ))}
      </div>

      {!card ? (
        <div className="deck-empty compact">
          <span className="deck-empty-glyph">🌱</span>
          <p className="deck-empty-body">
            Nothing here yet. Flip a few cards and tap <strong>Mastered</strong> to fill this shelf.
          </p>
          <button type="button" className="ghost-action" onClick={() => setFilter('all')}>
            Back to all cards
          </button>
        </div>
      ) : (
        <>
          <div className="flashcard-stage">
            <div className="card-stack" aria-hidden>
              <span />
              <span />
            </div>

            <div
              className={`flashcard ${flipped ? 'flipped' : ''}`}
              role="button"
              tabIndex={0}
              aria-label="Flip flashcard"
              onClick={() => setFlipped((value) => !value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setFlipped((value) => !value);
                }
              }}
            >
              <div className="flashcard-inner">
                <div className="flashcard-face flashcard-front">
                  <div className="card-topline">
                    <span className="card-eyebrow">
                      <SparkIcon size={12} /> card {index + 1}
                    </span>
                    {card.status === 'mastered' && <span className="card-status">mastered</span>}
                    {card.status === 'review' && <span className="card-status review">review later</span>}
                  </div>
                  <p className="card-term">{card.term}</p>
                  {card.hint && <p className="card-hint">“{card.hint}”</p>}
                  <span className="card-tap">tap to flip ↻</span>
                </div>

                <div className="flashcard-face flashcard-back">
                  <span className="card-eyebrow">answer</span>
                  <p className="card-def">{card.definition}</p>
                  <div className="card-actions">
                    <button
                      type="button"
                      className="card-action mastered"
                      onClick={(event) => {
                        event.stopPropagation();
                        mark('mastered');
                      }}
                    >
                      <CheckIcon size={14} /> Mastered
                    </button>
                    <button
                      type="button"
                      className="card-action review"
                      onClick={(event) => {
                        event.stopPropagation();
                        mark('review');
                      }}
                    >
                      Review later
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="cards-nav">
            <button type="button" className="nav-btn" onClick={() => move(-1)} aria-label="Previous card">
              ←
            </button>
            <span className="cards-progress">
              card {index + 1} of {visible.length}
            </span>
            <button type="button" className="nav-btn" onClick={() => move(1)} aria-label="Next card">
              →
            </button>
          </div>

          <p className="cards-tip" onClick={() => onNotice('Flip the card, then sort it. Ello keeps your progress.')}>
            Flip the card, then sort it — mastered cards come back less often.
          </p>
        </>
      )}
    </div>
  );
}
