import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/lib/utils';

/**
 * shadcn Popover — Radix Popover with the dossier paper styling
 * applied to the content. Out of the box this gives us:
 *   - Portal to document.body (escapes parent stacking contexts)
 *   - Auto flip / shift on viewport collision
 *   - Click-outside dismiss + Esc to close
 *   - Returns focus to trigger on close
 *
 * Replaces the manual placeAbove logic we had in the home-grown
 * DatePicker / FormSelect.
 */
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'start', sideOffset = 6, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 outline-none',
        'bg-popover/85 backdrop-blur-md border border-border/60 text-popover-foreground',
        // Drop shadow removed — it painted a halo wider than the popup
        // that read as the dropdown "extending past" the trigger. The
        // hairline border carries enough separation against the
        // backdrop-blurred scene.
        'p-3',
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
