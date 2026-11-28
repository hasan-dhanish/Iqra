import React from 'react';

export const DEFAULT_PALETTE_COLORS = [
  '#0A5386',
  '#133F47',
  '#9B5B76',
  '#5B3A70',
  '#B45309',
];

interface ColorRingPickerProps {
  value: string;
  onChange: (hex: string) => void;
  colors?: string[];
  /** Kept for backwards compatibility with callers */
  size?: number;
  compact?: boolean;
}

export const ColorRingPicker: React.FC<ColorRingPickerProps> = ({
  value,
  onChange,
  colors = DEFAULT_PALETTE_COLORS,
  compact = false,
}) => {
  const defaults = colors.slice(0, 5);
  const normalizedValue = value.toUpperCase();
  const isCustom = !defaults.some((c) => c.toUpperCase() === normalizedValue);
  const safeHex =
    value && value.startsWith('#') && value.length === 7 ? value : defaults[0] ?? '#0A5386';
  const dim = compact ? 'w-6 h-6' : 'w-7 h-7';

  return (
    <div className={`flex flex-wrap items-center py-1 ${compact ? 'gap-3' : 'gap-3.5'}`}>
      {defaults.map((c) => {
        const selected = c.toUpperCase() === normalizedValue;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-label={`Select colour ${c}`}
            title={c}
            className={`${dim} rounded-full transition-transform shrink-0 ${
              selected
                ? 'scale-105 ring-2 ring-offset-2 ring-[#1C1C1E] dark:ring-white dark:ring-offset-[#1C1724]'
                : 'hover:scale-105'
            }`}
            style={{ backgroundColor: c }}
          />
        );
      })}

      <label
        title="Open colour palette"
        className={`relative ${dim} rounded-full cursor-pointer transition-transform flex items-center justify-center shrink-0 ${
          isCustom
            ? 'scale-105 ring-2 ring-offset-2 ring-[#1C1C1E] dark:ring-white dark:ring-offset-[#1C1724]'
            : 'hover:scale-105'
        }`}
        style={{
          background:
            'conic-gradient(from 0deg, #EF4444, #F59E0B, #EAB308, #22C55E, #06B6D4, #3B82F6, #A855F7, #EF4444)',
        }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full border border-white/90 shadow-xs pointer-events-none"
          style={{ backgroundColor: isCustom ? safeHex : '#FFFFFF' }}
        />
        <input
          type="color"
          value={safeHex}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="sr-only"
          aria-label="Open custom colour palette"
        />
      </label>
    </div>
  );
};
