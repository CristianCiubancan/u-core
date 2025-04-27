import React from 'react';

interface FormInputProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string | number; // Allow number type for value
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  step?: number; // Optional step prop for increment/decrement
  error?: string; // Optional error message
  disabled?: boolean; // Optional disabled state
}

const FormInput = ({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  step = 1, // Default step to 1
  error,
  disabled = false,
}: FormInputProps) => {
  const handleIncrement = () => {
    if (disabled) return; // Prevent action if disabled
    const currentValue = parseFloat(value.toString());
    const newValue = isNaN(currentValue) ? step : currentValue + step;
    // Create a synthetic event
    const syntheticEvent = {
      target: { value: newValue.toString(), id },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  const handleDecrement = () => {
    if (disabled) return; // Prevent action if disabled
    const currentValue = parseFloat(value.toString());
    const newValue = isNaN(currentValue) ? -step : currentValue - step;
    // Create a synthetic event
    const syntheticEvent = {
      target: { value: newValue.toString(), id },
    } as React.ChangeEvent<HTMLInputElement>;
    onChange(syntheticEvent);
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          type={type === 'number' ? 'text' : type} // Use text input visually even for number type to ensure custom arrows work consistently
          inputMode={type === 'number' ? 'numeric' : undefined} // Hint for mobile keyboards
          pattern={type === 'number' ? '[0-9]*' : undefined} // Pattern for numeric input
          id={id}
          disabled={disabled}
          aria-invalid={!!error} // Indicate error state for accessibility
          aria-describedby={error ? `${id}-error` : undefined} // Link error message
          className={`w-full px-4 py-2 glass-brand-dark rounded-lg focus:outline-none transition shadow-sm border hover:border-brand-500/40 ${
            type === 'number' ? 'pr-10' : '' // Add padding-right if it's a number input
          } ${
            error
              ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' // Error styles
              : 'border-brand-500/20 focus:border-transparent focus:ring-2 focus:ring-brand-700/50' // Default styles
          } ${
            disabled
              ? 'opacity-60 cursor-not-allowed bg-brand-900/30' // Disabled styles
              : ''
          }`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
        {type === 'number' && (
          // Container for arrows with background and rounding
          <div
            className={`absolute inset-y-0 right-0 flex flex-col items-center justify-center bg-black/10 rounded-r-lg overflow-hidden ${
              disabled ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <button
              type="button"
              onClick={handleIncrement}
              disabled={disabled}
              className={`h-1/2 px-2 text-on-dark opacity-70 flex items-center justify-center transition-colors duration-150 w-full ${
                disabled
                  ? 'cursor-not-allowed'
                  : 'hover:text-on-dark hover:opacity-100 hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-700/50'
              }`} // Use text-on-dark, adjust opacity
              aria-label="Increment"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleDecrement}
              disabled={disabled}
              className={`h-1/2 px-2 text-on-dark opacity-70 flex items-center justify-center transition-colors duration-150 w-full ${
                disabled
                  ? 'cursor-not-allowed'
                  : 'hover:text-on-dark hover:opacity-100 hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-700/50'
              }`} // Use text-on-dark, adjust opacity
              aria-label="Decrement"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
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

export default FormInput;
