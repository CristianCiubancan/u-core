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
 * Reusable slider component with consistent styling
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
  // Combine aria-describedby for error if it exists
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-white text-shadow mb-2"
      >
        {label}
      </label>
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
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onChange(parseFloat(event.target.value))
        }
        className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer 
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
          [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-sm 
          [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 
          [&::-moz-range-thumb]:bg-brand-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:shadow-sm
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
          ${error ? 'border-red-500/50' : ''}`}
      />
      {showValue && (
        <div className="text-right text-xs text-white text-shadow mt-1">
          {valueLabel || label}: {value}
        </div>
      )}
      {error && (
        <p
          id={`${id}-error`}
          className="mt-1 text-sm text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export default Slider;
