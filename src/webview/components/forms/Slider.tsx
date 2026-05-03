import React from 'react';

interface SliderProps {
  id: string;
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  showValue?: boolean;
  valueLabel?: string;
  disabled?: boolean;
  error?: string;
}

/**
 * Dossier-style slider — thin track, indigo thumb, mono value readout.
 * Pulls track / thumb colors from the active gray + brand palettes via
 * the standard utilities so theme switching works.
 */
const Slider: React.FC<SliderProps> = ({
  id,
  label,
  min,
  max,
  value,
  onChange,
  step = 1,
  showValue = true,
  valueLabel,
  disabled = false,
  error,
}) => {
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <label htmlFor={id} className="dossier-label">
          {label}
        </label>
        {showValue && (
          <span className="font-mono text-[9.5px] tracking-[0.2em] text-gray-300 uppercase">
            {valueLabel ? `${valueLabel}: ` : ''}
            {value}
          </span>
        )}
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        onChange={(event) => onChange(parseFloat(event.target.value))}
        className={`w-full h-px bg-gray-700/70 appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
          [&::-webkit-slider-thumb]:bg-brand-400 [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-brand-300
          [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3
          [&::-moz-range-thumb]:bg-brand-400 [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-brand-300
          focus:outline-none focus:bg-gray-600/70
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'bg-red-500/40' : ''}`}
      />
      {error && (
        <p id={`${id}-error`} className="dossier-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Slider;
