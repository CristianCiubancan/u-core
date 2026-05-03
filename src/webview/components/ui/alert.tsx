import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * Dossier alert — hairline-rimmed inline message. Variants: default
 * (neutral), brand (informational), destructive (errors). Pair with an
 * AlertTitle (mono uppercase) and AlertDescription (serif body).
 */
const alertVariants = cva(
  [
    'relative w-full px-4 py-3 border',
    'grid grid-cols-[auto_1fr] gap-x-3 items-start',
    '[&>svg]:h-4 [&>svg]:w-4 [&>svg]:mt-0.5 [&>svg]:shrink-0',
    '[&>svg~*]:col-start-2',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'border-border/60 bg-foreground/[0.03] text-foreground [&>svg]:text-muted-foreground',
        brand:
          'border-primary/50 bg-primary/[0.06] text-foreground [&>svg]:text-primary',
        destructive:
          'border-destructive/50 bg-destructive/[0.06] text-foreground [&>svg]:text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      'font-mono text-[10px] tracking-[0.3em] uppercase leading-none mb-1',
      className
    )}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'font-serif text-[13px] leading-relaxed text-foreground/80 [&_p]:leading-relaxed',
      className
    )}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
