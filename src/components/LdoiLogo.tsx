import React from 'react';

interface LdoiLogoProps {
  size?: number;
}

/**
 * Iqra Desk emblem: an open book on a soft blush squircle with a warm sparkle.
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
      <rect width="64" height="64" rx="16" fill="#FAF2F5" />
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="14.5"
        stroke="#9B5B76"
        strokeOpacity="0.32"
        strokeWidth="2"
      />
      <path
        d="M12 24C12 21.8 13.8 20 16 20H29C30.7 20 32 21.3 32 23V46C30.4 44.8 28.4 44 26 44H15C13.3 44 12 42.7 12 41V24Z"
        fill="#9B5B76"
      />
      <path
        d="M52 24C52 21.8 50.2 20 48 20H35C33.3 20 32 21.3 32 23V46C33.6 44.8 35.6 44 38 44H49C50.7 44 52 42.7 52 41V24Z"
        fill="#824861"
      />
      <path
        d="M15 23.5C15 22.7 15.7 22 16.5 22H28C29.7 22 31 23.3 31 25V43.2C29.5 42.3 27.8 41.8 26 41.8H16.5C15.7 41.8 15 41.1 15 40.3V23.5Z"
        fill="#FFFDFB"
      />
      <path
        d="M49 23.5C49 22.7 48.3 22 47.5 22H36C34.3 22 33 23.3 33 25V43.2C34.5 42.3 36.2 41.8 38 41.8H47.5C48.3 41.8 49 41.1 49 40.3V23.5Z"
        fill="#FFFDFB"
      />
      <path
        d="M18.5 27.5H27.5M18.5 32H27.5M18.5 36.5H25"
        stroke="#D8C2CB"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M36.5 27.5H45.5M36.5 32H45.5M36.5 36.5H43"
        stroke="#D8C2CB"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M32 9L33.6 13.4L38 15L33.6 16.6L32 21L30.4 16.6L26 15L30.4 13.4L32 9Z"
        fill="#D48C70"
      />
    </svg>
  );
};
