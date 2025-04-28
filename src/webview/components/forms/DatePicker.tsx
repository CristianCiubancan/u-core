import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

type CalendarView = 'days' | 'months' | 'years';

interface DatePickerProps {
  id: string;
  label: string;
  placeholder?: string;
  selected?: Date | null;
  onChange?: (date: Date | null) => void;
  error?: string; // Optional error message
  disabled?: boolean; // Optional disabled state
}

const isSameDay = (date1: Date | null, date2: Date | null): boolean => {
  if (!date1 || !date2) return false;
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
};

const DatePicker = ({
  id,
  label,
  placeholder = 'Select a date',
  selected = null,
  onChange,
  error,
  disabled = false,
}: DatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(selected || today); // Date controlling the calendar view
  const [focusedDate, setFocusedDate] = useState(selected || today); // Date that has keyboard focus
  const [calendarView, setCalendarView] = useState<CalendarView>('days'); // State for view type
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const prevMonthRef = useRef<HTMLButtonElement>(null);
  const nextMonthRef = useRef<HTMLButtonElement>(null);

  const popupId = `${id}-popup`;
  const headingId = `${id}-heading`;
  // Wrap getDayId in useCallback to stabilize its reference
  const getDayId = useCallback(
    (date: Date) => `${id}-day-${date.toISOString().split('T')[0]}`,
    [id] // Dependency: id prop
  );

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']; // Consider localization

  const openPopup = useCallback(() => {
    if (disabled) return; // Prevent opening if disabled
    const dateToShow = selected || today;
    setViewDate(dateToShow);
    setFocusedDate(dateToShow);
    setCalendarView('days'); // Reset to day view on open
    setIsOpen(true);
  }, [selected, today, disabled]); // Added 'disabled'

  const closePopup = useCallback(() => {
    setIsOpen(false);
    setCalendarView('days'); // Reset view on close
    // Return focus to the input button
    inputRef.current?.focus();
  }, []);

  const handleDateSelect = useCallback(
    (date: Date) => {
      if (onChange) {
        onChange(date);
      }
      closePopup();
    },
    [onChange, closePopup]
  );

  const handlePrev = useCallback(() => {
    setViewDate((prev) => {
      switch (calendarView) {
        case 'days':
          return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
        case 'months':
          return new Date(prev.getFullYear() - 1, prev.getMonth(), 1);
        case 'years':
          // Go back 10 years
          return new Date(prev.getFullYear() - 10, prev.getMonth(), 1);
        default:
          return prev;
      }
    });
    // Basic focus handling for now, might need refinement
    prevMonthRef.current?.focus();
  }, [calendarView]);

  const handleNext = useCallback(() => {
    setViewDate((prev) => {
      switch (calendarView) {
        case 'days':
          return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
        case 'months':
          return new Date(prev.getFullYear() + 1, prev.getMonth(), 1);
        case 'years':
          // Go forward 10 years
          return new Date(prev.getFullYear() + 10, prev.getMonth(), 1);
        default:
          return prev;
      }
    });
    // Basic focus handling
    nextMonthRef.current?.focus();
  }, [calendarView]);

  const handleHeaderClick = useCallback(() => {
    if (calendarView === 'days') {
      setCalendarView('months');
    } else if (calendarView === 'months') {
      setCalendarView('years');
    }
    // Clicking header in 'years' view does nothing for now
  }, [calendarView]);

  const handleMonthSelect = useCallback(
    (monthIndex: number) => {
      setViewDate(new Date(viewDate.getFullYear(), monthIndex, 1));
      setCalendarView('days'); // Go back to day view
    },
    [viewDate]
  );

  const handleYearSelect = useCallback(
    (year: number) => {
      setViewDate(new Date(year, viewDate.getMonth(), 1));
      setCalendarView('months'); // Go back to month view
    },
    [viewDate]
  );

  // Generate dates for the 6x7 grid
  const gridDates = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
    const startDate = new Date(year, month, 1 - firstDayOfMonth);
    const grid: Date[] = [];
    for (let i = 0; i < 42; i++) {
      grid.push(new Date(startDate.getTime() + i * 86400000)); // 86400000 ms in a day
    }
    return grid;
  }, [viewDate]);

  // Generate months for the year view
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) =>
      new Date(0, i).toLocaleDateString(navigator.language || 'en-US', {
        month: 'short',
      })
    );
  }, []);

  // Generate years for the decade view
  const yearGrid = useMemo(() => {
    const currentYear = viewDate.getFullYear();
    const startYear = Math.floor(currentYear / 10) * 10; // Start of the decade
    const years: number[] = [];
    for (let i = 0; i < 12; i++) {
      // Show 12 years for a 3x4 grid
      years.push(startYear + i - 1); // Include one year before and after decade
    }
    return years;
  }, [viewDate]);

  // Focus management: Move focus into popup when opened
  useEffect(() => {
    if (isOpen && popupRef.current) {
      // Focus the first focusable element, e.g., the prev month button
      prevMonthRef.current?.focus();
    }
  }, [isOpen]);

  // Focus management: Trap focus within the popup
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && popupRef.current) {
        const focusableElements = Array.from<HTMLElement>(
          popupRef.current.querySelectorAll(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null); // Filter out hidden elements

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      } else if (event.key === 'Escape') {
        closePopup();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closePopup]);

  // Click outside handler
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closePopup();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closePopup]);

  // Keyboard navigation for the grid
  const handleGridKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const newFocusedDate = new Date(focusedDate); // Use focusedDate as the base for navigation
      const newViewDate = new Date(viewDate);
      let handled = false;
      let focusUpdateNeeded = true; // Flag to control focus update at the end

      if (calendarView === 'days') {
        switch (event.key) {
          case 'ArrowRight':
            newFocusedDate.setDate(newFocusedDate.getDate() + 1);
            handled = true;
            break;
          case 'ArrowLeft':
            newFocusedDate.setDate(newFocusedDate.getDate() - 1);
            handled = true;
            break;
          case 'ArrowDown':
            newFocusedDate.setDate(newFocusedDate.getDate() + 7);
            handled = true;
            break;
          case 'ArrowUp':
            newFocusedDate.setDate(newFocusedDate.getDate() - 7);
            handled = true;
            break;
          case 'PageDown':
            newViewDate.setMonth(
              newViewDate.getMonth() + (event.shiftKey ? 12 : 1)
            );
            newFocusedDate.setMonth(
              newFocusedDate.getMonth() + (event.shiftKey ? 12 : 1)
            );
            handled = true;
            break;
          case 'PageUp':
            newViewDate.setMonth(
              newViewDate.getMonth() - (event.shiftKey ? 12 : 1)
            );
            newFocusedDate.setMonth(
              newFocusedDate.getMonth() - (event.shiftKey ? 12 : 1)
            );
            handled = true;
            break;
          case 'Home':
            newFocusedDate.setDate(
              newFocusedDate.getDate() - newFocusedDate.getDay()
            );
            handled = true;
            break;
          case 'End':
            newFocusedDate.setDate(
              newFocusedDate.getDate() + (6 - newFocusedDate.getDay())
            );
            handled = true;
            break;
          case 'Enter':
          case ' ':
            if (focusedDate.getMonth() === viewDate.getMonth()) {
              handleDateSelect(focusedDate);
              focusUpdateNeeded = false; // Don't refocus after selection closes popup
            }
            handled = true;
            break;
          default:
            break;
        }
        // Update viewDate if navigation crossed month/year boundaries
        if (
          handled &&
          (newFocusedDate.getMonth() !== viewDate.getMonth() ||
            newFocusedDate.getFullYear() !== viewDate.getFullYear())
        ) {
          setViewDate(
            new Date(newFocusedDate.getFullYear(), newFocusedDate.getMonth(), 1)
          );
        } else if (handled && newViewDate.getTime() !== viewDate.getTime()) {
          setViewDate(newViewDate); // Handle PageUp/Down view change
        }
      } else if (calendarView === 'months') {
        let currentMonth = focusedDate.getMonth();
        switch (event.key) {
          case 'ArrowRight':
            currentMonth = (currentMonth + 1) % 12;
            handled = true;
            break;
          case 'ArrowLeft':
            currentMonth = (currentMonth - 1 + 12) % 12;
            handled = true;
            break;
          case 'ArrowDown':
            currentMonth = (currentMonth + 3) % 12;
            handled = true;
            break;
          case 'ArrowUp':
            currentMonth = (currentMonth - 3 + 12) % 12;
            handled = true;
            break;
          case 'PageDown': // Next Year
            newViewDate.setFullYear(newViewDate.getFullYear() + 1);
            newFocusedDate.setFullYear(newFocusedDate.getFullYear() + 1);
            setViewDate(newViewDate);
            handled = true;
            break;
          case 'PageUp': // Previous Year
            newViewDate.setFullYear(newViewDate.getFullYear() - 1);
            newFocusedDate.setFullYear(newFocusedDate.getFullYear() - 1);
            setViewDate(newViewDate);
            handled = true;
            break;
          case 'Home':
            currentMonth = 0;
            handled = true;
            break; // Jan
          case 'End':
            currentMonth = 11;
            handled = true;
            break; // Dec
          case 'Enter':
          case ' ':
            handleMonthSelect(focusedDate.getMonth());
            focusUpdateNeeded = false; // Don't refocus after selection changes view
            handled = true;
            break;
          default:
            break;
        }
        if (handled && focusUpdateNeeded) {
          newFocusedDate.setMonth(currentMonth);
        }
      } else if (calendarView === 'years') {
        const currentYear = focusedDate.getFullYear();
        let currentYearIndex = yearGrid.findIndex((y) => y === currentYear);
        if (currentYearIndex === -1) currentYearIndex = 1; // Default to first year in decade if not found

        switch (event.key) {
          case 'ArrowRight':
            currentYearIndex = Math.min(11, currentYearIndex + 1);
            handled = true;
            break;
          case 'ArrowLeft':
            currentYearIndex = Math.max(0, currentYearIndex - 1);
            handled = true;
            break;
          case 'ArrowDown':
            currentYearIndex = Math.min(11, currentYearIndex + 4);
            handled = true;
            break;
          case 'ArrowUp':
            currentYearIndex = Math.max(0, currentYearIndex - 4);
            handled = true;
            break;
          case 'PageDown': // Next Decade
            newViewDate.setFullYear(newViewDate.getFullYear() + 10);
            newFocusedDate.setFullYear(newFocusedDate.getFullYear() + 10);
            setViewDate(newViewDate);
            handled = true;
            break;
          case 'PageUp': // Previous Decade
            newViewDate.setFullYear(newViewDate.getFullYear() - 10);
            newFocusedDate.setFullYear(newFocusedDate.getFullYear() - 10);
            setViewDate(newViewDate);
            handled = true;
            break;
          case 'Home':
            currentYearIndex = 1;
            handled = true;
            break; // First year of decade grid (index 1)
          case 'End':
            currentYearIndex = 10;
            handled = true;
            break; // Last year of decade grid (index 10)
          case 'Enter':
          case ' ':
            handleYearSelect(yearGrid[currentYearIndex]);
            focusUpdateNeeded = false; // Don't refocus after selection changes view
            handled = true;
            break;
          default:
            break;
        }
        if (handled && focusUpdateNeeded) {
          newFocusedDate.setFullYear(yearGrid[currentYearIndex]);
        }
      }

      if (handled) {
        event.preventDefault();
        setFocusedDate(newFocusedDate); // Update focused date state

        // Focus the corresponding element after state update
        if (focusUpdateNeeded) {
          // Use setTimeout to allow state update and re-render before focusing
          setTimeout(() => {
            let elementToFocus: HTMLButtonElement | null | undefined = null; // Allow undefined initially
            if (calendarView === 'days') {
              const dayButtonId = getDayId(newFocusedDate);
              elementToFocus =
                popupRef.current?.querySelector<HTMLButtonElement>(
                  `#${dayButtonId}`
                );
            } else if (calendarView === 'months') {
              const monthIndex = newFocusedDate.getMonth();
              // Ensure querySelectorAll result exists before indexing
              const monthButtons =
                popupRef.current?.querySelectorAll<HTMLButtonElement>(
                  '.grid-cols-3 button'
                );
              elementToFocus = monthButtons?.[monthIndex];
            } else if (calendarView === 'years') {
              const year = newFocusedDate.getFullYear();
              const yearIndex = yearGrid.findIndex((y) => y === year);
              if (yearIndex !== -1) {
                // Ensure querySelectorAll result exists before indexing
                const yearButtons =
                  popupRef.current?.querySelectorAll<HTMLButtonElement>(
                    '.grid-cols-4 button'
                  );
                elementToFocus = yearButtons?.[yearIndex];
              }
            }
            // Only call focus if elementToFocus is not null/undefined
            if (elementToFocus) {
              elementToFocus.focus();
            }
          }, 0);
        }
      }
    },
    [
      focusedDate,
      viewDate,
      calendarView,
      handleDateSelect,
      handleMonthSelect,
      handleYearSelect,
      yearGrid,
      getDayId, // Added 'getDayId'
    ] // Added dependencies
  );

  // Effect to focus the specific date/month/year button when view changes or focusedDate changes
  useEffect(() => {
    // This effect handles initial focus when the popup opens or view changes,
    // and ensures the focused element is visible after state updates.
    // The handleGridKeyDown handles focus during keyboard navigation itself.
    if (isOpen && focusedDate && popupRef.current) {
      // Use setTimeout to ensure focus happens after potential re-renders due to state changes
      setTimeout(() => {
        let elementToFocus: HTMLButtonElement | null | undefined = null;

        if (calendarView === 'days') {
          const dayButtonId = getDayId(focusedDate);
          elementToFocus = popupRef.current?.querySelector<HTMLButtonElement>(
            `#${dayButtonId}`
          );
          // Only focus if the date is actually visible in the current grid
          if (!gridDates.some((d) => isSameDay(d, focusedDate))) {
            elementToFocus = null; // Don't focus if not visible
          }
        } else if (calendarView === 'months') {
          const monthIndex = focusedDate.getMonth();
          const monthButtons =
            popupRef.current?.querySelectorAll<HTMLButtonElement>(
              '.grid-cols-3 button'
            );
          elementToFocus = monthButtons?.[monthIndex];
        } else if (calendarView === 'years') {
          const year = focusedDate.getFullYear();
          const yearIndex = yearGrid.findIndex((y) => y === year);
          if (yearIndex !== -1) {
            const yearButtons =
              popupRef.current?.querySelectorAll<HTMLButtonElement>(
                '.grid-cols-4 button'
              );
            elementToFocus = yearButtons?.[yearIndex];
          }
        }

        if (elementToFocus) {
          elementToFocus.focus();
        } else if (
          gridRef.current &&
          document.activeElement !== inputRef.current
        ) {
          // Fallback focus to the grid container if the specific item isn't found
          // or if focus hasn't already returned to the input (e.g., on close)
          // gridRef.current.focus(); // Focusing grid might not be ideal, maybe focus prev/next instead?
          // Let's try focusing the header button as a fallback
          const headerButton =
            popupRef.current?.querySelector<HTMLButtonElement>(`#${headingId}`);
          headerButton?.focus();
        }
      }, 0);
    }
  }, [
    isOpen,
    focusedDate,
    calendarView,
    gridDates,
    yearGrid,
    headingId,
    getDayId,
  ]); // Added 'getDayId'

  return (
    <div className="space-y-2" ref={containerRef}>
      <label htmlFor={id} className="block font-medium">
        {label}
      </label>
      <div className="relative">
        {/* Input acts as the dropdown trigger */}
        <input
          ref={inputRef}
          type="text"
          id={id}
          readOnly
          value={
            selected
              ? selected.toLocaleDateString(navigator.language || 'en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : placeholder
          }
          onClick={openPopup}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={popupId}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={disabled} // Add disabled attribute
          className={`w-full px-4 py-2 glass-brand-dark rounded-lg focus:outline-none transition shadow-sm border hover:border-brand-500/40 active:scale-[0.98] ${
            error
              ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/50' // Error styles
              : 'border-brand-500/20 focus:ring-2 focus:ring-brand-700/50 focus:border-transparent' // Default styles
          } ${
            disabled
              ? 'opacity-60 cursor-not-allowed bg-brand-900/30' // Disabled styles
              : 'cursor-pointer'
          }`}
        />
        {/* Popup Dialog */}
        <div
          ref={popupRef}
          id={popupId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={headingId}
          tabIndex={-1} // Make popup focusable programmatically
          className={`absolute z-10 mt-1 w-72 glass-brand-dark border border-brand-500/20 rounded-lg shadow-lg transition-all duration-200 ${
            // Changed bg-white to glass-brand-dark, added border
            // Changed w-auto to w-72
            isOpen
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-95 pointer-events-none'
          } scrollbar-brand-dark focus:outline-none`}
        >
          {isOpen && ( // Conditionally render content to ensure refs are available
            <div className="p-2">
              {' '}
              {/* Added padding around the whole calendar */}
              {/* Header: Month/Year Navigation */}
              <div className="flex justify-between items-center pb-2 mb-2 border-b">
                <button
                  ref={prevMonthRef}
                  type="button"
                  aria-label={
                    calendarView === 'days'
                      ? 'Previous month'
                      : calendarView === 'months'
                      ? 'Previous year'
                      : 'Previous decade'
                  }
                  onClick={handlePrev}
                  disabled={disabled} // Disable button if component is disabled
                  className={`p-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500 ${
                    disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-white/10'
                  }`} // Adjusted hover/focus colors & disabled style
                >
                  <FaChevronLeft className="w-4 h-4 text-brand-300" />
                </button>
                {/* Header Button */}
                <button
                  type="button"
                  id={headingId}
                  onClick={handleHeaderClick}
                  disabled={disabled || calendarView === 'years'} // Disable click in year view
                  className={`font-semibold text-brand-100 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500 ${
                    calendarView !== 'years' && !disabled
                      ? 'hover:bg-white/10'
                      : 'cursor-default'
                  }`}
                >
                  {calendarView === 'days' &&
                    viewDate.toLocaleDateString(navigator.language || 'en-US', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  {calendarView === 'months' &&
                    viewDate.toLocaleDateString(navigator.language || 'en-US', {
                      year: 'numeric',
                    })}
                  {calendarView === 'years' &&
                    `${yearGrid[1]} - ${yearGrid[10]}`}
                </button>
                {/* Next Button */}
                <button
                  ref={nextMonthRef}
                  type="button"
                  aria-label={
                    calendarView === 'days'
                      ? 'Next month'
                      : calendarView === 'months'
                      ? 'Next year'
                      : 'Next decade'
                  }
                  onClick={handleNext}
                  disabled={disabled} // Disable button if component is disabled
                  className={`p-2 rounded focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-500 ${
                    disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-white/10'
                  }`} // Adjusted hover/focus colors & disabled style
                >
                  <FaChevronRight className="w-4 h-4 text-brand-300" />
                </button>
              </div>
              {/* Conditional Calendar Grid */}
              <div
                ref={gridRef}
                role="grid"
                aria-labelledby={headingId}
                // tabIndex={0} // Make grid container focusable if managing focus via aria-activedescendant
                onKeyDown={handleGridKeyDown} // Handle keydown events on the grid container
                className="focus:outline-none" // Remove outline from grid container itself
              >
                {/* Days View */}
                {calendarView === 'days' && (
                  <>
                    {/* Day Headers */}
                    <div role="row" className="grid grid-cols-7 gap-1 mb-1">
                      {daysOfWeek.map((day) => (
                        <div
                          key={day}
                          role="columnheader"
                          aria-label={day} // Full day name might be better here
                          className="text-center text-xs font-medium text-brand-300"
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    {/* Date Cells */}
                    <div className="grid grid-cols-7 gap-1">
                      {gridDates.map((date) => {
                        const isCurrentMonth =
                          date.getMonth() === viewDate.getMonth();
                        const isSel = isSameDay(date, selected);
                        const isFocused = isSameDay(date, focusedDate);
                        const isToday = isSameDay(date, today);
                        const isDisabled = !isCurrentMonth;
                        const dayId = getDayId(date);

                        return (
                          <button
                            type="button"
                            id={dayId}
                            key={dayId}
                            role="gridcell"
                            aria-selected={isSel}
                            aria-disabled={isDisabled || disabled || undefined}
                            disabled={isDisabled || disabled}
                            tabIndex={-1}
                            onClick={() => !disabled && handleDateSelect(date)}
                            className={`p-1.5 text-sm text-center rounded transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-brand-500 ${
                              isSel
                                ? 'bg-brand-500 text-accessible-on-brand font-semibold hover:bg-brand-600' // Use text-accessible-on-brand
                                : isToday
                                ? 'text-brand-300 font-semibold border border-brand-400/50'
                                : ''
                            } ${
                              isDisabled || disabled
                                ? 'text-brand-100/30 cursor-default'
                                : 'text-brand-100 hover:bg-white/10 cursor-pointer'
                            } ${
                              isFocused && !disabled
                                ? 'ring-2 ring-brand-500 ring-offset-0'
                                : ''
                            }`}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Months View */}
                {calendarView === 'months' && (
                  <div className="grid grid-cols-3 gap-2">
                    {months.map((month, index) => {
                      const isCurrentMonth =
                        index === today.getMonth() &&
                        viewDate.getFullYear() === today.getFullYear();
                      const isSelectedMonth =
                        index === selected?.getMonth() &&
                        viewDate.getFullYear() === selected?.getFullYear();
                      return (
                        <button
                          key={month}
                          type="button"
                          disabled={disabled}
                          onClick={() => !disabled && handleMonthSelect(index)}
                          className={`p-2 text-sm text-center rounded transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-brand-500 ${
                            isSelectedMonth
                              ? 'bg-brand-500 text-accessible-on-brand font-semibold hover:bg-brand-600' // Use text-accessible-on-brand
                              : isCurrentMonth
                              ? 'text-brand-300 font-semibold border border-brand-400/50'
                              : ''
                          } ${
                            disabled
                              ? 'text-brand-100/30 cursor-default'
                              : 'text-brand-100 hover:bg-white/10 cursor-pointer'
                          }`}
                        >
                          {month}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Years View */}
                {calendarView === 'years' && (
                  <div className="grid grid-cols-4 gap-2">
                    {yearGrid.map((year, index) => {
                      const isCurrentYear = year === today.getFullYear();
                      const isSelectedYear = year === selected?.getFullYear();
                      // Dim years outside the current decade (first and last)
                      const isOutsideDecade = index === 0 || index === 11;
                      return (
                        <button
                          key={year}
                          type="button"
                          disabled={disabled}
                          onClick={() => !disabled && handleYearSelect(year)}
                          className={`p-2 text-sm text-center rounded transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-brand-500 ${
                            isSelectedYear
                              ? 'bg-brand-500 text-accessible-on-brand font-semibold hover:bg-brand-600' // Use text-accessible-on-brand
                              : isCurrentYear
                              ? 'text-brand-300 font-semibold border border-brand-400/50'
                              : ''
                          } ${
                            disabled || isOutsideDecade
                              ? 'text-brand-100/30 cursor-default'
                              : 'text-brand-100 hover:bg-white/10 cursor-pointer'
                          }`}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
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

export default DatePicker;
