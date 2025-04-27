// src/theme/plugins/accessibleText.ts

import { getContrastRatio, hexToRgb } from '../utils/colorUtils';
import { typography, defaultColors } from '../tokens/constants';

/**
 * Plugin parameter types
 */
interface AccessibleTextPluginParams {
  addComponents: (components: Record<string, any>, variants?: string[]) => void;
  theme: (path: string) => any;
}

/**
 * Creates accessible text utilities for various backgrounds
 */
export function accessibleTextPlugin({
  addComponents,
  theme,
}: AccessibleTextPluginParams) {
  const colors = theme('colors');

  // Get color references
  const gray = colors.gray || {};
  const primary = colors.primary || {};

  // Base text colors
  const darkText = gray[900] || defaultColors.darkText;
  const lightText = gray[50] || defaultColors.lightText;

  // Calculate contrast information for primary brand color
  const primaryIsDark =
    getContrastRatio(
      primary[600] || defaultColors.primaryDefault[600],
      lightText
    ) < 4.5;

  // Create accessible text utilities
  const accessibleTextComponents = {
    // For light backgrounds - use dark text
    '.text-on-light': {
      'color': darkText,
      'font-weight': typography.fontWeight.medium,
    },

    // For dark backgrounds - use light text
    '.text-on-dark': {
      'color': lightText,
      'font-weight': typography.fontWeight.normal,
      'letter-spacing': typography.letterSpacing.wide,
    },

    // For the brand color as background - dynamically choose text color
    '.text-on-brand': {
      'color': primaryIsDark ? darkText : lightText,
      'font-weight': primaryIsDark
        ? typography.fontWeight.medium
        : typography.fontWeight.normal,
      'letter-spacing': primaryIsDark
        ? typography.letterSpacing.normal
        : typography.letterSpacing.wide,
    },

    // For glass elements with dark backdrop
    '.text-on-glass-dark': {
      'color': lightText,
      'text-shadow': `0 1px 2px rgba(${hexToRgb(
        gray[900] || defaultColors.grayDark[900]
      )}, 0.3)`,
      'letter-spacing': typography.letterSpacing.wide,
    },

    // For glass elements with light backdrop
    '.text-on-glass-light': {
      'color': darkText,
      'font-weight': typography.fontWeight.medium,
    },

    // Semantic text styles that are already WCAG AA compliant
    '.text-primary': {
      'color': theme('colors.text.primary'),
      'font-weight': typography.fontWeight.semibold,
    },

    '.text-secondary': {
      'color': theme('colors.text.secondary'),
      'font-weight': typography.fontWeight.normal,
    },

    '.text-tertiary': {
      'color': theme('colors.text.tertiary'),
      'font-weight': typography.fontWeight.normal,
    },

    '.text-inverted': {
      'color': theme('colors.text.inverted'),
      'font-weight': typography.fontWeight.normal,
    },

    '.text-link': {
      'color': theme('colors.text.link'),
      'font-weight': typography.fontWeight.semibold,
      'text-decoration': 'none',
      '&:hover': {
        'text-decoration': 'underline',
      },
    },

    '.text-success': {
      'color': theme('colors.text.success'),
      'font-weight': typography.fontWeight.semibold,
    },

    '.text-error': {
      'color': theme('colors.text.error'),
      'font-weight': typography.fontWeight.semibold,
    },

    '.text-warning': {
      'color': theme('colors.text.warning'),
      'font-weight': typography.fontWeight.semibold,
    },

    '.text-info': {
      'color': theme('colors.text.info'),
      'font-weight': typography.fontWeight.semibold,
    },

    // Additional contrast-ensuring utilities
    '.high-contrast': {
      'font-weight': typography.fontWeight.semibold,
      'letter-spacing': typography.letterSpacing.wide,
    },

    '.text-shadow-light': {
      'text-shadow': `0 1px 2px rgba(${hexToRgb(
        gray[900] || defaultColors.grayDark[900]
      )}, 0.2)`,
    },

    '.text-shadow-dark': {
      'text-shadow': `0 1px 3px rgba(${hexToRgb(
        gray[900] || defaultColors.grayDark[900]
      )}, 0.4)`,
    },
  };

  addComponents(accessibleTextComponents, ['responsive', 'hover']);
}
