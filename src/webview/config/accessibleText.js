/**
 * Accessible text utilities for Tailwind CSS
 * Ensures text has proper contrast and readability across contexts
 */
const { getContrastRatio, hexToRgb } = require('../utils/colorUtils');

/**
 * Generate accessible text utilities for various contexts
 * @param {Object} semanticColors - Semantic color definitions
 * @param {Object} grayPalette - Gray color palette
 * @param {Object} brandPalette - Brand color palette
 * @returns {Object} Accessible text utilities for Tailwind
 */
function generateAccessibleTextUtilities(
  semanticColors,
  grayPalette,
  brandPalette
) {
  // Determine contrast-optimized text colors for each background context
  const isDarkBrand =
    getContrastRatio(brandPalette[600], grayPalette[50]) >= 4.5;

  // Define background contexts and their accessible text colors using semantic tokens
  return {
    // For light backgrounds (use dark text)
    '.text-accessible-light': {
      color: semanticColors.ui.text.primary,
      'font-weight': '450', // Slightly heavier than normal for better readability on light backgrounds
    },

    // For dark backgrounds (use light text)
    '.text-accessible-dark': {
      color: 'white',
      'font-weight': '400', // Normal weight for readability on dark backgrounds
      'letter-spacing': '0.01em', // Slightly increased letter spacing for better readability on dark
    },

    // For brand color backgrounds (dynamically choose based on brand color's brightness)
    '.text-accessible-on-brand': {
      color: isDarkBrand ? 'white' : semanticColors.ui.text.primary,
      'font-weight': isDarkBrand ? '400' : '450', // Adaptive font weight
      'letter-spacing': isDarkBrand ? '0.01em' : 'normal', // Adaptive letter spacing
    },

    // For glass elements (general, assumes darkish background)
    '.text-accessible-on-glass': {
      'color': 'white',
      'text-shadow': `0 1px 3px rgba(${hexToRgb(grayPalette[900])}, 0.6)`, // Stronger text shadow for better readability
      'letter-spacing': '0.01em', // Slightly increased letter spacing
    },

    // For dark backgrounds (e.g., .glass-dark, .glass-brand-dark)
    '.text-on-dark': {
      color: semanticColors.ui.text.inverted,
      'font-weight': '400', // Normal weight
      'letter-spacing': '0.01em', // Slightly increased letter spacing
    },

    // For light backgrounds (e.g., .glass, .glass-brand)
    '.text-on-light': {
      color: semanticColors.ui.text.primary,
      'font-weight': '450', // Slightly heavier than normal
    },

    // For primary UI elements
    '.text-primary': {
      color: semanticColors.ui.text.primary,
      'font-weight': '500', // Medium weight for emphasis
    },

    // For secondary/supporting text
    '.text-secondary': {
      color: semanticColors.ui.text.secondary,
      'font-weight': '400', // Normal weight
    },

    // For tertiary/muted text
    '.text-tertiary': {
      color: semanticColors.ui.text.tertiary,
      'font-weight': '400', // Normal weight
    },

    // For links
    '.text-link': {
      color: semanticColors.ui.text.link,
      'font-weight': '500', // Medium weight for emphasis
      'text-decoration': 'none',
      '&:hover': {
        'text-decoration': 'underline',
      },
    },

    // For error text
    '.text-error': {
      color: semanticColors.ui.text.error,
      'font-weight': '500', // Medium weight for emphasis
    },
  };
}

module.exports = {
  generateAccessibleTextUtilities,
};
