import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, useDayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * shadcn-style Calendar wrapping react-day-picker v9.
 *
 * Notable customization: we replace RDP's `MonthCaption` and `Nav`
 * components entirely. RDP's `captionLayout="dropdown"` falls back to
 * native HTML <select>s, which CEF/Chromium render with the OS-native
 * option list (system font, system selection color) — there's no way
 * to style that. By owning MonthCaption ourselves we render shadcn
 * <Select/>s instead, which keep the dossier vocabulary.
 *
 * We also drop the default Nav (it would render a second pair of
 * chevrons on top of our caption) and put navigation buttons inside
 * the custom caption row.
 */

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const navButtonClasses = cn(
  'inline-flex items-center justify-center h-7 w-7 shrink-0',
  'border border-transparent bg-transparent text-muted-foreground/80',
  'transition-colors duration-150',
  'hover:text-foreground hover:bg-foreground/[0.04]',
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
  'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent'
);

function MonthCaptionCustom({
  calendarMonth,
}: {
  calendarMonth: { date: Date };
  displayIndex: number;
}) {
  const ctx = useDayPicker();
  const { goToMonth, nextMonth, previousMonth, dayPickerProps } = ctx;

  const month = calendarMonth.date;
  const monthIdx = month.getMonth();
  const year = month.getFullYear();

  const showDropdowns = dayPickerProps.captionLayout === 'dropdown';

  // Year range — bound by startMonth/endMonth when provided so the
  // dropdown doesn't list 200 years for a birthdate flow that's
  // already capped at, say, 18–100 years old.
  const startYear = dayPickerProps.startMonth?.getFullYear() ?? year - 100;
  const endYear = dayPickerProps.endMonth?.getFullYear() ?? year + 10;

  // Memoize the SelectItem arrays so re-renders during navigation
  // don't recreate ~80 elements per month change.
  const yearItems = React.useMemo(() => {
    const items: React.ReactElement[] = [];
    for (let y = endYear; y >= startYear; y--) {
      items.push(
        <SelectItem key={y} value={String(y)}>
          {y}
        </SelectItem>
      );
    }
    return items;
  }, [startYear, endYear]);

  const monthItems = React.useMemo(
    () =>
      MONTH_LABELS.map((label, i) => (
        <SelectItem key={i} value={String(i)}>
          {label}
        </SelectItem>
      )),
    []
  );

  return (
    <div className="flex items-center justify-between gap-1 px-1">
      <button
        type="button"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        aria-label="Previous month"
        className={navButtonClasses}
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.6} />
      </button>

      {showDropdowns ? (
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <Select
              value={String(monthIdx)}
              onValueChange={(v) =>
                goToMonth(new Date(year, parseInt(v, 10), 1))
              }
            >
              <SelectTrigger
                className="h-7 py-0 font-mono text-[10px] tracking-[0.2em] uppercase"
                aria-label="Month"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{monthItems}</SelectContent>
            </Select>
          </div>
          <div className="w-[4.5em] shrink-0">
            <Select
              value={String(year)}
              onValueChange={(v) =>
                goToMonth(new Date(parseInt(v, 10), monthIdx, 1))
              }
            >
              <SelectTrigger
                className="h-7 py-0 font-mono text-[10px] tracking-[0.2em] uppercase"
                aria-label="Year"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>{yearItems}</SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <span className="flex-1 text-center font-mono text-[10px] tracking-[0.25em] uppercase text-foreground">
          {MONTH_LABELS[monthIdx]} {year}
        </span>
      )}

      <button
        type="button"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        aria-label="Next month"
        className={navButtonClasses}
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.6} />
      </button>
    </div>
  );
}

function NavCustom() {
  // RDP renders this above MonthCaption by default. We've folded the
  // navigation buttons into our custom caption, so render nothing here
  // to avoid a double row of chevrons.
  return null;
}

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-1', className)}
      classNames={{
        root: 'space-y-2',
        months: 'flex flex-col gap-2',
        month: 'space-y-2',
        // The custom MonthCaption owns its own layout; reset RDP's
        // default `relative` + padding here so our flex row spans full
        // width without weird gaps.
        month_caption: '',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'flex-1 text-center font-mono text-[9px] tracking-[0.15em] uppercase text-muted-foreground py-1',
        week: 'flex w-full mt-1',
        day: 'flex-1 text-center p-0.5 relative',
        day_button: cn(
          'h-8 w-full font-serif text-[13px] text-foreground/80',
          'hover:bg-accent/40 transition-colors duration-100',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'border border-transparent'
        ),
        selected:
          '[&>button]:bg-primary/20 [&>button]:border-primary/60 [&>button]:text-primary',
        today: '[&>button]:border-primary/30 [&>button]:text-primary',
        outside: '[&>button]:text-muted-foreground/40',
        disabled:
          '[&>button]:opacity-30 [&>button]:cursor-not-allowed [&>button]:pointer-events-none',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        MonthCaption: MonthCaptionCustom,
        Nav: NavCustom,
        ...components,
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
