import { useRef } from 'react';
import type { VoiceSettings } from '../types';
import type { VoiceState } from '../voice';
import { ElloFace, GearIcon, PauseIcon, PlayIcon, VolumeIcon, VolumeOffIcon } from './Icons';

interface Props {
  voiceState: VoiceState;
  settings: VoiceSettings;
  onChangeSettings: (settings: VoiceSettings) => void;
  onToggle: () => void;
  onOpenSettings: () => void;
}

export default function VoiceDock({ voiceState, settings, onChangeSettings, onToggle, onOpenSettings }: Props) {
  const lastVolume = useRef(settings.volume || 0.9);
  const muted = settings.volume === 0;
  const paused = voiceState.mode === 'paused';
  const speaking = voiceState.mode === 'speaking';

  const toggleMute = () => {
    if (muted) {
      onChangeSettings({ ...settings, volume: lastVolume.current || 0.9 });
    } else {
      lastVolume.current = settings.volume;
      onChangeSettings({ ...settings, volume: 0 });
    }
  };

  return (
    <div className="dock dock-left">
      <span className="dock-avatar">
        <ElloFace size={34} />
      </span>

      <span className="dock-bubble">
        tap play <em>/</em> ello voice
      </span>

      <div className="dock-actions">
        <button
          type="button"
          className={`dock-btn play ${paused ? 'paused' : speaking ? 'speaking' : ''}`}
          onClick={onToggle}
          aria-label={paused ? 'Resume Ello’s voice' : speaking ? 'Pause Ello’s voice' : 'Play Ello’s voice'}
          title={paused ? 'Resume from where you paused' : speaking ? 'Pause mid-sentence' : 'Read the last reply'}
        >
          {paused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
        </button>

        <div className="volume-wrap">
          <button
            type="button"
            className="dock-btn subtle"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute Ello' : 'Mute Ello'}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeOffIcon size={16} /> : <VolumeIcon size={16} />}
          </button>
          <input
            className="volume-slider"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            aria-label="Ello volume"
            onChange={(event) => onChangeSettings({ ...settings, volume: Number(event.target.value) })}
          />
        </div>

        <button
          type="button"
          className="dock-btn subtle"
          onClick={onOpenSettings}
          aria-label="Voice settings"
          title="Voice settings"
        >
          <GearIcon size={16} />
        </button>
      </div>

      {(speaking || paused) && (
        <span className="dock-wave" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
      )}
    </div>
  );
}
