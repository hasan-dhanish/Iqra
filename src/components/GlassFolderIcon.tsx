import React from 'react';

interface GlassFolderIconProps {
  color?: string;
  size?: number;
}

/**
 * Frosted-glass macOS/iOS-style folder with paper sheets peeking out from behind a translucent colored front pocket.
 */
export const GlassFolderIcon: React.FC<GlassFolderIconProps> = ({
  color = '#254454',
  size = 64,
}) => {
  const uid = React.useId().replace(/:/g, '');
  return (
    <svg
      width={size}
      height={Math.round(size * 0.84)}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-md select-none"
    >
      <defs>
        <linearGradient id={`back_${uid}`} x1="0" y1="0" x2="120" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor="#141418" stopOpacity="0.92" />
        </linearGradient>
        <linearGradient id={`front_${uid}`} x1="10" y1="26" x2="105" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity="0.62" />
          <stop offset="55%" stopColor={color} stopOpacity="0.78" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.88" />
        </linearGradient>
        <filter id={`blur_${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {/* Back Folder Shell */}
      <rect x="8" y="6" width="104" height="84" rx="14" fill={`url(#back_${uid})`} />

      {/* Paper Sheet 3 (Rightmost) */}
      <g transform="rotate(4 80 30)">
        <rect x="52" y="14" width="48" height="62" rx="7" fill="#F1F5F9" />
        <rect x="60" y="24" width="28" height="4" rx="2" fill="#CBD5E1" />
        <rect x="60" y="33" width="32" height="3" rx="1.5" fill="#E2E8F0" />
      </g>

      {/* Paper Sheet 2 (Middle) */}
      <g transform="rotate(1.5 60 25)">
        <rect x="34" y="11" width="52" height="64" rx="7" fill="#F8FAFC" />
        <rect x="42" y="21" width="32" height="4.5" rx="2.2" fill="#CBD5E1" />
        <rect x="42" y="31" width="36" height="3" rx="1.5" fill="#E2E8F0" />
      </g>

      {/* Paper Sheet 1 (Front-left tilted) */}
      <g transform="rotate(-7 38 40)">
        <rect x="16" y="14" width="54" height="64" rx="8" fill="#FFFFFF" />
        <rect x="24" y="24" width="34" height="4.5" rx="2.2" fill="#CBD5E1" />
        <rect x="24" y="34" width="22" height="3" rx="1.5" fill="#E2E8F0" />
        <rect x="24" y="41" width="28" height="3" rx="1.5" fill="#E2E8F0" />
        <rect x="24" y="48" width="20" height="3" rx="1.5" fill="#E2E8F0" />
      </g>

      {/* Subtle Blurred Paper Glow behind Frosted Pocket */}
      <path
        d="M8 34C8 27.9 12.9 23 19 23H45C49 23 52.5 25 55 28.2L57.8 31.8C59.4 33.8 61.8 35 64.4 35H101C107.1 35 112 39.9 112 46V82C112 88.6 106.6 94 100 94H20C13.4 94 8 88.6 8 82V34Z"
        fill="#FFFFFF"
        fillOpacity="0.14"
        filter={`url(#blur_${uid})`}
      />

      {/* Frosted Translucent Front Pocket */}
      <path
        d="M8 34C8 27.9 12.9 23 19 23H45C49 23 52.5 25 55 28.2L57.8 31.8C59.4 33.8 61.8 35 64.4 35H101C107.1 35 112 39.9 112 46V82C112 88.6 106.6 94 100 94H20C13.4 94 8 88.6 8 82V34Z"
        fill={`url(#front_${uid})`}
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="1.5"
      />
    </svg>
  );
};
