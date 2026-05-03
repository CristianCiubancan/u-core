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
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

/**
 * Composed date picker — Input-styled trigger + Popover + Calendar.
 * This is the shadcn convention (Calendar is the primitive; the
 * popover composition lives at the app level). Replaces our home-grown
 * DatePicker; the popover handles flip + portal automatically thanks
 * to Radix.
 */
const DatePicker = ({
  id,
  label,
  selected,
  onChange,
  placeholder = 'Select a date',
  disabled,
  error,
}: DatePickerProps) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <Label htmlFor={id} className={error ? 'text-destructive' : undefined}>
          {label}
        </Label>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className={cn(
              'flex w-full items-center justify-between',
              'bg-transparent border-0 border-b border-input/70 px-1 py-1.5 pr-6',
              'font-serif text-[14px] text-left',
              'transition-colors',
              'focus-visible:outline-none focus-visible:border-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              selected ? 'text-foreground' : 'text-muted-foreground/70',
              error && 'border-destructive/60 focus-visible:border-destructive'
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
            <CalendarIcon className="h-3.5 w-3.5 opacity-50 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <Calendar
            mode="single"
            selected={selected ?? undefined}
            onSelect={onChange}
            captionLayout="dropdown"
            startMonth={new Date(1900, 0)}
            endMonth={new Date(new Date().getFullYear() + 5, 11)}
          />
        </PopoverContent>
      </Popover>
      {error && (
        <p
          id={`${id}-error`}
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
