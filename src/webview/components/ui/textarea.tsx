import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * shadcn Textarea — same dossier vocabulary as <Input />. Transparent
 * background, hairline bottom border, brand-tinted underline on focus,
 * serif body text. Pass `aria-invalid` for the destructive state.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex w-full bg-transparent border-0 border-b border-input/70 px-1 py-1.5',
      'font-serif text-[14px] text-foreground placeholder:text-muted-foreground/70',
      'min-h-[64px] resize-y',
      'hover:border-input',
      'focus-visible:outline-none focus-visible:border-ring transition-colors duration-150',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'aria-[invalid=true]:border-destructive/60 aria-[invalid=true]:focus-visible:border-destructive',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Textarea };
