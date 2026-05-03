import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';

/**
 * shadcn Collapsible — pure Radix passthrough; the dossier-flavored
 * styling lives at the Accordion level since most "collapse this
 * section" use cases want the consistent trigger/content pair from
 * <Accordion />. Reach for <Collapsible /> when you need a one-off
 * disclosure with custom trigger styling.
 */
const Collapsible = CollapsiblePrimitive.Root;
const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;
const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
