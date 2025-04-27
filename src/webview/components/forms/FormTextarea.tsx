import React from 'react';

interface FormTextareaProps {
  id: string;
  label: string;
  rows?: number;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  maxLength?: number;
  error?: string; // Optional error message
  disabled?: boolean; // Optional disabled state
}

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
  // Combine aria-describedby for both error and char count if they exist
  const describedBy = [
    error ? `${id}-error` : null,
    maxLength ? `${id}-char-count` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="block font-medium">
          {label}
        </label>
        {maxLength && (
          <span id={`${id}-char-count`} className="text-xs text-brand-300">
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
        aria-describedby={describedBy || undefined} // Use combined describedBy
        className={`w-full px-4 py-2 glass-brand-dark rounded-lg focus:outline-none transition-all resize-none shadow-sm border hover:border-brand-500/40 ${
          error
            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' // Error styles
            : 'border-brand-500/20 focus:ring-2 focus:ring-brand-700/50 focus:border-transparent' // Default styles
        } ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-brand-900/30' // Disabled styles
            : ''
        }`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      ></textarea>
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

export default FormTextarea;
