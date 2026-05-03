import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn Input with dossier styling — transparent background, hairline
 * bottom border, brand-tinted underline on focus, serif body text. No
 * rounded fill; the input reads as a fillable field on a paper card.
 *
 * Drops shadcn's default `flex h-10 rounded-md border bg-background`
 * because the dossier vocabulary specifically avoids the shadowed-input
 * look. Pass `aria-invalid` for the destructive state (CSS attribute
 * selector picks it up).
 */
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        'flex w-full bg-transparent border-0 border-b border-input/70 px-1 py-1.5',
        'font-serif text-[14px] text-foreground placeholder:text-muted-foreground/70',
        'focus-visible:outline-none focus-visible:border-ring transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-[invalid=true]:border-destructive/60 aria-[invalid=true]:focus-visible:border-destructive',
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
