// src/webview/theme/tokens/breakpoints.ts

/**
 * Breakpoint tokens for responsive design
 */
export const breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

/**
 * Creates a media query string for the given breakpoint
 * @param breakpoint - Breakpoint key from the breakpoints object
 * @returns Media query string
 */
export function createMediaQuery(breakpoint: keyof typeof breakpoints) {
  return `@media (min-width: ${breakpoints[breakpoint]})`;
}
