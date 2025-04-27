// src/theme/tokens/constants.ts
// Centralized constants for the design system

/**
 * Default color values used when no theme colors are available
 */
export const defaultColors = {
  // Base neutral colors
  darkText: '#111827',
  lightText: '#f9fafb',

  // Default gray scale colors
  grayDark: {
    900: '#111827',
    800: '#1f2937',
    700: '#374151',
    600: '#4b5563',
    500: '#6b7280',
    400: '#9ca3af',
  },
  grayLight: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
  },

  // Default primary colors
  primaryDefault: {
    900: '#312e81',
    800: '#3730a3',
    700: '#4338ca',
    600: '#4f46e5',
    500: '#6366f1',
    400: '#818cf8',
  },
};

/**
 * Border dimensions
 */
export const borders = {
  width: {
    none: '0',
    hairline: '0.5px',
    thin: '1px',
    medium: '2px',
    thick: '3px',
    heavy: '4px',
  },
  radius: {
    none: '0',
    sm: '0.125rem', // 2px
    base: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },
};

/**
 * Scrollbar dimensions
 */
export const scrollbars = {
  width: {
    thin: '6px',
    default: '8px',
    medium: '10px',
    thick: '12px',
  },
  borderRadius: {
    sm: '3px',
    default: '4px',
    md: '6px',
    lg: '8px',
    rounded: '999px',
  },
};

/**
 * Opacity levels
 */
export const opacityLevels = {
  transparent: 0,
  subtle: 0.1,
  light: {
    low: 0.3,
    medium: 0.5,
    high: 0.7,
    opaque: 0.9,
  },
  dark: {
    low: 0.4,
    medium: 0.75,
    high: 0.85,
    opaque: 0.95,
  },
  brand: {
    low: 0.15,
    medium: 0.3,
    high: 0.5,
    opaque: 0.8,
  },
};

/**
 * Blur levels
 */
export const blurLevels = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
};

/**
 * Shadow opacity levels
 */
export const shadowOpacity = {
  subtle: 0.05,
  light: 0.15,
  medium: 0.25,
  strong: 0.3,
  intense: 0.4,
};

/**
 * Default background color values for different UI contexts
 */
export const backgroundDefaults = {
  glass: {
    light: 'rgba(255, 255, 255, 0.7)',
    dark: 'rgba(15, 23, 42, 0.75)',
    brand: 'rgba(79, 70, 229, 0.15)',
  },
};

/**
 * Typography configuration
 */
export const typography = {
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '450',
    semibold: '500',
    bold: '700',
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.01em',
    wider: '0.025em',
    widest: '0.05em',
  },
};

/**
 * Error fallback values
 */
export const fallbacks = {
  color: {
    rgb: '0, 0, 0',
    hex: '#000000',
  },
  opacity: 0.5,
};

/**
 * Common UI element styles
 */
export const elements = {
  gaming: {
    background: {
      dark: 'rgba(15, 23, 42, 0.85)',
      medium: 'rgba(30, 41, 59, 0.9)',
      light: 'rgba(51, 65, 85, 0.9)',
    },
    border: {
      dark: 'rgba(30, 41, 59, 0.7)',
      light: 'rgba(100, 116, 139, 0.3)',
    },
    shadow: {
      default: '0 4px 16px rgba(0, 0, 0, 0.25)',
      hover: '0 4px 12px rgba(0, 0, 0, 0.3)',
      header: '0 4px 6px rgba(0, 0, 0, 0.1)',
      sidebar: '4px 0 16px rgba(0, 0, 0, 0.2)',
    },
  },
};
