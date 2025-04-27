/**
 * Main theme configuration for Tailwind CSS
 * Centralizes all theme extensions and design tokens
 */

import {
  colorPalettes,
  grayPalettes,
  resolveColorReference,
  semanticColors,
} from '../colors';
import { hexToRgb } from './colorUtils';
import { generateFontSizes } from './typography';

// Define interfaces for theme configuration
interface ThemeConfig {
  fontSize: Record<string, [string, Record<string, string>]>;
  colors: Record<string, any>;
  boxShadow: Record<string, string>;
  borderRadius: Record<string, string>;
  spacing: Record<string, string>;
  lineHeight: Record<string, string>;
  transitionTimingFunction: Record<string, string>;
}

// Configuration settings
const config = {
  brandColor: 'indigo', // Can be changed to 'gray' or any available palette name
  grayColor: 'slate', // Cool-toned gray
  fontSizeMultiplier: 1.15, // Optimized for readability
};

/**
 * Get palette object with proper fallback handling
 * @param {string} colorName - Name of the color to retrieve
 * @returns {Object} Color palette object
 */
function getColorPalette(colorName: string): any {
  // First check in colorPalettes
  if (colorPalettes[colorName]) {
    return colorPalettes[colorName];
  }

  // Then check in grayPalettes
  if (grayPalettes[colorName]) {
    return grayPalettes[colorName];
  }

  // Fallback to a default
  console.warn(
    `Color "${colorName}" not found in any palette, falling back to indigo`
  );
  return colorPalettes.indigo;
}

// Get active palette references with proper error handling
const brandPalette = getColorPalette(config.brandColor);
const grayPalette = getColorPalette(config.grayColor);

// Create the theme configuration with proper typing
const themeConfig: ThemeConfig = {
  // Typography
  fontSize: generateFontSizes(config.fontSizeMultiplier),

  // Colors
  colors: {
    // Core color palettes
    brand: brandPalette,
    customGray: grayPalette,

    // Add all color palettes directly
    ...colorPalettes,
    ...grayPalettes,

    // UI Element Colors
    ui: {
      background: {
        page: resolveColorReference(semanticColors.ui.background.page),
        card: resolveColorReference(semanticColors.ui.background.card),
        modal: resolveColorReference(semanticColors.ui.background.modal),
        input: {
          default: resolveColorReference(
            semanticColors.ui.background.input.default
          ),
          disabled: resolveColorReference(
            semanticColors.ui.background.input.disabled
          ),
        },
        hover: resolveColorReference(semanticColors.ui.background.hover),
        selected: resolveColorReference(semanticColors.ui.background.selected),
        disabled: resolveColorReference(semanticColors.ui.background.disabled),
      },
      border: {
        default: resolveColorReference(semanticColors.ui.border.default),
        focus: resolveColorReference(semanticColors.ui.border.focus),
        hover: resolveColorReference(semanticColors.ui.border.hover),
        error: resolveColorReference(semanticColors.ui.border.error),
      },
      text: {
        primary: resolveColorReference(semanticColors.ui.text.primary),
        secondary: resolveColorReference(semanticColors.ui.text.secondary),
        tertiary: resolveColorReference(semanticColors.ui.text.tertiary),
        inverted: resolveColorReference(semanticColors.ui.text.inverted),
        link: resolveColorReference(semanticColors.ui.text.link),
        error: resolveColorReference(semanticColors.ui.text.error),
        disabled: resolveColorReference(semanticColors.ui.text.disabled),
      },
    },

    // Button Colors
    button: {
      primary: {
        DEFAULT: resolveColorReference(
          semanticColors.button.primary.background.default
        ),
        hover: resolveColorReference(
          semanticColors.button.primary.background.hover
        ),
        active: resolveColorReference(
          semanticColors.button.primary.background.active
        ),
        disabled: resolveColorReference(
          semanticColors.button.primary.background.disabled
        ),
        text: {
          DEFAULT: resolveColorReference(
            semanticColors.button.primary.text.default
          ),
          disabled: resolveColorReference(
            semanticColors.button.primary.text.disabled
          ),
        },
      },
      secondary: {
        DEFAULT: resolveColorReference(
          semanticColors.button.secondary.background.default
        ),
        hover: resolveColorReference(
          semanticColors.button.secondary.background.hover
        ),
        active: resolveColorReference(
          semanticColors.button.secondary.background.active
        ),
        disabled: resolveColorReference(
          semanticColors.button.secondary.background.disabled
        ),
        text: {
          DEFAULT: resolveColorReference(
            semanticColors.button.secondary.text.default
          ),
          disabled: resolveColorReference(
            semanticColors.button.secondary.text.disabled
          ),
        },
      },
      danger: {
        DEFAULT: resolveColorReference(
          semanticColors.button.danger.background.default
        ),
        hover: resolveColorReference(
          semanticColors.button.danger.background.hover
        ),
        active: resolveColorReference(
          semanticColors.button.danger.background.active
        ),
        disabled: resolveColorReference(
          semanticColors.button.danger.background.disabled
        ),
        text: {
          DEFAULT: resolveColorReference(
            semanticColors.button.danger.text.default
          ),
          disabled: resolveColorReference(
            semanticColors.button.danger.text.disabled
          ),
        },
      },
    },

    // Feedback colors
    feedback: {
      success: {
        background: resolveColorReference(
          semanticColors.feedback.success.background
        ),
        border: resolveColorReference(semanticColors.feedback.success.border),
        text: resolveColorReference(semanticColors.feedback.success.text),
        icon: resolveColorReference(semanticColors.feedback.success.icon),
      },
      warning: {
        background: resolveColorReference(
          semanticColors.feedback.warning.background
        ),
        border: resolveColorReference(semanticColors.feedback.warning.border),
        text: resolveColorReference(semanticColors.feedback.warning.text),
        icon: resolveColorReference(semanticColors.feedback.warning.icon),
      },
      error: {
        background: resolveColorReference(
          semanticColors.feedback.error.background
        ),
        border: resolveColorReference(semanticColors.feedback.error.border),
        text: resolveColorReference(semanticColors.feedback.error.text),
        icon: resolveColorReference(semanticColors.feedback.error.icon),
      },
      info: {
        background: resolveColorReference(
          semanticColors.feedback.info.background
        ),
        border: resolveColorReference(semanticColors.feedback.info.border),
        text: resolveColorReference(semanticColors.feedback.info.text),
        icon: resolveColorReference(semanticColors.feedback.info.icon),
      },
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
export { config };
export { brandPalette, grayPalette };
export default themeConfig;
