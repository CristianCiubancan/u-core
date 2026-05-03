import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';

import { cn } from '@/lib/utils';

/**
 * shadcn Label using Radix's accessible label primitive. Styled to
 * match the dossier vocabulary — small mono uppercase tracking,
 * muted-foreground tone — so any field's label is consistent across
 * Input/Select/DatePicker without per-component overrides.
 */
const Label = React.forwardRef<
  React.ComponentRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(
      'block font-mono text-[9px] tracking-[0.35em] text-muted-foreground uppercase',
      'peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
      className
    )}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
