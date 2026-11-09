import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = ({ size = 18, ...props }: IconProps) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export const SendIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4.5 12h14" />
    <path d="M12.5 5.5 19 12l-6.5 6.5" />
  </svg>
);

export const SparkIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3.5v3M12 17.5v3M4.8 7.2l2.1 2.1M17.1 14.7l2.1 2.1M3.5 12h3M17.5 12h3M4.8 16.8l2.1-2.1M17.1 9.3l2.1-2.1" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);

export const MicIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="9" y="3" width="6" height="10.5" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
    <path d="M12 18v3" />
  </svg>
);

export const MicOffIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="9" y="3" width="6" height="10.5" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 9.3 5.9" />
    <path d="M12 18v3M4 4l16 16" />
  </svg>
);

export const PlayIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M8 5.6c0-.8.9-1.3 1.6-.8l8 5.9c.6.4.6 1.3 0 1.7l-8 5.9c-.7.5-1.6 0-1.6-.8z" fill="currentColor" stroke="none" />
  </svg>
);

export const PauseIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="7" y="5" width="3.6" height="14" rx="1.4" fill="currentColor" stroke="none" />
    <rect x="13.4" y="5" width="3.6" height="14" rx="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const VolumeIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 9.5h3l4-3.2v11.4l-4-3.2H4z" />
    <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
    <path d="M18 6.8a7.5 7.5 0 0 1 0 10.4" />
  </svg>
);

export const VolumeOffIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 9.5h3l4-3.2v11.4l-4-3.2H4z" />
    <path d="M15.5 9.5l4.5 5M20 9.5l-4.5 5" />
  </svg>
);

export const GearIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14.4a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.4l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3.5a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.4-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.4h.1A1.7 1.7 0 0 0 11 3.6v-.2a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.1l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.4 1.9v.1a1.7 1.7 0 0 0 1.6 1.1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1.1z" />
  </svg>
);

export const ChevronDownIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m6 9.5 6 6 6-6" />
  </svg>
);

export const PlusIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const FileIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z" />
    <path d="M14 3.5v5h5" />
    <path d="M9 13h6M9 16.5h4" />
  </svg>
);

export const CloseIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const CheckIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </svg>
);

export const KeyboardIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="2.5" y="6.5" width="19" height="11" rx="2.5" />
    <path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M6 13.5h.01M9.5 13.5h.01M13 13.5h.01M16.5 13.5h.01M8 16.5h8" />
  </svg>
);

export const UploadCloudIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M7.5 17.5a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17.6 9a3.8 3.8 0 0 1 .9 8.4" />
    <path d="M12 20V11.5M9 14.2l3-3 3 3" />
  </svg>
);

export const PencilIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
    <path d="M13.5 5.5l4 4" />
  </svg>
);

export const TrashIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4.5 6.5h15M9.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7M6.5 6.5l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12" />
  </svg>
);

export const ArrowUpRightIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M7 17 17 7M8.5 7H17v8.5" />
  </svg>
);

export const RefreshIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M20 11.5a8 8 0 1 0-2.6 6.3" />
    <path d="M20 5v6h-6" />
  </svg>
);

export const ElloFace = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
    <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill="#F4795B" />
    <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill="url(#elloGlow)" opacity="0.35" />
    <defs>
      <linearGradient id="elloGlow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FFD9A8" />
        <stop offset="100%" stopColor="#F4795B" />
      </linearGradient>
    </defs>
    <circle cx="14" cy="18.5" r="2.1" fill="#3E4652" />
    <circle cx="26" cy="18.5" r="2.1" fill="#3E4652" />
    <path d="M13.5 25c2 2.4 4.3 3.4 6.5 3.4s4.5-1 6.5-3.4" stroke="#3E4652" strokeWidth="1.9" fill="none" strokeLinecap="round" />
    <path d="M11 10.5c1.6-1.2 3.3-1.6 4.8-1.6M24.2 8.9c1.5 0 3.2.4 4.8 1.6" stroke="#7C3B27" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
  </svg>
);
