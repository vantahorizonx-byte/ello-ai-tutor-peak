import { useEffect, useRef, useState } from 'react';
import type { Board, CanvasState } from '../types';
import { PencilIcon, RefreshIcon, UploadCloudIcon } from './Icons';

interface Props {
  board: Board | null;
  canvas: CanvasState;
  onSaveCanvas: (canvas: CanvasState) => void;
  hasFile: boolean;
}

const COLORS = ['#E2603F', '#5B87B5', '#6D9C7C', '#C79A4B'];
const DIRS = ['right', 'left', 'up', 'down'];

const clampLabel = (value: string, max = 26) =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;

/* ------------------------------- diagrams -------------------------------- */

function ForcesDiagram({ items }: { items: { label: string; dir: string }[] }) {
  const center = { x: 180, y: 130 };
  const geometry: Record<string, { x1: number; y1: number; x2: number; y2: number; lx: number; ly: number }> = {
    right: { x1: 236, y1: 130, x2: 332, y2: 130, lx: 284, ly: 116 },
    left: { x1: 124, y1: 130, x2: 28, y2: 130, lx: 76, ly: 116 },
    up: { x1: 180, y1: 96, x2: 180, y2: 22, lx: 180, ly: 14 },
    down: { x1: 180, y1: 164, x2: 180, y2: 238, lx: 180, ly: 254 },
  };

  return (
    <svg viewBox="0 0 360 264" className="hand-diagram" role="img" aria-label="Force diagram">
      <defs>
        {COLORS.map((color, index) => (
          <marker
            key={color}
            id={`arrow-${index}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
          </marker>
        ))}
      </defs>

      <ellipse cx={center.x} cy={center.y + 46} rx="132" ry="12" className="diagram-ground" />
      <rect x="130" y="98" width="100" height="64" rx="8" className="diagram-box" />
      <path d="M142 110l10 0M142 118l6 0" className="diagram-hatch" />
      <text x="180" y="136" textAnchor="middle" className="diagram-core">
        object
      </text>

      {items.slice(0, 4).map((item, index) => {
        const dir = DIRS.includes(item.dir) ? item.dir : DIRS[index % 4];
        const line = geometry[dir];
        const color = COLORS[index % COLORS.length];
        const anchor = dir === 'left' ? 'end' : dir === 'right' ? 'start' : 'middle';
        const labelX = dir === 'right' ? line.x2 - 6 : dir === 'left' ? line.x2 + 6 : line.lx;
        const labelY = dir === 'down' ? 252 : dir === 'up' ? 14 : line.ly;

        return (
          <g key={`${item.label}-${index}`}>
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={color}
              strokeWidth="2.6"
              strokeLinecap="round"
              markerEnd={`url(#arrow-${index % 4})`}
            />
            <text
              x={labelX}
              y={labelY}
              textAnchor={anchor as 'start' | 'middle' | 'end'}
              className="diagram-label"
              fill={color}
            >
              {clampLabel(item.label, 22)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function CycleDiagram({ items }: { items: { label: string }[] }) {
  const center = { x: 180, y: 132 };
  const radius = 80;
  const nodes = items.slice(0, 4);
  const points = nodes.map((item, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(nodes.length, 2) - Math.PI / 2;
    return {
      ...item,
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
      angle,
      color: COLORS[index % COLORS.length],
    };
  });

  return (
    <svg viewBox="0 0 360 264" className="hand-diagram" role="img" aria-label="Cycle diagram">
      <circle cx={center.x} cy={center.y} r="46" className="diagram-cycle-core" />
      <text x={center.x} y={center.y + 6} textAnchor="middle" className="diagram-core">
        cycle
      </text>
      {points.map((point, index) => {
        const next = points[(index + 1) % points.length];
        if (!next || points.length < 2) return null;
        const midX = (point.x + next.x) / 2 + (center.x - (point.x + next.x) / 2) * 0.15;
        const midY = (point.y + next.y) / 2 + (center.y - (point.y + next.y) / 2) * 0.15;
        return (
          <path
            key={`arc-${index}`}
            d={`M ${point.x} ${point.y} Q ${midX} ${midY} ${next.x} ${next.y}`}
            className="diagram-connector"
            strokeDasharray="5 7"
          />
        );
      })}
      {points.map((point, index) => (
        <g key={`${point.label}-${index}`}>
          <rect
            x={point.x - 48}
            y={point.y - 17}
            width="96"
            height="34"
            rx="10"
            className="diagram-node"
            stroke={point.color}
          />
          <text x={point.x} y={point.y + 5} textAnchor="middle" className="diagram-node-label">
            {clampLabel(point.label, 18)}
          </text>
        </g>
      ))}
    </svg>
  );
}

function FlowDiagram({ items }: { items: { label: string }[] }) {
  const nodes = items.slice(0, 4);
  return (
    <svg viewBox="0 0 360 264" className="hand-diagram" role="img" aria-label="Process diagram">
      {nodes.map((item, index) => {
        const y = 24 + index * 60;
        return (
          <g key={`${item.label}-${index}`}>
            <rect x="52" y={y} width="256" height="40" rx="10" className="diagram-node" stroke={COLORS[index % 4]} />
            <circle cx="72" cy={y + 20} r="9" fill={COLORS[index % 4]} opacity="0.16" />
            <text x="72" y={y + 24} textAnchor="middle" className="diagram-step">
              {index + 1}
            </text>
            <text x="90" y={y + 25} className="diagram-node-label" textAnchor="start">
              {clampLabel(item.label, 34)}
            </text>
            {index < nodes.length - 1 && (
              <path
                d={`M180 ${y + 42} L180 ${y + 58}`}
                stroke={COLORS[(index + 1) % 4]}
                strokeWidth="2"
                strokeDasharray="3 5"
                markerEnd="url(#arrow-0)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function AxesDiagram({ items }: { items: { label: string }[] }) {
  const nodes = items.slice(0, 4);
  return (
    <svg viewBox="0 0 360 264" className="hand-diagram" role="img" aria-label="Relationship diagram">
      <path d="M54 216 H322" className="diagram-axis" />
      <path d="M54 216 V28" className="diagram-axis" />
      <path d="M44 216l10-5v10z" fill="#B9B1A3" />
      <path d="M54 28l5 10h-10z" fill="#B9B1A3" />
      <path d="M54 216c46 0 74-40 108-64s70-40 128-56" className="diagram-curve" stroke={COLORS[0]} />
      <path d="M54 168h224" className="diagram-guide" />
      {nodes.map((item, index) => {
        const x = 90 + index * 62;
        const y = 190 - index * 34;
        return (
          <g key={`${item.label}-${index}`}>
            <circle cx={x} cy={y} r="4.5" fill={COLORS[index % 4]} />
            <text
              x={x + (index >= nodes.length - 2 ? -6 : 6)}
              y={y - 10}
              textAnchor={index >= nodes.length - 2 ? 'end' : 'start'}
              className="diagram-label"
              fill={COLORS[index % 4]}
            >
              {clampLabel(item.label, 16)}
            </text>
          </g>
        );
      })}
      <text x="320" y="238" textAnchor="end" className="diagram-axis-label">
        x
      </text>
      <text x="34" y="34" textAnchor="middle" className="diagram-axis-label">
        y
      </text>
    </svg>
  );
}

function Diagram({ board }: { board: Board }) {
  const { kind, items } = board.diagram;
  if (kind === 'cycle') return <CycleDiagram items={items} />;
  if (kind === 'flow') return <FlowDiagram items={items} />;
  if (kind === 'axes') return <AxesDiagram items={items} />;
  return <ForcesDiagram items={items} />;
}

/* -------------------------------- canvas --------------------------------- */

export default function BoardCanvas({ board, canvas, onSaveCanvas, hasFile }: Props) {
  const [penMode, setPenMode] = useState(false);
  const [strokes, setStrokes] = useState(canvas?.strokes ?? []);
  const [livePath, setLivePath] = useState('');
  const sheetRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef('');
  const drawingRef = useRef(false);

  useEffect(() => {
    setStrokes(canvas?.strokes ?? []);
  }, [canvas?.strokes]);

  const save = (next: { d: string; color?: string }[]) => {
    onSaveCanvas({ ...(canvas || {}), strokes: next });
  };

  const pointFor = (event: React.PointerEvent) => {
    const rect = sheetRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!penMode) return;
    event.preventDefault();
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    const point = pointFor(event);
    drawingRef.current = true;
    pathRef.current = `M ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    setLivePath(pathRef.current);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!penMode || !drawingRef.current) return;
    const point = pointFor(event);
    pathRef.current += ` L ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    setLivePath(pathRef.current);
  };

  const finishStroke = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const path = pathRef.current;
    pathRef.current = '';
    setLivePath('');
    if (path.length < 4) return;
    const next = [...strokes, { d: path, color: '#E2603F' }];
    setStrokes(next);
    save(next);
  };

  const undo = () => {
    const next = strokes.slice(0, -1);
    setStrokes(next);
    save(next);
  };

  const clearInk = () => {
    setStrokes([]);
    save([]);
  };

  if (!board) {
    return (
      <div className="canvas-scroll">
        <div className="canvas-empty">
          <div className="canvas-empty-doodle" aria-hidden>
            <svg viewBox="0 0 260 160">
              <path d="M18 132c34-30 64-30 98 0" />
              <path d="M34 44h96M34 64h64" />
              <rect x="168" y="34" width="66" height="52" rx="8" transform="rotate(-4 201 60)" />
              <path d="M186 54h30M186 66h20" />
              <path d="M120 96l30-26" />
              <path d="M158 74l-8-2M158 74l-2 9" />
            </svg>
          </div>
          <h2 className="canvas-empty-title">{hasFile ? 'Ello is drawing…' : 'Your board is waiting'}</h2>
          <p className="canvas-empty-body">
            {hasFile
              ? 'Ask a question in the chat and the board will fill in.'
              : 'Upload your notes in the Upload PDF tab. Come back and this board will be full of worked examples.'}
          </p>
          <div className="canvas-empty-chips">
            <span>
              <UploadCloudIcon size={14} /> PDF · slides · photos
            </span>
            <span>✏️ hand-drawn by Ello</span>
            <span>🔊 reads it back</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="canvas-scroll">
      <div className="canvas-tools">
        <button
          type="button"
          className={`canvas-tool ${penMode ? 'active' : ''}`}
          onClick={() => setPenMode((value) => !value)}
          title="Draw on the board"
        >
          <PencilIcon size={14} /> {penMode ? 'drawing' : 'draw'}
        </button>
        {penMode && (
          <>
            <button type="button" className="canvas-tool" onClick={undo} disabled={!strokes.length}>
              undo
            </button>
            <button type="button" className="canvas-tool" onClick={clearInk} disabled={!strokes.length}>
              <RefreshIcon size={13} /> clear
            </button>
          </>
        )}
      </div>

      <div
        ref={sheetRef}
        className={`canvas-sheet ${penMode ? 'pen-active' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishStroke}
        onPointerCancel={finishStroke}
        onPointerLeave={finishStroke}
      >
        <div className="board-sheet">
          <header className="board-hero">
            <p className="board-kicker">
              <span className="kicker-line" /> {board.kicker}
            </p>
            <h2 className="board-headline">{board.headline}</h2>
            <p className="board-subtitle">{board.subtitle}</p>
            <svg className="hero-squiggle" viewBox="0 0 220 18" aria-hidden>
              <path d="M4 12c18-9 34-9 52 0s34 9 52 0 34-9 52 0 26 6 56-2" />
            </svg>
          </header>

          <div className="board-top-grid">
            <article className="focus-card">
              <span className="tape" aria-hidden />
              <p className="focus-label">{board.focus.label}</p>
              <p className="focus-value">{board.focus.value}</p>
              <p className="focus-note">{board.focus.note}</p>
              <svg className="focus-arrow" viewBox="0 0 70 40" aria-hidden>
                <path d="M4 32c14-18 30-24 54-24" />
                <path d="M50 3l10 5-9 7" />
              </svg>
            </article>

            <div className="diagram-card">
              <Diagram board={board} />
              <p className="diagram-caption">{board.diagram.caption}</p>
            </div>
          </div>

          {board.formulas.length > 0 && (
            <div className="formula-row">
              {board.formulas.map((formula, index) => (
                <div className={`formula-card formula-${index % 4}`} key={`${formula.expr}-${index}`}>
                  <span className="formula-label">{formula.label}</span>
                  <span className="formula-expr">{formula.expr}</span>
                </div>
              ))}
            </div>
          )}

          <div className="section-grid">
            {board.sections.map((section, index) => (
              <article className={`board-note note-${section.tone}`} key={`${section.title}-${index}`}>
                <span className="note-tape" aria-hidden />
                <h3>{section.title}</h3>
                <p>{section.body}</p>
                <span className="note-doodle" aria-hidden>
                  {index % 3 === 0 ? '✳' : index % 3 === 1 ? '≈' : '→'}
                </span>
              </article>
            ))}
          </div>

          {board.media.length > 0 && (
            <div className="media-strip">
              {board.media.slice(0, 3).map((item) => (
                <figure className="media-figure" key={item.url}>
                  <img src={item.url} alt={item.caption || 'Figure from your notes'} loading="lazy" />
                  <figcaption>{item.caption}</figcaption>
                </figure>
              ))}
            </div>
          )}

          {board.recap.length > 0 && (
            <div className="recap-strip">
              <p className="recap-title">
                quick recap <span aria-hidden>✦</span>
              </p>
              <ul>
                {board.recap.map((line, index) => (
                  <li key={`${line}-${index}`}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="board-signature">drawn by ello · ask me to change anything</p>
        </div>

        <svg className="ink-layer" aria-hidden>
          {strokes.map((stroke, index) => (
            <path key={index} d={stroke.d} fill="none" stroke={stroke.color || '#E2603F'} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {livePath && (
            <path d={livePath} fill="none" stroke="#E2603F" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      </div>
    </div>
  );
}
