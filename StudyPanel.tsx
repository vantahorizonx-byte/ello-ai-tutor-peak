import { useEffect, useRef, useState } from 'react';
import { formatBytes } from '../api';
import type { ChatMessage, StudySession } from '../types';
import {
  ElloFace,
  FileIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  SendIcon,
  SparkIcon,
  UploadCloudIcon,
} from './Icons';

interface Dictation {
  supported: boolean;
  listening: boolean;
  interim: string;
  start: () => void;
  stop: () => void;
  toggle: () => void;
}

interface Props {
  session: StudySession | null;
  messages: ChatMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  uploading: { name: string; percent: number; phase: 'uploading' | 'reading' } | null;
  onUpload: (file: File) => void;
  onNotice: (message: string) => void;
  dictation: Dictation;
  voiceMode: 'idle' | 'speaking' | 'paused';
  onToggleVoice: () => void;
}

const ACCEPT = '.pdf,.pptx,.docx,.txt,.md,.csv,.png,.jpg,.jpeg,.webp';
const MAX_BYTES = 500 * 1024 * 1024;

const SHORTCUTS = [
  { label: 'Explain this chapter simply', prompt: 'Explain this chapter in simple terms with one everyday example.' },
  { label: 'What will be on the exam?', prompt: 'What are the most likely exam questions from this material, and how should I answer them?' },
  { label: 'Give me a worked example', prompt: 'Give me a worked example that uses the main formula in this chapter.' },
];

export default function StudyPanel({
  session,
  messages,
  draft,
  onDraftChange,
  onSend,
  sending,
  uploading,
  onUpload,
  onNotice,
  dictation,
  voiceMode,
  onToggleVoice,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const feed = feedRef.current;
    if (feed) feed.scrollTop = feed.scrollHeight;
  }, [messages, sending, uploading]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(132, Math.max(24, textarea.scrollHeight))}px`;
  }, [draft]);

  const pickFile = () => inputRef.current?.click();

  const validateAndUpload = (file: File | undefined | null) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      onNotice('That file is over 500MB. Try compressing it or splitting the chapter.');
      return;
    }
    if (!/\.(pdf|pptx|docx|xlsx|txt|md|markdown|csv|png|jpe?g|webp|heic)$/i.test(file.name)) {
      onNotice('Ello reads PDFs, slides, documents, photos and text files. Try one of those.');
      return;
    }
    onUpload(file);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  const file = session?.file;

  return (
    <section className="panel study-panel" aria-label="Study with Ello">
      <div className="panel-head">
        <span className="eyebrow">Study with Ello</span>
        <span className="panel-head-tag">
          <SparkIcon size={13} /> notes → board
        </span>
      </div>

      <div className="uploader">
        <div
          className={`dropzone ${dragging ? 'dragging' : ''} ${uploading ? 'busy' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            validateAndUpload(event.dataTransfer.files?.[0]);
          }}
          onClick={pickFile}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') pickFile();
          }}
        >
          <span className="dz-icon">
            <UploadCloudIcon size={26} />
          </span>
          <p className="dz-title">Drop your notes here</p>
          <p className="dz-sub">/ PDF - Slides - Homework photos - Up to 500MB</p>
          <button
            type="button"
            className="browse-btn"
            onClick={(event) => {
              event.stopPropagation();
              pickFile();
            }}
          >
            Browse
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="visually-hidden"
            onChange={(event) => {
              validateAndUpload(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </div>

        {uploading && (
          <div className="upload-progress">
            <div className="upload-progress-top">
              <span className="upload-file">{uploading.name}</span>
              <span className="upload-percent">
                {uploading.phase === 'reading' ? 'reading notes…' : `${uploading.percent}%`}
              </span>
            </div>
            <div className="progress-track">
              <div
                className={`progress-fill ${uploading.phase === 'reading' ? 'indeterminate' : ''}`}
                style={{ width: uploading.phase === 'reading' ? '100%' : `${Math.max(3, uploading.percent)}%` }}
              />
            </div>
          </div>
        )}

        {file && !uploading && (
          <div className="file-chip">
            <span className="file-glyph">
              <FileIcon size={20} />
            </span>
            <div className="file-meta">
              <p className="file-name" title={file.name}>
                {file.name}
              </p>
              <p className="file-sub">
                {formatBytes(file.size)} · {(file.kind || 'pdf').toUpperCase()} · on the board
              </p>
            </div>
            <button type="button" className="file-replace" onClick={pickFile}>
              Replace
            </button>
          </div>
        )}
      </div>

      <div className="tutor-head">
        <span className="tutor-avatar">
          <ElloFace size={30} />
        </span>
        <div className="tutor-title">
          <p className="tutor-name">ELLO TUTOR</p>
          <p className="tutor-sub">asks, explains, quizzes</p>
        </div>
        <button
          type="button"
          className={`tutor-voice ${voiceMode}`}
          onClick={onToggleVoice}
          aria-label={voiceMode === 'speaking' ? 'Pause Ello’s voice' : 'Play Ello’s voice'}
        >
          {voiceMode === 'speaking' ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
          <span>{voiceMode === 'paused' ? 'paused' : voiceMode === 'speaking' ? 'speaking' : 'voice'}</span>
        </button>
      </div>

      <div className="chat-feed" ref={feedRef}>
        {messages.length === 0 && !sending && (
          <div className="chat-empty">
            <p className="chat-empty-title">
              {session?.file ? 'Your board is ready.' : 'Hey — I’m Ello.'}
            </p>
            <p className="chat-empty-body">
              {session?.file
                ? 'Ask anything about the chapter, or start with one of these.'
                : 'Drop a chapter, a slide deck or a homework photo. I’ll draw the board and we’ll take it from there.'}
            </p>
            <div className="chat-suggestions">
              {(session?.file
                ? SHORTCUTS
                : [{ label: 'What can you do?', prompt: 'What can you help me study today?' }]
              ).map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="suggestion-chip"
                  onClick={() => {
                    onDraftChange(item.prompt);
                    textareaRef.current?.focus();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <article
            key={message.id}
            className={`msg ${message.role === 'user' ? 'msg-user' : 'msg-ello'} ${
              message.streaming && !message.content ? 'msg-typing' : ''
            }`}
          >
            {message.role === 'assistant' && (
              <span className="msg-avatar">
                <ElloFace size={26} />
              </span>
            )}
            <div className="msg-body">
              {message.content ? (
                message.content
                  .split(/\n{2,}/)
                  .filter(Boolean)
                  .map((block, index) => <p key={index}>{block}</p>)
              ) : (
                <span className="typing-dots" aria-label="Ello is thinking">
                  <i />
                  <i />
                  <i />
                </span>
              )}
              {message.streaming && message.content && <span className="caret" aria-hidden />}
            </div>
          </article>
        ))}

        {dictation.listening && (
          <div className="listening-hint">
            <span className="mic-dot" />
            listening… pause when you’re done and I’ll send it
          </div>
        )}
      </div>

      <div className="composer-wrap">
        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            onSend();
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask Ello anything... Enter to send. Shift+Enter for a new line"
            aria-label="Ask Ello anything"
            disabled={!session}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={!draft.trim() || sending || !session}
            aria-label="Send message"
          >
            <SendIcon size={19} />
          </button>
        </form>
        <div className="composer-foot">
          <button
            type="button"
            className={`composer-mic ${dictation.listening ? 'live' : ''}`}
            onClick={dictation.toggle}
            aria-label={dictation.listening ? 'Stop dictation' : 'Start dictation'}
            title={dictation.supported ? 'Dictate (M)' : 'Dictation needs Chrome or Edge'}
          >
            <MicIcon size={15} />
            <span>{dictation.listening ? 'listening' : 'speak'}</span>
          </button>
          <span className="composer-hint">Enter to send · Shift+Enter for a new line</span>
        </div>
      </div>
    </section>
  );
}
