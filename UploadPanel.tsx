import { useRef, useState } from 'react';
import { FileIcon, UploadCloudIcon, CloseIcon, SparkIcon } from './Icons';
import { formatBytes } from '../api';

const STORE_KEY = 'ello.workspace.uploads';

interface UploadDoc {
  id: string;
  name: string;
  size: number;
  kind: string;
  addedAt: string;
}

const readDocs = (): UploadDoc[] => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as UploadDoc[]) : [];
  } catch {
    return [];
  }
};

const kindOf = (file: File): string => {
  if (file.type) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'application/pdf';
  if (['txt', 'md'].includes(ext)) return 'text/plain';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  return 'file';
};

interface Props {
  onCountChange?: (count: number) => void;
}

export default function UploadPanel({ onCountChange }: Props) {
  const [docs, setDocs] = useState<UploadDoc[]>(() => {
    const initial = readDocs();
    onCountChange?.(initial.length);
    return initial;
  });
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const persist = (next: UploadDoc[]) => {
    setDocs(next);
    onCountChange?.(next.length);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch {
      /* storage blocked */
    }
  };

  const accept = (files: FileList | null) => {
    if (!files || !files.length) return;
    const incoming: UploadDoc[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 500 * 1024 * 1024) {
        setNotice(`${file.name} is larger than the 500 MB limit.`);
        continue;
      }
      incoming.push({
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        size: file.size,
        kind: kindOf(file),
        addedAt: new Date().toISOString(),
      });
    }
    if (!incoming.length) return;
    persist([...incoming, ...docs]);
    setNotice(`${incoming.length} file${incoming.length > 1 ? 's' : ''} added to this workspace.`);
  };

  return (
    <div className="upload-panel">
      <header className="panel-head">
        <div>
          <span className="panel-eyebrow">
            <SparkIcon size={14} /> source material
          </span>
          <h2 className="panel-title">Upload a PDF</h2>
        </div>
        <span className="panel-hint">{docs.length} file{docs.length === 1 ? '' : 's'}</span>
      </header>

      <div
        className={dragging ? 'drop-zone dragging' : 'drop-zone'}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(event.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') input.current?.click();
        }}
      >
        <UploadCloudIcon size={30} />
        <p className="drop-title">Drop a PDF, slide deck or photo here</p>
        <p className="drop-sub">PDF · PPTX · PNG · JPG · TXT · up to 500 MB</p>
        <input
          ref={input}
          type="file"
          accept=".pdf,.pptx,.png,.jpg,.jpeg,.webp,.txt,.md"
          multiple
          hidden
          onChange={(event) => {
            accept(event.target.files);
            event.target.value = '';
          }}
        />
      </div>

      <p className="upload-note">
        Files are listed on this device. Text extraction and AI board generation run on the Ello server — connect it
        to turn a document into a board.
      </p>

      {notice && <p className="workspace-notice">{notice}</p>}

      <ul className="doc-list">
        {docs.length === 0 && <li className="doc-empty">No documents yet. Add tonight’s chapter to begin.</li>}
        {docs.map((doc) => (
          <li key={doc.id} className="doc-row">
            <span className="doc-icon">
              <FileIcon size={18} />
            </span>
            <span className="doc-meta">
              <strong>{doc.name}</strong>
              <span>
                {formatBytes(doc.size)} · {doc.kind.split('/').pop()}
              </span>
            </span>
            <button
              type="button"
              aria-label={`Remove ${doc.name}`}
              onClick={() => persist(docs.filter((item) => item.id !== doc.id))}
            >
              <CloseIcon size={14} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
