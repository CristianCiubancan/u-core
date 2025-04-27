// src/theme/plugins/accessibleText.ts
// Refactored to use theme tokens and reduce hardcoded values

import { getContrastRatio, hexToRgb } from '../utils/colorUtils';
import { typography, defaultColors, shadowOpacity } from '../tokens/constants';

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
  const error = colors.error || {};
  const success = colors.success || {};
  const warning = colors.warning || {};
  const info = colors.info || {};

  // Get semantic tokens if available
  const textPrimary = theme('colors.text.primary');
  const textInverted = theme('colors.text.inverted');
  /* Removed unused variable */
  const fontWeightMedium =
    theme('fontWeight.medium') || typography.fontWeight.medium;
  const fontWeightNormal =
    theme('fontWeight.normal') || typography.fontWeight.normal;
  const letterSpacingWide =
    theme('letterSpacing.wide') || typography.letterSpacing.wide;
  const letterSpacingNormal =
    theme('letterSpacing.normal') || typography.letterSpacing.normal;

  // Base text colors using semantic tokens when available
  const darkText = textPrimary || gray[900] || defaultColors.darkText;
  const lightText = textInverted || gray[50] || defaultColors.lightText;

  // Calculate contrast information for primary brand color
  const primaryIsDark =
    getContrastRatio(
      primary[600] || defaultColors.primaryDefault[600],
      lightText
    ) < 4.5;

  // Create accessible text utilities with semantic tokens
  const accessibleTextComponents = {
    // For light backgrounds - use dark text
    '.text-on-light': {
      'color': darkText,
      'font-weight': fontWeightMedium,
    },

    // For dark backgrounds - use light text
    '.text-on-dark': {
      'color': lightText,
      'font-weight': fontWeightNormal,
      'letter-spacing': letterSpacingWide,
    },

    // For the brand color as background - dynamically choose text color
    '.text-on-brand': {
      'color': primaryIsDark ? darkText : lightText,
      'font-weight': primaryIsDark ? fontWeightMedium : fontWeightNormal,
      'letter-spacing': primaryIsDark ? letterSpacingNormal : letterSpacingWide,
    },

    // For glass elements with dark backdrop
    '.text-on-glass-dark': {
      'color': lightText,
      'text-shadow': `0 1px 2px rgba(${hexToRgb(
        theme('colors.gray.900') || gray[900] || defaultColors.grayDark[900]
      )}, ${shadowOpacity.light})`,
      'letter-spacing': letterSpacingWide,
    },

    // For glass elements with light backdrop
    '.text-on-glass-light': {
      'color': darkText,
      'font-weight': fontWeightMedium,
    },

    // Semantic text styles that are already WCAG AA compliant
    '.text-primary': {
      'color': theme('colors.text.primary'),
      'font-weight':
        theme('fontWeight.semibold') || typography.fontWeight.semibold,
    },

    '.text-secondary': {
      'color': theme('colors.text.secondary'),
      'font-weight': theme('fontWeight.normal') || typography.fontWeight.normal,
    },

    '.text-tertiary': {
      'color': theme('colors.text.tertiary'),
      'font-weight': theme('fontWeight.normal') || typography.fontWeight.normal,
    },

    '.text-inverted': {
      'color': theme('colors.text.inverted'),
      'font-weight': theme('fontWeight.normal') || typography.fontWeight.normal,
    },

    '.text-link': {
      'color': theme('colors.text.link'),
      'font-weight':
        theme('fontWeight.semibold') || typography.fontWeight.semibold,
      'text-decoration': 'none',
      '&:hover': {
        'text-decoration': 'underline',
      },
    },

    '.text-success': {
      'color': theme('colors.text.success'),
      'font-weight':
        theme('fontWeight.semibold') || typography.fontWeight.semibold,
    },

    '.text-error': {
      'color': theme('colors.text.error'),
      'font-weight':
        theme('fontWeight.semibold') || typography.fontWeight.semibold,
    },

    '.text-warning': {
      'color': theme('colors.text.warning'),
      'font-weight':
        theme('fontWeight.semibold') || typography.fontWeight.semibold,
    },

    '.text-info': {
      'color': theme('colors.text.info'),
      'font-weight':
        theme('fontWeight.semibold') || typography.fontWeight.semibold,
    },

    // Additional contrast-ensuring utilities
    '.high-contrast': {
      'font-weight':
        theme('fontWeight.semibold') || typography.fontWeight.semibold,
      'letter-spacing':
        theme('letterSpacing.wide') || typography.letterSpacing.wide,
    },

    '.text-shadow-light': {
      'text-shadow': `0 1px 2px rgba(${hexToRgb(
        theme('colors.gray.900') || gray[900] || defaultColors.grayDark[900]
      )}, ${shadowOpacity.subtle})`,
    },

    '.text-shadow-dark': {
      'text-shadow': `0 1px 3px rgba(${hexToRgb(
        theme('colors.gray.900') || gray[900] || defaultColors.grayDark[900]
      )}, ${shadowOpacity.medium})`,
    },

    // NEW: Text on primary surface using theme tokens
    '.text-on-primary-surface': {
      'color': theme('colors.primary.800') || primary[800],
      'font-weight': theme('fontWeight.medium') || typography.fontWeight.medium,
    },

    // NEW: Text on success surface using theme tokens
    '.text-on-success-surface': {
      'color': theme('colors.success.800') || success[800],
      'font-weight': theme('fontWeight.medium') || typography.fontWeight.medium,
    },

    // NEW: Text on error surface using theme tokens
    '.text-on-error-surface': {
      'color': theme('colors.error.800') || error[800],
      'font-weight': theme('fontWeight.medium') || typography.fontWeight.medium,
    },

    // NEW: Text on warning surface using theme tokens
    '.text-on-warning-surface': {
      'color': theme('colors.warning.800') || warning[800],
      'font-weight': theme('fontWeight.medium') || typography.fontWeight.medium,
    },

    // NEW: Text on info surface using theme tokens
    '.text-on-info-surface': {
      'color': theme('colors.info.800') || info[800],
      'font-weight': theme('fontWeight.medium') || typography.fontWeight.medium,
    },

    // NEW: Text with auto-contrast (computed at runtime via CSS variables)
    '.text-auto-contrast': {
      'color': 'var(--auto-contrast-text-color, inherit)',
      'font-weight': 'var(--auto-contrast-font-weight, inherit)',
      'letter-spacing': 'var(--auto-contrast-letter-spacing, inherit)',
    },
  };

  addComponents(accessibleTextComponents, ['responsive', 'hover']);
}
