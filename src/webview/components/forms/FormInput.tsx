import React from 'react';

interface FormInputProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: number;
  error?: string;
  disabled?: boolean;
}

/**
 * Dossier-style form input — small mono uppercase label, transparent
 * input with a hairline bottom border that turns indigo on focus.
 * Number variant keeps inline +/- spinners but in the same minimal
 * style (no glass-pill background). Reusable utilities live in
 * `_shared/html/style.css` under `@layer components` (`.dossier-label`,
 * `.dossier-input`, `.dossier-error`).
 */
const FormInput = ({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  step = 1,
  error,
  disabled = false,
}: FormInputProps) => {
  const handleIncrement = () => {
    if (disabled) return;
    const current = parseFloat(value.toString());
    const next = isNaN(current) ? step : current + step;
    onChange({
      target: { value: next.toString(), id },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  const handleDecrement = () => {
    if (disabled) return;
    const current = parseFloat(value.toString());
    const next = isNaN(current) ? -step : current - step;
    onChange({
      target: { value: next.toString(), id },
    } as React.ChangeEvent<HTMLInputElement>);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="dossier-label">
        {label}
      </label>
      <div className="relative">
        <input
          type={type === 'number' ? 'text' : type}
          inputMode={type === 'number' ? 'numeric' : undefined}
          pattern={type === 'number' ? '[0-9]*' : undefined}
          id={id}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`dossier-input ${error ? 'dossier-input-error' : ''} ${
            type === 'number' ? 'pr-12' : ''
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
        {type === 'number' && (
          <div
            className={`absolute inset-y-0 right-0 flex items-stretch ${
              disabled ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <button
              type="button"
              onClick={handleDecrement}
              disabled={disabled}
              aria-label="Decrement"
              className="px-1.5 text-gray-500 hover:text-gray-200 transition-colors font-mono text-[10px]"
            >
              −
            </button>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={disabled}
              aria-label="Increment"
              className="px-1.5 text-gray-500 hover:text-gray-200 transition-colors font-mono text-[10px]"
            >
              +
            </button>
          </div>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} className="dossier-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormInput;
