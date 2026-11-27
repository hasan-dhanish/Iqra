import React from 'react';

interface LdoiLogoProps {
  size?: number;
}

/**
 * Iqra Desk emblem: stacked books on a soft blush squircle with a golden bookmark.
 * Matches public/favicon.svg.
 */
export const LdoiLogo: React.FC<LdoiLogoProps> = ({ size = 40 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-xs"
      aria-label="Iqra Desk Logo"
    >
      <defs>
        <linearGradient id="iqraLogoBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDF7F9" />
          <stop offset="100%" stopColor="#EFE4E9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#iqraLogoBg)" />
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="14.5"
        stroke="#9B5B76"
        strokeOpacity="0.28"
        strokeWidth="2"
      />
      {/* Bottom Book (Deep Teal) */}
      <rect x="10" y="40" width="42" height="12" rx="4" fill="#1B5E5A" />
      <rect x="18" y="42.5" width="31" height="7" rx="2" fill="#FFFDFB" />
      <path d="M18 46H47" stroke="#D5E3E2" strokeWidth="1.4" strokeLinecap="round" />

      {/* Middle Book (Deep Blue) */}
      <rect x="13" y="27" width="41" height="12" rx="4" fill="#0A5386" />
      <rect x="21" y="29.5" width="30" height="7" rx="2" fill="#FFFDFB" />
      <path d="M21 33H49" stroke="#D3E2EE" strokeWidth="1.4" strokeLinecap="round" />

      {/* Top Book (Mauve-Rose) */}
      <rect x="11" y="14" width="39" height="12" rx="4" fill="#9B5B76" />
      <rect x="19" y="16.5" width="28" height="7" rx="2" fill="#FFFDFB" />
      <path d="M19 20H45" stroke="#E8D4DC" strokeWidth="1.4" strokeLinecap="round" />

      {/* Golden Bookmark Ribbon */}
      <path d="M40 16.5H45V29L42.5 26.8L40 29V16.5Z" fill="#E5A93C" />
    </svg>
  );
};
