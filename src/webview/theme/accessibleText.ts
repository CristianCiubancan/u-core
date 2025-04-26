/**
 * Accessible text utilities for Tailwind CSS
 * Ensures text has proper contrast and readability across contexts
 */
const { getContrastRatio, hexToRgb } = require('./colorUtils');
const { semanticColors, resolveColorReference } = require('../colors');

/**
 * Generate accessible text utilities for various contexts
 * @param {Object} grayPalette - Gray color palette
 * @param {Object} brandPalette - Brand color palette
 * @returns {Object} Accessible text utilities for Tailwind
 */
function generateAccessibleTextUtilities(
  grayPalette: Record<number, string>,
  brandPalette: Record<number, string>
) {
  if (!grayPalette || !brandPalette) {
    console.warn('Missing palette data for accessible text utilities');
    return {}; // Return empty object to prevent errors
  }

  // Ensure we have color values with fallbacks
  const gray = {
    50: grayPalette[50] || '#f8fafc',
    900: grayPalette[900] || '#0f172a',
  };

  const brand = {
    600: brandPalette[600] || '#4f46e5',
  };

  // Determine contrast-optimized text colors for each background context
  const isDarkBrand = getContrastRatio(brand[600], gray[50]) >= 4.5;

  // Get resolved colors from semantic tokens
  const textPrimary = resolveColorReference(semanticColors.ui.text.primary);
  const textInverted = resolveColorReference(semanticColors.ui.text.inverted);

  // Define background contexts and their accessible text colors using semantic tokens
  return {
    // For light backgrounds (use dark text)
    '.text-accessible-light': {
      color: textPrimary,
      'font-weight': '450', // Slightly heavier than normal for better readability on light backgrounds
    },

    // For dark backgrounds (use light text)
    '.text-accessible-dark': {
      color: textInverted,
      'font-weight': '400', // Normal weight for readability on dark backgrounds
      'letter-spacing': '0.01em', // Slightly increased letter spacing for better readability on dark
    },

    // For brand color backgrounds (dynamically choose based on brand color's brightness)
    '.text-accessible-on-brand': {
      color: isDarkBrand ? textInverted : textPrimary,
      'font-weight': isDarkBrand ? '400' : '450', // Adaptive font weight
      'letter-spacing': isDarkBrand ? '0.01em' : 'normal', // Adaptive letter spacing
    },

    // For glass elements (general, assumes darkish background)
    '.text-accessible-on-glass': {
      'color': textInverted,
      'text-shadow': `0 1px 3px rgba(${hexToRgb(gray[900])}, 0.6)`, // Stronger text shadow for better readability
      'letter-spacing': '0.01em', // Slightly increased letter spacing
    },

    // For dark backgrounds (e.g., .glass-dark, .glass-brand-dark)
    '.text-on-dark': {
      color: textInverted,
      'font-weight': '400', // Normal weight
      'letter-spacing': '0.01em', // Slightly increased letter spacing
    },

    // For light backgrounds (e.g., .glass, .glass-brand)
    '.text-on-light': {
      color: textPrimary,
      'font-weight': '450', // Slightly heavier than normal
    },

    // For primary UI elements
    '.text-primary': {
      color: textPrimary,
      'font-weight': '500', // Medium weight for emphasis
    },

    // For secondary/supporting text
    '.text-secondary': {
      color: resolveColorReference(semanticColors.ui.text.secondary),
      'font-weight': '400', // Normal weight
    },

    // For tertiary/muted text
    '.text-tertiary': {
      color: resolveColorReference(semanticColors.ui.text.tertiary),
      'font-weight': '400', // Normal weight
    },

    // For links
    '.text-link': {
      color: resolveColorReference(semanticColors.ui.text.link),
      'font-weight': '500', // Medium weight for emphasis
      'text-decoration': 'none',
      '&:hover': {
        'text-decoration': 'underline',
      },
    },

    // For error text
    '.text-error': {
      color: resolveColorReference(semanticColors.ui.text.error),
      'font-weight': '500', // Medium weight for emphasis
    },
  };
}

module.exports = {
  generateAccessibleTextUtilities,
};
