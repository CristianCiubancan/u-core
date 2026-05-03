import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker } from 'react-day-picker';

import { cn } from '@/lib/utils';

/**
 * shadcn-style Calendar wrapping react-day-picker v9. Styled to the
 * dossier vocabulary — small mono weekday labels, brand-tinted
 * selection, hairline outline on today. Use this inside a Popover for
 * a date-input affordance, or standalone for a full calendar view.
 */
export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
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
        month_caption: 'flex justify-center items-center pt-1 px-8 relative h-7',
        caption_label:
          'font-mono text-[10px] tracking-[0.25em] uppercase text-foreground',
        // dropdown caption (captionLayout="dropdown") — react-day-picker
        // renders a `select` overlaid on top of a visible `caption_label`
        // span. We restyle the visible label to look like one of our
        // hairline-underlined inputs and make the native select fully
        // transparent so only the styled span shows; the click target is
        // still the select underneath.
        dropdowns: 'flex items-center justify-center gap-2',
        dropdown_root:
          'relative inline-flex items-center px-1.5 py-0.5 border-b border-input/60 hover:border-input focus-within:border-ring transition-colors duration-150',
        dropdown:
          'absolute inset-0 w-full opacity-0 cursor-pointer appearance-none bg-transparent',
        months_dropdown: '',
        years_dropdown: '',
        nav: 'absolute inset-x-0 top-1 flex items-center justify-between px-1',
        button_previous:
          'inline-flex items-center justify-center h-6 w-6 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none disabled:opacity-30 disabled:cursor-not-allowed',
        button_next:
          'inline-flex items-center justify-center h-6 w-6 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none disabled:opacity-30 disabled:cursor-not-allowed',
        chevron: 'h-3 w-3 fill-current',
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
        Chevron: ({ orientation, className: c, ...rest }) =>
          orientation === 'left' ? (
            <ChevronLeft className={cn('h-3 w-3', c)} {...rest} />
          ) : (
            <ChevronRight className={cn('h-3 w-3', c)} {...rest} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
