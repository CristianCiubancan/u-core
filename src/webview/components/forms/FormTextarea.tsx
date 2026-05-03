import React from 'react';

interface FormTextareaProps {
  id: string;
  label: string;
  rows?: number;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  maxLength?: number;
  error?: string;
  disabled?: boolean;
}

/**
 * Dossier-style textarea — same hairline-underline aesthetic as
 * FormInput, scaled for multi-line input. Optional character counter
 * sits next to the label as a small mono badge.
 */
const FormTextarea = ({
  id,
  label,
  rows = 4,
  placeholder = '',
  value,
  onChange,
  maxLength,
  error,
  disabled = false,
}: FormTextareaProps) => {
  const describedBy = [
    error ? `${id}-error` : null,
    maxLength ? `${id}-char-count` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <label htmlFor={id} className="dossier-label">
          {label}
        </label>
        {maxLength && (
          <span
            id={`${id}-char-count`}
            className="font-mono text-[9px] tracking-[0.2em] text-gray-500 uppercase"
          >
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={describedBy || undefined}
        className={`dossier-input resize-none ${
          error ? 'dossier-input-error' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      {error && (
        <p id={`${id}-error`} className="dossier-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormTextarea;
