// src/theme/plugins/accessibleText.ts

import { getContrastRatio, hexToRgb } from '../utils/colorUtils';

/**
 * Creates accessible text utilities for various backgrounds
 */
export function accessibleTextPlugin({ addComponents, theme }) {
  const colors = theme('colors');

  // Get color references
  const gray = colors.gray || {};
  const primary = colors.primary || {};

  // Base text colors
  const darkText = gray[900] || '#111827';
  const lightText = gray[50] || '#f9fafb';

  // Calculate contrast information for primary brand color
  const primaryIsDark =
    getContrastRatio(primary[600] || '#4f46e5', lightText) < 4.5;

  // Create accessible text utilities
  const accessibleTextComponents = {
    // For light backgrounds - use dark text
    '.text-on-light': {
      'color': darkText,
      'font-weight': '450',
    },

    // For dark backgrounds - use light text
    '.text-on-dark': {
      'color': lightText,
      'font-weight': '400',
      'letter-spacing': '0.01em',
    },

    // For the brand color as background - dynamically choose text color
    '.text-on-brand': {
      'color': primaryIsDark ? darkText : lightText,
      'font-weight': primaryIsDark ? '450' : '400',
      'letter-spacing': primaryIsDark ? 'normal' : '0.01em',
    },

    // For glass elements with dark backdrop
    '.text-on-glass-dark': {
      'color': lightText,
      'text-shadow': `0 1px 2px rgba(${hexToRgb(gray[900])}, 0.3)`,
      'letter-spacing': '0.01em',
    },

    // For glass elements with light backdrop
    '.text-on-glass-light': {
      'color': darkText,
      'font-weight': '450',
    },

    // Semantic text styles that are already WCAG AA compliant
    '.text-primary': {
      'color': theme('colors.text.primary'),
      'font-weight': '500',
    },

    '.text-secondary': {
      'color': theme('colors.text.secondary'),
      'font-weight': '400',
    },

    '.text-tertiary': {
      'color': theme('colors.text.tertiary'),
      'font-weight': '400',
    },

    '.text-inverted': {
      'color': theme('colors.text.inverted'),
      'font-weight': '400',
    },

    '.text-link': {
      'color': theme('colors.text.link'),
      'font-weight': '500',
      'text-decoration': 'none',
      '&:hover': {
        'text-decoration': 'underline',
      },
    },

    '.text-success': {
      'color': theme('colors.text.success'),
      'font-weight': '500',
    },

    '.text-error': {
      'color': theme('colors.text.error'),
      'font-weight': '500',
    },

    '.text-warning': {
      'color': theme('colors.text.warning'),
      'font-weight': '500',
    },

    '.text-info': {
      'color': theme('colors.text.info'),
      'font-weight': '500',
    },

    // Additional contrast-ensuring utilities
    '.high-contrast': {
      'font-weight': '500',
      'letter-spacing': '0.01em',
    },

    '.text-shadow-light': {
      'text-shadow': `0 1px 2px rgba(${hexToRgb(gray[900])}, 0.2)`,
    },

    '.text-shadow-dark': {
      'text-shadow': `0 1px 3px rgba(${hexToRgb(gray[900])}, 0.4)`,
    },
  };

  addComponents(accessibleTextComponents, ['responsive', 'hover']);
}
