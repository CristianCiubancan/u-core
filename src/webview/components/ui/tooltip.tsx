import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';

/**
 * shadcn Tooltip — small mono-uppercase caption with hairline rim,
 * portal'd by Radix so it overlays everything. Wrap your app once in
 * <TooltipProvider/> (already exported here) so tooltips share a
 * delay-timer.
 */
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 px-2 py-1 border border-border/60 bg-popover/92 backdrop-blur-sm text-popover-foreground',
      'font-mono text-[9px] tracking-[0.25em] uppercase',
      'data-[state=delayed-open]:animate-[fadeIn_120ms_ease-out_both]',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
