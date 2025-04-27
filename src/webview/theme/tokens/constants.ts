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
    950: '#030712',
    900: '#111827',
    800: '#1f2937',
    700: '#374151',
    600: '#4b5563',
    500: '#6b7280',
    400: '#9ca3af',
    300: '#d1d5db',
    200: '#e5e7eb',
    100: '#f3f4f6',
    50: '#f9fafb',
  },
  grayLight: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },

  // Default primary colors
  primaryDefault: {
    950: '#1e1b4b',
    900: '#312e81',
    800: '#3730a3',
    700: '#4338ca',
    600: '#4f46e5',
    500: '#6366f1',
    400: '#818cf8',
    300: '#a5b4fc',
    200: '#c7d2fe',
    100: '#e0e7ff',
    50: '#eef2ff',
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
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  fontSize: {
    '2xs': '0.625rem',
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
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
 * Common UI element styles - replacing hardcoded values with tokens
 * These variables can be used when creating themed components
 */
export const elements = {
  gaming: {
    // Updated to use token references - not hardcoded values
    background: {
      dark: `rgba(${defaultColors.grayDark[900].replace('#', '')}, ${
        opacityLevels.dark.high
      })`,
      medium: `rgba(${defaultColors.grayDark[800].replace('#', '')}, ${
        opacityLevels.dark.high
      })`,
      light: `rgba(${defaultColors.grayDark[700].replace('#', '')}, ${
        opacityLevels.dark.high
      })`,
    },
    border: {
      dark: `rgba(${defaultColors.grayDark[800].replace('#', '')}, ${
        opacityLevels.light.medium
      })`,
      light: `rgba(${defaultColors.grayDark[500].replace('#', '')}, ${
        opacityLevels.light.low
      })`,
    },
    shadow: {
      default: `0 4px 16px rgba(0, 0, 0, ${shadowOpacity.medium})`,
      hover: `0 4px 12px rgba(0, 0, 0, ${shadowOpacity.medium})`,
      header: `0 4px 6px rgba(0, 0, 0, ${shadowOpacity.light})`,
      sidebar: `4px 0 16px rgba(0, 0, 0, ${shadowOpacity.medium})`,
    },
  },

  // NEW: Adding card elements with standardized styles
  card: {
    background: {
      light: '#ffffff',
      dark: defaultColors.grayDark[900],
      brand: `rgba(${defaultColors.primaryDefault[50].replace('#', '')}, ${
        opacityLevels.light.opaque
      })`,
    },
    border: {
      light: `${borders.width.thin} solid ${defaultColors.grayLight[200]}`,
      dark: `${borders.width.thin} solid ${defaultColors.grayDark[700]}`,
      brand: `${borders.width.thin} solid ${defaultColors.primaryDefault[200]}`,
    },
    shadow: {
      small: `0 1px 3px rgba(0, 0, 0, ${shadowOpacity.subtle})`,
      medium: `0 4px 6px rgba(0, 0, 0, ${shadowOpacity.light})`,
      large: `0 10px 15px rgba(0, 0, 0, ${shadowOpacity.medium})`,
    },
    radius: {
      default: borders.radius.lg,
      large: borders.radius.xl,
    },
  },

  // NEW: Button elements
  button: {
    background: {
      primary: defaultColors.primaryDefault[600],
      secondary: defaultColors.grayLight[200],
      danger: '#ef4444', // Red-500
      success: '#10b981', // Emerald-500
      warning: '#f59e0b', // Amber-500
      info: '#3b82f6', // Blue-500
    },
    hover: {
      primary: defaultColors.primaryDefault[700],
      secondary: defaultColors.grayLight[300],
      danger: '#dc2626', // Red-600
      success: '#059669', // Emerald-600
      warning: '#d97706', // Amber-600
      info: '#2563eb', // Blue-600
    },
    border: {
      width: borders.width.thin,
      radius: {
        default: borders.radius.md,
        rounded: borders.radius.full,
      },
    },
    padding: {
      sm: '0.5rem 1rem',
      md: '0.75rem 1.5rem',
      lg: '1rem 2rem',
    },
    fontSize: {
      sm: typography.fontSize.sm,
      md: typography.fontSize.base,
      lg: typography.fontSize.lg,
    },
    fontWeight: typography.fontWeight.medium,
  },

  // NEW: Form elements
  form: {
    input: {
      background: {
        default: '#ffffff',
        disabled: defaultColors.grayLight[100],
      },
      border: {
        default: `${borders.width.thin} solid ${defaultColors.grayLight[300]}`,
        focus: `${borders.width.thin} solid ${defaultColors.primaryDefault[500]}`,
        error: `${borders.width.thin} solid #ef4444`, // Red-500
      },
      padding: '0.5rem 0.75rem',
      fontSize: typography.fontSize.base,
      radius: borders.radius.md,
    },
    label: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      color: defaultColors.grayDark[700],
      marginBottom: '0.25rem',
    },
    helperText: {
      fontSize: typography.fontSize.xs,
      color: defaultColors.grayDark[500],
      marginTop: '0.25rem',
    },
    errorText: {
      fontSize: typography.fontSize.xs,
      color: '#ef4444', // Red-500
      fontWeight: typography.fontWeight.medium,
      marginTop: '0.25rem',
    },
  },
};

/**
 * Z-index scale for consistent stacking order
 */
export const zIndex = {
  0: 0,
  10: 10,
  20: 20,
  30: 30,
  40: 40,
  50: 50, // Default
  60: 60,
  70: 70,
  80: 80,
  90: 90,
  100: 100, // Dropdowns
  200: 200, // Sticky headers
  300: 300, // Fixed elements
  400: 400, // Modal backdrop
  500: 500, // Modal content
  600: 600, // Popovers
  700: 700, // Tooltips
  800: 800, // Alerts/notifications
  900: 900, // Top-level floating elements
  999: 999, // Maximum z-index
};

/**
 * Standard spacing scale for layout and component spacing
 */
export const spacingScale = {
  px: '1px',
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
};
