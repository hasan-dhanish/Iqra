import React, { useRef, useState } from 'react';

interface ColorRingPickerProps {
  value: string;
  onChange: (hex: string) => void;
  size?: number;
}

function hslToHex(h: number, s: number, l: number): string {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sNorm * Math.min(lNorm, 1 - lNorm);
  const f = (n: number) =>
    lNorm - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

function hexToHue(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 190;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round(((h * 60) + 360) % 360);
}

export const ColorRingPicker: React.FC<ColorRingPickerProps> = ({
  value,
  onChange,
  size = 148,
}) => {
  const ringRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const hue = hexToHue(value);
  const thickness = 22;
  const outerR = size / 2;
  const trackR = outerR - thickness / 2;

  // 0 deg at 12 o'clock (top) matching CSS conic-gradient(from 0deg, ...)
  const rad = ((hue - 90) * Math.PI) / 180;
  const thumbX = outerR + trackR * Math.cos(rad);
  const thumbY = outerR + trackR * Math.sin(rad);

  const pickFromPointer = (clientX: number, clientY: number) => {
    const el = ringRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    // Angle in degrees where 0 = top (12 o'clock), increasing clockwise
    const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
    onChange(hslToHex(Math.round(deg), 72, 42));
  };

  return (
    <div className="flex items-center gap-5">
      <div
        ref={ringRef}
        role="slider"
        aria-label="Habit colour ring"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={hue}
        tabIndex={0}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          setDragging(true);
          pickFromPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (dragging) pickFromPointer(e.clientX, e.clientY);
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            onChange(hslToHex((hue + 15) % 360, 72, 42));
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(hslToHex((hue - 15 + 360) % 360, 72, 42));
          }
        }}
        className="relative rounded-full cursor-crosshair touch-none select-none shrink-0 shadow-inner"
        style={{
          width: size,
          height: size,
          background:
            'conic-gradient(from 0deg, #D93838, #D98926, #C4B826, #32B84A, #1B9E8E, #267CD9, #6E42D9, #C438B8, #D9386B, #D93838)',
        }}
      >
        {/* Inner cutout showing selected colour */}
        <div
          className="absolute rounded-full flex flex-col items-center justify-center shadow-sm border border-[#E2E0D8]/70 bg-white dark:bg-[#1E1E24]"
          style={{
            inset: thickness,
          }}
        >
          <span
            className="w-10 h-10 rounded-full shadow-md border-2 border-white/80 transition-colors"
            style={{ backgroundColor: value }}
          />
          <span className="mt-1 text-[10px] font-mono-num font-bold text-[#8E8E93]">
            {value}
          </span>
        </div>

        {/* Selector Thumb on the Ring */}
        <span
          className="absolute w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-[2.5px] border-white shadow-[0_2px_6px_rgba(0,0,0,0.45)] pointer-events-none"
          style={{
            left: thumbX,
            top: thumbY,
            backgroundColor: value,
          }}
        />
      </div>

      <div className="space-y-1.5 text-xs text-[#8E8E93]">
        <p className="font-semibold text-[#1C1C1E]">Drag or click the ring</p>
        <p className="text-[11px] leading-relaxed">
          Pick any hue around the wheel to tint your habit badge and progress bar.
        </p>
      </div>
    </div>
  );
};
