import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * shadcn Button with the dossier aesthetic baked into the cva variants.
 * Default look is the hairline-underline action affordance ("dossier
 * action" — text + icon + bottom rule, mono uppercase). `destructive`
 * tints the underline red. `outline` / `secondary` / `ghost` / `link`
 * are kept for less-common cases.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-mono text-[9.5px] tracking-[0.25em] uppercase transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-3.5',
  {
    variants: {
      variant: {
        default:
          'border-b border-primary/50 text-primary hover:text-primary hover:border-primary',
        destructive:
          'border-b border-destructive/40 text-destructive hover:border-destructive',
        outline:
          'border border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground rounded-sm',
        secondary:
          'border-b border-input text-foreground/80 hover:text-foreground hover:border-foreground',
        ghost:
          'text-foreground hover:bg-accent hover:text-accent-foreground rounded-sm',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'px-3 py-1.5',
        sm: 'px-2 py-1',
        lg: 'px-5 py-2.5 text-[11px]',
        icon: 'p-1.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
