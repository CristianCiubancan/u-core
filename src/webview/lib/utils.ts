import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * shadcn's standard className helper. Accepts the same inputs as clsx
 * (strings, arrays, conditional objects, mixed) and resolves Tailwind
 * conflicts with tailwind-merge — the LATER class wins, which lets
 * variant components emit a base set of classes that callers can
 * cleanly override on a single prop.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
