import * as React from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';

interface DatePickerProps {
  id: string;
  label?: string;
  selected?: Date | null;
  onChange?: (date: Date | undefined) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  /** Earliest pickable date. Days before this are disabled. */
  minDate?: Date;
  /** Latest pickable date. Days after this are disabled. */
  maxDate?: Date;
  /** Year shown when the calendar opens with no `selected`. Defaults to today. */
  defaultMonth?: Date;
  /** When true, render month + year as <select> dropdowns inside the caption. */
  yearNav?: boolean;
}

/**
 * Composed date picker — Input-styled trigger + Popover + Calendar.
 *
 * - Popover open state is controlled here so we can auto-close on select.
 * - `yearNav` switches the calendar caption to `dropdown` mode (month/year
 *   <select>s) so birthdate-style flows aren't 12-clicks-per-year.
 * - `minDate`/`maxDate` bound BOTH the dropdown range AND the day-grid
 *   `disabled` state, so the user can't navigate to or select an
 *   out-of-range day either way.
 */
const DatePicker = ({
  id,
  label,
  selected,
  onChange,
  onBlur,
  placeholder = 'Select a date',
  disabled,
  error,
  minDate,
  maxDate,
  defaultMonth,
  yearNav,
}: DatePickerProps) => {
  const [open, setOpen] = React.useState(false);
  const errorId = error ? `${id}-error` : undefined;
  const initialMonth = selected ?? defaultMonth ?? maxDate ?? new Date();

  const disabledMatcher = React.useMemo(() => {
    if (minDate && maxDate) return [{ before: minDate }, { after: maxDate }];
    if (minDate) return { before: minDate };
    if (maxDate) return { after: maxDate };
    return undefined;
  }, [minDate, maxDate]);

  return (
    <div className="space-y-1.5">
      {label && (
        <Label htmlFor={id} className={error ? 'text-destructive' : undefined}>
          {label}
        </Label>
      )}
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) onBlur?.();
        }}
      >
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={errorId}
            className={cn(
              'group flex w-full items-center justify-between',
              'bg-transparent border-0 border-b border-input/70 px-1 py-1.5 pr-6',
              'font-serif text-[14px] text-left',
              'hover:border-input transition-colors duration-150',
              'focus-visible:outline-none focus-visible:border-ring',
              'data-[state=open]:border-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              selected ? 'text-foreground' : 'text-muted-foreground/70',
              error &&
                'border-destructive/60 focus-visible:border-destructive data-[state=open]:border-destructive'
            )}
          >
            <span className="truncate">
              {selected
                ? selected.toLocaleDateString(navigator.language || 'en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : placeholder}
            </span>
            <CalendarIcon
              className={cn(
                'h-3.5 w-3.5 opacity-50 shrink-0 transition-opacity duration-150',
                'group-hover:opacity-80 group-data-[state=open]:opacity-90'
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[clamp(280px,28vw,340px)] p-3"
          align="end"
        >
          <Calendar
            mode="single"
            selected={selected ?? undefined}
            onSelect={(date) => {
              onChange?.(date);
              if (date) setOpen(false);
            }}
            defaultMonth={initialMonth}
            disabled={disabledMatcher}
            startMonth={minDate}
            endMonth={maxDate}
            captionLayout={yearNav ? 'dropdown' : 'label'}
          />
        </PopoverContent>
      </Popover>
      {error && (
        <p
          id={errorId}
          className="font-mono text-[9px] tracking-[0.2em] uppercase text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};
DatePicker.displayName = 'DatePicker';

export { DatePicker };
