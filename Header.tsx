import { useEffect, useRef, useState } from 'react';
import { relativeTime } from '../api';
import type { SessionSummary, User } from '../types';
import {
  ChevronDownIcon,
  ElloFace,
  GearIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowUpRightIcon,
} from './Icons';

interface Props {
  user: User;
  sessions: SessionSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSignOut: () => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
}

const useOutside = (onClose: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return ref;
};

export default function Header({
  user,
  sessions,
  activeId,
  onSelect,
  onNew,
  onSignOut,
  onDeleteSession,
  onOpenSettings,
}: Props) {
  const [recentOpen, setRecentOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const recentRef = useOutside(() => setRecentOpen(false));
  const profileRef = useOutside(() => setProfileOpen(false));

  const streakLabel = `${user.streak} Day${user.streak === 1 ? '' : 's'} Streak`;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand">
          <ElloFace size={38} />
          <div className="brand-text">
            <p className="brand-name">Ello AI</p>
            <p className="brand-sub">your study sidekick</p>
          </div>
        </div>

        <span className="streak-pill" title={`Longest streak: ${user.longestStreak ?? user.streak} days`}>
          <span className="streak-flame" aria-hidden>
            🔥
          </span>
          {streakLabel}
        </span>
      </div>

      <div className="topbar-right">
        <div className="menu-wrap" ref={recentRef}>
          <button
            type="button"
            className={`ghost-btn ${recentOpen ? 'open' : ''}`}
            onClick={() => setRecentOpen((open) => !open)}
            aria-expanded={recentOpen}
            aria-haspopup="menu"
          >
            Recent
            <ChevronDownIcon size={16} />
          </button>

          {recentOpen && (
            <div className="menu-card recent-menu" role="menu">
              <div className="menu-head">
                <span>Your boards</span>
                <span className="menu-count">{sessions.length}</span>
              </div>
              {sessions.length === 0 && <p className="menu-empty">No boards yet — make your first one.</p>}
              {sessions.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className={`recent-item ${item.id === activeId ? 'active' : ''}`}
                  role="menuitem"
                >
                  <button
                    type="button"
                    className="recent-main"
                    onClick={() => {
                      onSelect(item.id);
                      setRecentOpen(false);
                    }}
                  >
                    <span className="recent-title">{item.title}</span>
                    <span className="recent-meta">
                      {item.source_file_name ? item.source_file_name.replace(/\.[a-z0-9]{2,5}$/i, '') : 'blank board'}
                      {' · '}
                      {relativeTime(item.updated_at)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="recent-delete"
                    aria-label={`Delete ${item.title}`}
                    onClick={() => onDeleteSession(item.id)}
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              ))}
              <button type="button" className="menu-footer" onClick={onNew}>
                <PlusIcon size={15} /> Start a new board
              </button>
            </div>
          )}
        </div>

        <button type="button" className="new-board-btn" onClick={onNew}>
          <PlusIcon size={17} />
          New board
        </button>

        <div className="menu-wrap" ref={profileRef}>
          <button
            type="button"
            className="avatar-btn"
            onClick={() => setProfileOpen((open) => !open)}
            aria-expanded={profileOpen}
            aria-label="Profile menu"
          >
            <span className="avatar">{user.initials || 'EE'}</span>
            <span className="avatar-dot" aria-hidden />
          </button>

          {profileOpen && (
            <div className="menu-card profile-menu" role="menu">
              <div className="profile-head">
                <span className="avatar avatar-lg">{user.initials || 'EE'}</span>
                <div>
                  <p className="profile-name">{user.name}</p>
                  <p className="profile-email">{user.email}</p>
                </div>
              </div>
              <div className="profile-stats">
                <div>
                  <span className="stat-value">🔥 {user.streak}</span>
                  <span className="stat-label">day streak</span>
                </div>
                <div>
                  <span className="stat-value">{sessions.length}</span>
                  <span className="stat-label">boards</span>
                </div>
              </div>
              <button
                type="button"
                className="profile-action"
                onClick={() => {
                  onOpenSettings();
                  setProfileOpen(false);
                }}
              >
                <GearIcon size={16} /> Voice &amp; settings
              </button>
              <button
                type="button"
                className="profile-action"
                onClick={() => {
                  setProfileOpen(false);
                  onNew();
                }}
              >
                <PencilIcon size={16} /> Blank board
              </button>
              <button type="button" className="profile-action danger" onClick={onSignOut}>
                <ArrowUpRightIcon size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
