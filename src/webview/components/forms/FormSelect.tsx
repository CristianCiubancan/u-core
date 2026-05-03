import React, { useState, useEffect, useRef } from 'react';

interface Option {
  label: string;
  value: string;
}

interface FormSelectProps {
  id: string;
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * Dossier-style select. Trigger uses the same hairline-underline as
 * FormInput; the popup uses `.dossier-paper` so a list of options
 * matches the broader dossier aesthetic. Keyboard nav (arrow keys,
 * type-to-jump, enter, escape) is preserved from the original.
 */
const FormSelect = ({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  error,
  disabled = false,
}: FormSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchString, setSearchString] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = `${id}-listbox`;
  const getOptionId = (index: number) => `${id}-option-${index}`;

  const selectedOption = options.find((o) => o.value === value) || null;

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen((prev) => {
      if (!prev) {
        if (value) {
          const i = options.findIndex((o) => o.value === value);
          setHighlightedIndex(i !== -1 ? i : 0);
        } else {
          setHighlightedIndex(0);
        }
      } else {
        setHighlightedIndex(null);
      }
      return !prev;
    });
  };

  const handleOptionSelect = (option: Option) => {
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (
        event.key === 'Enter' ||
        event.key === ' ' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowUp'
      ) {
        setIsOpen(true);
        event.preventDefault();
        return;
      }
      if (event.key.length === 1 && /^[a-z0-9]$/i.test(event.key)) {
        setIsOpen(true);
        const next = event.key.toLowerCase();
        setSearchString(next);
        const i = options.findIndex((o) =>
          o.label.toLowerCase().startsWith(next)
        );
        if (i !== -1) setHighlightedIndex(i);
        timeoutRef.current = setTimeout(() => setSearchString(''), 1000);
        event.preventDefault();
        return;
      }
    }

    if (isOpen) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        event.preventDefault();
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        if (highlightedIndex !== null) handleOptionSelect(options[highlightedIndex]);
        event.preventDefault();
        return;
      }
      if (event.key === 'ArrowDown') {
        setHighlightedIndex((prev) =>
          prev === null ? 0 : Math.min(prev + 1, options.length - 1)
        );
        event.preventDefault();
        return;
      }
      if (event.key === 'ArrowUp') {
        setHighlightedIndex((prev) =>
          prev === null ? 0 : Math.max(prev - 1, 0)
        );
        event.preventDefault();
        return;
      }
      if (event.key.length === 1 && /^[a-z0-9]$/i.test(event.key)) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const next = searchString + event.key.toLowerCase();
        setSearchString(next);
        const i = options.findIndex((o) =>
          o.label.toLowerCase().startsWith(next)
        );
        if (i !== -1) setHighlightedIndex(i);
        timeoutRef.current = setTimeout(() => setSearchString(''), 1000);
        event.preventDefault();
      }
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && highlightedIndex !== null && optionsRef.current) {
      const el = optionsRef.current.children[highlightedIndex] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div className="space-y-1.5" ref={containerRef}>
      <label htmlFor={id} className="dossier-label">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          id={id}
          readOnly
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-activedescendant={
            isOpen && highlightedIndex !== null
              ? getOptionId(highlightedIndex)
              : undefined
          }
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={disabled}
          value={selectedOption ? selectedOption.label : ''}
          placeholder={placeholder}
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
          className={`dossier-input pr-6 ${error ? 'dossier-input-error' : ''} ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        />
        {/* Caret */}
        <span
          aria-hidden="true"
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px] font-mono transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>

        <div
          id={listboxId}
          role="listbox"
          ref={optionsRef}
          tabIndex={-1}
          className={`dossier-paper absolute z-20 mt-1 w-full max-h-56 overflow-y-auto transition-all duration-150 ease-out transform ${
            isOpen
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95 pointer-events-none'
          }`}
        >
          {options.map((option, index) => {
            const isActive = value === option.value;
            const isHighlighted = index === highlightedIndex;
            return (
              <div
                id={getOptionId(index)}
                key={option.value}
                role="option"
                aria-selected={isActive}
                onClick={
                  !isActive && !disabled
                    ? () => handleOptionSelect(option)
                    : undefined
                }
                className={`px-3 py-1.5 font-serif text-[13px] transition-colors border-b border-zinc-800/50 last:border-b-0 ${
                  isHighlighted ? 'bg-brand-500/15 text-zinc-50' : 'text-zinc-300'
                } ${
                  isActive
                    ? 'text-brand-300 cursor-default'
                    : disabled
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer hover:bg-zinc-800/40'
                }`}
              >
                {option.label}
              </div>
            );
          })}
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} className="dossier-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default FormSelect;
