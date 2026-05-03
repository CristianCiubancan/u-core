import * as React from 'react';
import { Toaster as SonnerPrimitive, type ToasterProps } from 'sonner';

/**
 * sonner — single Toaster instance for the app. Mount once at the
 * root; call `toast(...)` from `sonner` anywhere to push notifications.
 * Styled via classNames + Tailwind to match the dossier vocabulary.
 */
const Toaster = ({ ...props }: ToasterProps) => (
  <SonnerPrimitive
    theme="dark"
    className="toaster group"
    toastOptions={{
      classNames: {
        toast:
          'group toast bg-popover/92 backdrop-blur-sm border border-border/60 text-popover-foreground p-3',
        title:
          'font-mono text-[10px] tracking-[0.3em] uppercase text-foreground',
        description:
          'font-serif text-[13px] leading-relaxed text-foreground/80',
        actionButton:
          'bg-primary text-primary-foreground font-mono text-[9px] tracking-[0.25em] uppercase px-2 py-1',
        cancelButton:
          'bg-foreground/[0.06] text-foreground/80 font-mono text-[9px] tracking-[0.25em] uppercase px-2 py-1',
        error: 'border-destructive/50',
        success: 'border-primary/50',
      },
    }}
    {...props}
  />
);

export { Toaster };
export { toast } from 'sonner';
