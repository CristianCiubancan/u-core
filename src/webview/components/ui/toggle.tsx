import * as React from 'react';
import * as TogglePrimitive from '@radix-ui/react-toggle';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * shadcn Toggle — hairline-rim or ghost button that flips brand on
 * pressed. Use for inline formatting (bold/italic) or single-state
 * filters; pair via <ToggleGroup /> for radio / multi-select rows.
 */
const toggleVariants = cva(
  [
    'inline-flex items-center justify-center gap-1.5',
    'font-mono text-[10px] tracking-[0.25em] uppercase',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    'disabled:pointer-events-none disabled:opacity-50',
    'data-[state=on]:text-primary data-[state=on]:border-primary/70',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'border border-input/70 bg-transparent hover:bg-foreground/[0.04] data-[state=on]:bg-primary/[0.08]',
        outline:
          'border border-border/60 bg-transparent hover:bg-foreground/[0.04] data-[state=on]:bg-primary/[0.06]',
        ghost:
          'border border-transparent bg-transparent hover:bg-foreground/[0.04] data-[state=on]:bg-primary/[0.08] data-[state=on]:border-primary/40',
      },
      size: {
        default: 'h-8 px-3',
        sm: 'h-7 px-2.5',
        lg: 'h-9 px-4',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

const Toggle = React.forwardRef<
  React.ComponentRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root
    ref={ref}
    className={cn(toggleVariants({ variant, size }), className)}
    {...props}
  />
));
Toggle.displayName = TogglePrimitive.Root.displayName;

export { Toggle, toggleVariants };
