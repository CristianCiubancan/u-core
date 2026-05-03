import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Dossier badge — small status pill in mono uppercase. Variants align
 * with the dossier vocabulary: hairline rim by default, faint brand or
 * destructive tint, and an outline-only variant for low-emphasis tags.
 */
const badgeVariants = cva(
  [
    'inline-flex items-center gap-1 px-2 py-0.5',
    'font-mono text-[9px] tracking-[0.3em] uppercase',
    'border transition-colors',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'border-border/60 bg-foreground/[0.04] text-foreground/80',
        brand:
          'border-primary/50 bg-primary/[0.08] text-primary',
        destructive:
          'border-destructive/50 bg-destructive/[0.08] text-destructive',
        outline:
          'border-border/60 text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
