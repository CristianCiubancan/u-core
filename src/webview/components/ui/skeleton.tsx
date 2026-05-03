import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Dossier skeleton — subtle pulsing placeholder that doesn't read as a
 * solid block. Uses bg-foreground at very low opacity instead of the
 * usual gray-300/40 so it matches translucent paper cards.
 */
const Skeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'animate-pulse bg-foreground/[0.06]',
      className
    )}
    {...props}
  />
));
Skeleton.displayName = 'Skeleton';

export { Skeleton };
