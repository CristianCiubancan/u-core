import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * shadcn Select — Radix Select primitives with dossier styling.
 * Trigger reads as the same hairline-underline as Input. Content
 * portal'd to body (auto flip + scroll lock from Radix). Items pick
 * up brand tint on highlight.
 *
 * Width pinning: Radix's `--radix-select-trigger-width` CSS variable
 * was empirically not winning at runtime even when applied via
 * inline style on the Content. We measure the trigger ourselves with
 * a ResizeObserver and share the pixel value through a tiny context;
 * the Content reads that value and clamps its width directly. This
 * is bulletproof against Radix internals.
 */

const SelectWidthContext = React.createContext<number | undefined>(undefined);

const Select = ({
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) => {
  const [width, setWidth] = React.useState<number | undefined>();
  // Clone the value object so each Select instance gets its own
  // reference and dependent context consumers re-render correctly.
  const value = React.useMemo(() => width, [width]);
  return (
    <SelectWidthContext.Provider value={value}>
      <SelectMeasureContext.Provider value={setWidth}>
        <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>
      </SelectMeasureContext.Provider>
    </SelectWidthContext.Provider>
  );
};

const SelectMeasureContext = React.createContext<
  React.Dispatch<React.SetStateAction<number | undefined>>
>(() => {});

const SelectGroup = SelectPrimitive.Group;
const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const setWidth = React.useContext(SelectMeasureContext);
  const localRef = React.useRef<HTMLButtonElement>(null);

  // Forward both refs.
  React.useImperativeHandle(
    ref,
    () => localRef.current as HTMLButtonElement,
    []
  );

  React.useLayoutEffect(() => {
    const el = localRef.current;
    if (!el) return;
    // Synchronous initial read — ResizeObserver's first callback fires
    // asynchronously, so without this the dropdown can render once with
    // the wrong width on first open. We use the border-box width
    // (getBoundingClientRect.width) so Content matches the trigger's
    // VISIBLE width, including its padding — not just its content box,
    // which is what `entry.contentRect.width` reports.
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const borderBox = entry.borderBoxSize?.[0]?.inlineSize;
      const w = borderBox ?? entry.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [setWidth]);

  return (
  <SelectPrimitive.Trigger
    ref={localRef}
    className={cn(
      'group flex w-full items-center justify-between',
      'bg-transparent border-0 border-b border-input/70 px-1 py-1.5 pr-6',
      'font-serif text-[14px] text-foreground placeholder:text-muted-foreground/70',
      'hover:border-input transition-colors duration-150',
      'focus:outline-none focus:border-ring',
      'data-[state=open]:border-ring',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'aria-[invalid=true]:border-destructive/60',
      'aria-[invalid=true]:data-[state=open]:border-destructive',
      'data-[placeholder]:text-muted-foreground/70',
      '[&>span]:truncate text-left',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown
        className={cn(
          'h-3.5 w-3.5 opacity-50 shrink-0 transition-transform duration-150',
          'group-data-[state=open]:rotate-180 group-data-[state=open]:opacity-80'
        )}
      />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
  );
});
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1 text-muted-foreground',
      className
    )}
    {...props}
  >
    <ChevronUp className="h-3.5 w-3.5" />
  </SelectPrimitive.ScrollUpButton>
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      'flex cursor-default items-center justify-center py-1 text-muted-foreground',
      className
    )}
    {...props}
  >
    <ChevronDown className="h-3.5 w-3.5" />
  </SelectPrimitive.ScrollDownButton>
));
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', style, ...props }, ref) => {
  // Pixel width measured by the matching SelectTrigger via the
  // surrounding Select wrapper. This is the bulletproof replacement
  // for Radix's `--radix-select-trigger-width` CSS variable, which
  // empirically wasn't being honored at runtime regardless of how we
  // applied it (Tailwind class, inline style with var()).
  const triggerWidth = React.useContext(SelectWidthContext);

  return (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      style={
        position === 'popper'
          ? {
              // Force border-box so the inline width includes the 1px
              // hairline border on each side instead of adding to it.
              // Without this, content-box rendering would put the
              // dropdown's visible edge ~2px past the trigger.
              boxSizing: 'border-box',
              // Belt-and-braces: prefer our measured pixel value, but
              // fall back to Radix's own CSS variable (which it sets via
              // a parent style) so the dropdown is never wider than the
              // trigger even on the very first frame before the
              // ResizeObserver settles.
              width: triggerWidth
                ? `${triggerWidth}px`
                : 'var(--radix-select-trigger-width)',
              maxWidth: triggerWidth
                ? `${triggerWidth}px`
                : 'var(--radix-select-trigger-width)',
              ...style,
            }
          : style
      }
      className={cn(
        'relative z-50 max-h-60 overflow-hidden',
        // backdrop-blur-md (12px) was the dominant cost on first paint —
        // each open re-rasterizes the live 3D scene under the dropdown
        // through a 12px gaussian blur. backdrop-blur-sm (4px) plus a
        // higher bg opacity gets near-identical separation for a
        // fraction of the GPU work, which matters most for the
        // 200-item nationality list.
        'bg-popover/92 backdrop-blur-sm border border-border/60 text-popover-foreground',
        // No drop shadow — the previous shadow-[0_8px_32px_rgba(0,0,0,.45)]
        // painted a 32px-blur dark halo around the dropdown that read as
        // "background extends past the trigger" against a dark scene. The
        // hairline border + backdrop-blur carry enough separation; the
        // dossier vocabulary specifically avoids drop shadows.
        'outline-none',
        'data-[state=open]:animate-[fadeIn_140ms_ease-out_both]',
        position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1',
        className
      )}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          // Drop shadcn's default `min-w-[var(--radix-select-trigger-width)]`
          // here. Combined with item paddings (pl-2 pr-7), it pushed the
          // viewport's intrinsic width past the trigger and made the
          // dropdown overhang the right side of the form column. The
          // Content above already pins width to the trigger; let
          // overflow-hidden on Content clip any item that needs more
          // room.
          position === 'popper' &&
            'h-[var(--radix-select-trigger-height)] w-full'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
  );
});
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn(
      'px-2 py-1.5 font-mono text-[9px] tracking-[0.3em] uppercase text-muted-foreground',
      className
    )}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center',
      'py-1.5 pl-2 pr-7 font-serif text-[13px] text-foreground/90 outline-none',
      'transition-colors duration-100',
      'data-[highlighted]:bg-primary/15 data-[highlighted]:text-foreground',
      'data-[state=checked]:text-primary data-[state=checked]:font-medium',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3 w-3" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ComponentRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border/60', className)}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
