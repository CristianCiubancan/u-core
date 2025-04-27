/**
 * Scrollbar utility functions for Tailwind CSS configuration
 * Creates consistent scrollbar styles across different contexts
 */

/**
 * Create standardized scrollbar styles
 * @param {string} trackBg - Track background color
 * @param {string} thumbBg - Thumb background color
 * @param {string} thumbBorder - Thumb border style
 * @param {string} thumbHoverBg - Thumb hover background color
 * @returns {Object} Scrollbar style object for Tailwind
 */
function createScrollbarStyles(
  trackBg: string,
  thumbBg: string,
  thumbBorder: string,
  thumbHoverBg: string
): Record<string, string | Record<string, string>> {
  return {
    // Basic scrollbar width and height
    '&::-webkit-scrollbar': {
      width: '12px',
      height: '12px',
    },

    // Scrollbar track styling
    '&::-webkit-scrollbar-track': {
      background: trackBg,
      borderRadius: '8px',
    },

    // Scrollbar thumb styling
    '&::-webkit-scrollbar-thumb': {
      background: thumbBg,
      borderRadius: '8px',
      border: thumbBorder,
    },

    // Scrollbar thumb hover state
    '&::-webkit-scrollbar-thumb:hover': {
      background: thumbHoverBg,
    },

    // Firefox scrollbar compatibility
    'scrollbar-width': 'thin',
    'scrollbar-color': `${thumbBg} ${trackBg}`,
  };
}

/**
 * Generate standard scrollbar variants
 * @param {Object} grayPalette - Gray color palette
 * @param {Object} brandPalette - Brand color palette
 * @param {Function} hexToRgb - Function to convert hex to RGB
 * @returns {Object} Predefined scrollbar variants
 */
type HexToRgbFunction = (hex: string) => string;

interface ScrollbarVariant {
  trackBg: string;
  thumbBg: string;
  thumbBorder: string;
  thumbHoverBg: string;
}

interface ScrollbarVariants {
  light: ScrollbarVariant;
  dark: ScrollbarVariant;
  brand: ScrollbarVariant;
  brandDark: ScrollbarVariant;
}

function getScrollbarVariants(
  grayPalette: Record<number, string>,
  brandPalette: Record<number, string>,
  hexToRgb: HexToRgbFunction
): ScrollbarVariants {
  return {
    // Light theme scrollbar
    light: {
      trackBg: `rgba(${hexToRgb(grayPalette[100])}, 0.2)`,
      thumbBg: `rgba(${hexToRgb(grayPalette[300])}, 0.3)`,
      thumbBorder: `2px solid rgba(${hexToRgb(grayPalette[200])}, 0.2)`,
      thumbHoverBg: `rgba(${hexToRgb(grayPalette[400])}, 0.4)`,
    },

    // Dark theme scrollbar
    dark: {
      trackBg: `rgba(${hexToRgb(grayPalette[800])}, 0.4)`,
      thumbBg: `rgba(${hexToRgb(grayPalette[600])}, 0.6)`,
      thumbBorder: `2px solid rgba(${hexToRgb(grayPalette[700])}, 0.3)`,
      thumbHoverBg: `rgba(${hexToRgb(grayPalette[500])}, 0.7)`,
    },

    // Brand theme scrollbar
    brand: {
      trackBg: `rgba(${hexToRgb(brandPalette[100])}, 0.3)`,
      thumbBg: `rgba(${hexToRgb(brandPalette[400])}, 0.5)`,
      thumbBorder: `2px solid rgba(${hexToRgb(brandPalette[300])}, 0.3)`,
      thumbHoverBg: `rgba(${hexToRgb(brandPalette[500])}, 0.6)`,
    },

    // Dark brand theme scrollbar
    brandDark: {
      trackBg: `rgba(${hexToRgb(brandPalette[700])}, 0.4)`,
      thumbBg: `rgba(${hexToRgb(brandPalette[400])}, 0.7)`,
      thumbBorder: `2px solid rgba(${hexToRgb(brandPalette[500])}, 0.5)`,
      thumbHoverBg: `rgba(${hexToRgb(brandPalette[300])}, 0.8)`,
    },
  };
}

export { createScrollbarStyles, getScrollbarVariants };
