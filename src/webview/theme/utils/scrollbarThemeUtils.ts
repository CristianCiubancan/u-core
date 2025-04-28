import { createScrollbarStyles, ScrollbarStyles } from '../../utils/scrollbarUtils';
import { hexToRgb } from '../../utils/colorUtils';
import { grayPalettes, colorPalettes } from '../colors';

/**
 * Generates themed scrollbar styles for different contexts
 * This allows for consistent scrollbar styling across the application
 */
function generateThemedScrollbarStyles(
  grayPalette: (typeof grayPalettes)[keyof typeof grayPalettes],
  brandPalette: (typeof colorPalettes)[keyof typeof colorPalettes]
): { [key: string]: ScrollbarStyles } {
  return {
    '.scrollbar-light': createScrollbarStyles(
      `rgba(${hexToRgb(grayPalette[100])}, 0.2)`,
      `rgba(${hexToRgb(grayPalette[300])}, 0.3)`,
      `2px solid rgba(${hexToRgb(grayPalette[200])}, 0.2)`,
      `rgba(${hexToRgb(grayPalette[400])}, 0.4)`
    ),
    '.scrollbar-dark': createScrollbarStyles(
      `rgba(${hexToRgb(grayPalette[800])}, 0.4)`,
      `rgba(${hexToRgb(grayPalette[600])}, 0.6)`,
      `2px solid rgba(${hexToRgb(grayPalette[700])}, 0.3)`,
      `rgba(${hexToRgb(grayPalette[500])}, 0.7)`
    ),
    '.scrollbar-brand': createScrollbarStyles(
      `rgba(${hexToRgb(brandPalette[100])}, 0.3)`,
      `rgba(${hexToRgb(brandPalette[400])}, 0.5)`,
      `2px solid rgba(${hexToRgb(brandPalette[300])}, 0.3)`,
      `rgba(${hexToRgb(brandPalette[500])}, 0.6)`
    ),
    '.scrollbar-brand-dark': createScrollbarStyles(
      `rgba(${hexToRgb(brandPalette[700])}, 0.4)`,
      `rgba(${hexToRgb(brandPalette[400])}, 0.7)`,
      `2px solid rgba(${hexToRgb(grayPalette[500])}, 0.5)`,
      `rgba(${hexToRgb(brandPalette[300])}, 0.8)`
    ),
  };
}

export { generateThemedScrollbarStyles };
