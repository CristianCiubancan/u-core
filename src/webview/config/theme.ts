/**
 * Main theme configuration for Tailwind CSS
 * Centralizes all theme extensions and design tokens
 */
const { grayPalettes, colorPalettes, semanticColors } = require('../colors');
const { hexToRgb } = require('../utils/colorUtils');
const typography = require('./typography');

// Configuration settings
const config = {
  brandColor: 'gray', // Changed from 'indigo' to 'gray'
  grayColor: 'slate', // Cool-toned gray for better contrast
  fontSizeMultiplier: 1.15, // Optimized for readability
};

// Get active palette references with fallback handling
// If brandColor is a gray variant, get it from grayPalettes instead of colorPalettes
const brandPalette = Object.keys(grayPalettes).includes(config.brandColor)
  ? grayPalettes[config.brandColor]
  : colorPalettes[config.brandColor] || colorPalettes['indigo']; // Fallback to indigo if not found

const grayPalette = grayPalettes[config.grayColor];

module.exports = {
  // Typography
  fontSize: typography.generateFontSizes(config.fontSizeMultiplier),

  // Colors
  colors: {
    // Core color palettes
    brand: brandPalette,
    gray: grayPalette,

    // Semantic UI colors
    ui: {
      background: {
        page: semanticColors.ui.background.page,
        card: semanticColors.ui.background.card,
        modal: semanticColors.ui.background.modal,
        input: {
          default: semanticColors.ui.background.input.default,
          disabled: semanticColors.ui.background.input.disabled,
        },
        hover: semanticColors.ui.background.hover,
        selected: semanticColors.ui.background.selected,
        disabled: semanticColors.ui.background.disabled,
      },
      border: {
        default: semanticColors.ui.border.default,
        focus: semanticColors.ui.border.focus,
        hover: semanticColors.ui.border.hover,
        error: semanticColors.ui.border.error,
      },
    },

    // Feedback colors
    feedback: {
      success: semanticColors.feedback.success,
      warning: semanticColors.feedback.warning,
      error: semanticColors.feedback.error,
      info: semanticColors.feedback.info,
    },
  },

  // Box shadows
  boxShadow: {
    'glass': `0 4px 30px rgba(${hexToRgb(grayPalette[900])}, 0.1)`,
    'glass-lg': `0 8px 32px rgba(${hexToRgb(grayPalette[900])}, 0.15)`,
    'subtle': `0 1px 3px rgba(${hexToRgb(grayPalette[900])}, 0.08)`,
    'elevation-1': `0 1px 2px rgba(${hexToRgb(
      grayPalette[900]
    )}, 0.05), 0 1px 4px rgba(${hexToRgb(grayPalette[900])}, 0.1)`,
    'elevation-2': `0 2px 4px rgba(${hexToRgb(
      grayPalette[900]
    )}, 0.05), 0 3px 6px rgba(${hexToRgb(grayPalette[900])}, 0.1)`,
    'elevation-3': `0 4px 8px rgba(${hexToRgb(
      grayPalette[900]
    )}, 0.05), 0 8px 16px rgba(${hexToRgb(grayPalette[900])}, 0.1)`,
  },

  // Text colors
  textColor: {
    'primary': semanticColors.ui.text.primary,
    'secondary': semanticColors.ui.text.secondary,
    'tertiary': semanticColors.ui.text.tertiary,
    'inverted': semanticColors.ui.text.inverted,
    'link': semanticColors.ui.text.link,
    'error': semanticColors.ui.text.error,
    'disabled': semanticColors.ui.text.disabled,
  },

  // Border radius
  borderRadius: {
    'xs': '0.125rem',
    'sm': '0.25rem',
    'DEFAULT': '0.375rem',
    'md': '0.5rem',
    'lg': '0.75rem',
    'xl': '1rem',
    '2xl': '1.5rem',
  },

  // Spacing
  spacing: {
    '4.5': '1.125rem',
    '13': '3.25rem',
    '18': '4.5rem',
  },

  // Line height
  lineHeight: {
    'tighter': '1.15',
    'relaxed': '1.75',
  },

  // Transition timing
  transitionTimingFunction: {
    'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
};

// Export configuration for use in other modules
module.exports.config = config;
module.exports.brandPalette = brandPalette;
module.exports.grayPalette = grayPalette;
