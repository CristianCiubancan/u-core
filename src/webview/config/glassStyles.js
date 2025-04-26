/**
 * Glass effect styles for Tailwind CSS
 * Creates customizable glass morphism effects with scrollbar integration
 */
const { createScrollbarStyles } = require('../utils/scrollbarUtils');
const { hexToRgb } = require('../utils/colorUtils');

/**
 * Create glass effect styles with matching scrollbars
 * @param {string} background - Background style with transparency
 * @param {string} border - Border style
 * @param {string} boxShadow - Box shadow style
 * @param {Object} scrollbarConfig - Scrollbar configuration object
 * @returns {Object} Glass effect style object
 */
function createGlassStyles(background, border, boxShadow, scrollbarConfig) {
  return {
    background,
    border,
    'box-shadow': boxShadow,
    'border-radius': '0.65rem', // Increased for better visual appearance
    ...createScrollbarStyles(
      scrollbarConfig.trackBg,
      scrollbarConfig.thumbBg,
      scrollbarConfig.thumbBorder,
      scrollbarConfig.thumbHoverBg
    ),
  };
}

/**
 * Generate all glass effect variants
 * @param {Object} semanticColors - Semantic color definitions
 * @param {Object} grayPalette - Gray color palette
 * @param {Object} brandPalette - Brand color palette
 * @returns {Object} Glass effect utilities for Tailwind
 */
function generateGlassStyles(semanticColors, grayPalette, brandPalette) {
  // Safety check to ensure we have valid palettes
  if (!brandPalette) {
    console.warn('Brand palette is undefined, falling back to gray palette');
    brandPalette = grayPalette;
  }

  // Ensure we have all needed color values with fallbacks
  const ensureColor = (palette, shade, fallbackShade) => {
    return palette[shade] || palette[fallbackShade] || '#000000';
  };

  // Get safe color references for each palette
  const brand = {
    100: ensureColor(brandPalette, 100, 200),
    200: ensureColor(brandPalette, 200, 300),
    300: ensureColor(brandPalette, 300, 400),
    400: ensureColor(brandPalette, 400, 500),
    500: ensureColor(brandPalette, 500, 600),
    600: ensureColor(brandPalette, 600, 500),
    700: ensureColor(brandPalette, 700, 600),
    800: ensureColor(brandPalette, 800, 700),
    900: ensureColor(brandPalette, 900, 800),
  };

  const gray = {
    100: ensureColor(grayPalette, 100, 200),
    200: ensureColor(grayPalette, 200, 300),
    300: ensureColor(grayPalette, 300, 400),
    400: ensureColor(grayPalette, 400, 500),
    500: ensureColor(grayPalette, 500, 600),
    600: ensureColor(grayPalette, 600, 500),
    700: ensureColor(grayPalette, 700, 600),
    800: ensureColor(grayPalette, 800, 700),
    900: ensureColor(grayPalette, 900, 800),
  };

  return {
    // Light glass effect
    '.glass': {
      ...createGlassStyles(
        semanticColors.glass.light.background,
        `1px solid ${semanticColors.glass.light.border}`,
        `0 4px 30px rgba(${hexToRgb(gray[900])}, 0.15)`,
        {
          trackBg: `rgba(${hexToRgb(gray[100])}, 0.2)`,
          thumbBg: `rgba(${hexToRgb(gray[300])}, 0.3)`,
          thumbBorder: `2px solid rgba(${hexToRgb(gray[200])}, 0.2)`,
          thumbHoverBg: `rgba(${hexToRgb(gray[400])}, 0.4)`,
        }
      ),
      color: semanticColors.glass.light.text,
    },

    // Dark glass effect
    '.glass-dark': {
      ...createGlassStyles(
        semanticColors.glass.dark.background,
        `1px solid ${semanticColors.glass.dark.border}`,
        `0 6px 32px rgba(${hexToRgb(gray[900])}, 0.25)`,
        {
          trackBg: `rgba(${hexToRgb(gray[800])}, 0.4)`,
          thumbBg: `rgba(${hexToRgb(gray[600])}, 0.6)`,
          thumbBorder: `2px solid rgba(${hexToRgb(gray[700])}, 0.3)`,
          thumbHoverBg: `rgba(${hexToRgb(gray[500])}, 0.7)`,
        }
      ),
      color: semanticColors.glass.dark.text,
    },

    // Brand glass effect
    '.glass-brand': {
      ...createGlassStyles(
        semanticColors.glass.brand.light.background,
        `1px solid ${semanticColors.glass.brand.light.border}`,
        `0 6px 30px rgba(${hexToRgb(brand[500])}, 0.15)`,
        {
          trackBg: `rgba(${hexToRgb(brand[100])}, 0.3)`,
          thumbBg: `rgba(${hexToRgb(brand[400])}, 0.5)`,
          thumbBorder: `2px solid rgba(${hexToRgb(brand[300])}, 0.3)`,
          thumbHoverBg: `rgba(${hexToRgb(brand[500])}, 0.6)`,
        }
      ),
      color: semanticColors.glass.brand.light.text,
    },

    // Dark brand glass effect
    '.glass-brand-dark': {
      ...createGlassStyles(
        semanticColors.glass.brand.dark.background,
        `1px solid ${semanticColors.glass.brand.dark.border}`,
        `0 8px 36px rgba(${hexToRgb(brand[900])}, 0.3)`,
        {
          trackBg: `rgba(${hexToRgb(brand[700])}, 0.4)`,
          thumbBg: `rgba(${hexToRgb(brand[400])}, 0.7)`,
          thumbBorder: `2px solid rgba(${hexToRgb(brand[500])}, 0.5)`,
          thumbHoverBg: `rgba(${hexToRgb(brand[300])}, 0.8)`,
        }
      ),
      color: semanticColors.glass.brand.dark.text,
    },
  };
}

module.exports = {
  createGlassStyles,
  generateGlassStyles,
};
