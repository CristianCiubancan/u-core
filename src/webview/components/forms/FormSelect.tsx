import React, { useState, useEffect, useRef } from 'react';

// Define the shape of an option
interface Option {
  label: string;
  value: string;
}

// Define the props for FormSelect
interface FormSelectProps {
  id: string;
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string; // Optional error message
  disabled?: boolean; // Optional disabled state
}

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listboxId = `${id}-listbox`; // ID for the listbox
  const getOptionId = (index: number) => `${id}-option-${index}`; // Function to generate option IDs

  // Derive the selected option from the value prop
  const selectedOption =
    options.find((option) => option.value === value) || null;

  // Toggle the dropdown and set the highlighted index based on the current value
  const toggleDropdown = () => {
    if (disabled) return; // Prevent opening if disabled
    setIsOpen(!isOpen);
    if (!isOpen) {
      // When opening, highlight the selected option or the first option
      if (value) {
        const index = options.findIndex((option) => option.value === value);
        setHighlightedIndex(index !== -1 ? index : 0);
      } else {
        setHighlightedIndex(0);
      }
    } else {
      setHighlightedIndex(null);
    }
  };

  // Handle option selection by calling onChange and closing the dropdown
  const handleOptionSelect = (option: Option) => {
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(null);
  };

  // Handle keyboard interactions
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return; // Prevent interaction if disabled

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
        const newSearchString = event.key.toLowerCase();
        setSearchString(newSearchString);
        const index = options.findIndex((option) =>
          option.label.toLowerCase().startsWith(newSearchString)
        );
        if (index !== -1) {
          setHighlightedIndex(index);
        }
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
        if (highlightedIndex !== null) {
          handleOptionSelect(options[highlightedIndex]);
        }
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
        const newSearchString = searchString + event.key.toLowerCase();
        setSearchString(newSearchString);
        const index = options.findIndex((option) =>
          option.label.toLowerCase().startsWith(newSearchString)
        );
        if (index !== -1) {
          setHighlightedIndex(index);
        }
        timeoutRef.current = setTimeout(() => setSearchString(''), 1000);
        event.preventDefault();
        return;
      }
    }
  };

  // Close dropdown when clicking outside
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

  // Scroll the highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex !== null && optionsRef.current) {
      const optionElement = optionsRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (optionElement) {
        optionElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div className="space-y-2" ref={containerRef}>
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          id={id}
          readOnly
          role="combobox" // Added role
          aria-haspopup="listbox" // Changed from "true"
          aria-expanded={isOpen}
          aria-controls={listboxId} // Added aria-controls
          aria-activedescendant={
            // Added aria-activedescendant
            isOpen && highlightedIndex !== null
              ? getOptionId(highlightedIndex)
              : undefined
          }
          aria-invalid={!!error} // Indicate error state
          aria-describedby={error ? `${id}-error` : undefined} // Link error message
          disabled={disabled} // HTML disabled attribute (though interaction is blocked by JS)
          value={selectedOption ? selectedOption.label : placeholder}
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
          className={`w-full px-4 py-2 glass-brand-dark rounded-lg focus:outline-none transition shadow-sm border hover:border-brand-500/40 active:scale-[0.98] ${
            !selectedOption ? 'text-on-dark opacity-70' : 'text-on-dark' // Use text-on-dark for placeholder and selected value
          } ${
            error
              ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' // Error styles
              : 'border-brand-500/20 focus:ring-2 focus:ring-brand-700/50 focus:border-transparent' // Default styles
          } ${
            disabled
              ? 'opacity-60 cursor-not-allowed bg-brand-900/30' // Disabled styles
              : 'cursor-pointer'
          }`}
        />
        <div
          id={listboxId} // Added ID
          role="listbox" // Added role
          ref={optionsRef}
          tabIndex={-1} // Make it non-focusable but keep it in accessibility tree
          className={`absolute z-10 mt-1 w-full glass-brand-dark rounded-lg transition-all duration-200 ease-out transform ${
            isOpen
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95 pointer-events-none'
          } max-h-60 overflow-y-auto focus:outline-none`} // Added focus:outline-none
        >
          {options.map((option: Option, index: number) => {
            const isActive = value === option.value;
            const isHighlighted = index === highlightedIndex;
            const optionId = getOptionId(index); // Get unique ID for the option
            return (
              <div
                id={optionId} // Added ID
                key={option.value} // Use option.value for key if unique, otherwise index
                role="option" // Added role
                aria-selected={isActive} // Added aria-selected
                onClick={
                  !isActive && !disabled // Prevent click if disabled
                    ? () => handleOptionSelect(option)
                    : undefined
                }
                className={`px-4 py-2 transition-all ${
                  isHighlighted ? 'bg-brand-700' : ''
                } ${
                  isActive
                    ? 'glass cursor-default' // Keep selected item non-interactive visually
                    : disabled
                    ? 'cursor-not-allowed opacity-70' // Disabled option style
                    : 'cursor-pointer hover:glass-dark'
                } border border-transparent`}
              >
                {option.label}
              </div>
            );
          })}
        </div>
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

export default FormSelect;
