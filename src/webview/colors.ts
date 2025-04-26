/**
 * U-Core Color System
 *
 * This file defines both core tokens (raw color values) and semantic tokens (contextual usage).
 *
 * Core tokens are organized in palettes with consistent shade numbers:
 * - 50-300: Light shades
 * - 400-600: Medium shades
 * - 700-950: Dark shades
 *
 * Semantic tokens define how colors are used in specific contexts.
 */

// Define types for the color palettes
type ColorShade =
  | '50'
  | '100'
  | '200'
  | '300'
  | '400'
  | '500'
  | '600'
  | '700'
  | '800'
  | '900'
  | '950';

interface ColorPalette {
  // Define all specific properties explicitly
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
  // Also allow string indexing for dynamic access
  [key: string]: string | undefined;
}

interface ColorPalettes {
  indigo: ColorPalette;
  violet: ColorPalette;
  slate: ColorPalette;
  green: ColorPalette;
  amber: ColorPalette;
  red: ColorPalette;
  [key: string]: ColorPalette | undefined;
}

interface GrayPalettes {
  slate: ColorPalette;
  gray: ColorPalette;
  zinc: ColorPalette;
  [key: string]: ColorPalette | undefined;
}

// ==============================
// CORE TOKENS (Raw color values)
// ==============================

/**
 * Core color palettes - the raw color values
 * These serve as the foundation for our semantic color system
 */
export const colorPalettes: ColorPalettes = {
  // Primary brand color - Indigo provides a modern, professional look
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b',
  },

  // Secondary brand color - Violet complements indigo well
  violet: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
    950: '#2e1065',
  },

  // Neutral colors - Slate provides a cool-toned gray palette
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Success color - Green for positive actions and states
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },

  // Warning color - Amber for cautionary actions and states
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },

  // Danger color - Red for destructive actions and error states
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
};

/**
 * Gray palette options
 * These are separated to allow for easy switching between different gray tones
 */
export const grayPalettes: GrayPalettes = {
  // Slate - Cool-toned gray (default)
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  // Gray - Neutral gray
  gray: {
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
  // Zinc - Warm-toned gray
  zinc: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },
};

// ==============================
// SEMANTIC TOKENS (Usage-based)
// ==============================

/**
 * Semantic color tokens
 * These define how colors are used in specific contexts
 */
export const semanticColors = {
  // UI Element Colors
  ui: {
    // Background colors for different contexts
    background: {
      // Main app backgrounds
      page: 'slate.50',
      card: 'white',
      modal: 'white',
      // Component backgrounds
      input: {
        default: 'white',
        disabled: 'slate.100',
      },
      // State-specific backgrounds
      hover: 'slate.100',
      selected: 'indigo.50',
      disabled: 'slate.100',
    },

    // Border colors
    border: {
      default: 'slate.200',
      focus: 'indigo.300',
      hover: 'slate.300',
      error: 'red.300',
    },

    // Text colors
    text: {
      primary: 'slate.900',
      secondary: 'slate.600',
      tertiary: 'slate.400',
      inverted: 'white',
      link: 'indigo.600',
      error: 'red.600',
      disabled: 'slate.400',
    },
  },

  // Feedback Colors
  feedback: {
    // Success states
    success: {
      background: 'green.50',
      border: 'green.200',
      text: 'green.800',
      icon: 'green.500',
    },
    // Warning states
    warning: {
      background: 'amber.50',
      border: 'amber.200',
      text: 'amber.800',
      icon: 'amber.500',
    },
    // Error states
    error: {
      background: 'red.50',
      border: 'red.200',
      text: 'red.800',
      icon: 'red.500',
    },
    // Info states
    info: {
      background: 'indigo.50',
      border: 'indigo.200',
      text: 'indigo.800',
      icon: 'indigo.500',
    },
  },

  // Button Colors
  button: {
    primary: {
      background: {
        default: 'indigo.600',
        hover: 'indigo.700',
        active: 'indigo.800',
        disabled: 'slate.300',
      },
      text: {
        default: 'white',
        disabled: 'slate.400',
      },
    },
    secondary: {
      background: {
        default: 'slate.100',
        hover: 'slate.200',
        active: 'slate.300',
        disabled: 'slate.50',
      },
      text: {
        default: 'slate.800',
        disabled: 'slate.400',
      },
    },
    danger: {
      background: {
        default: 'red.600',
        hover: 'red.700',
        active: 'red.800',
        disabled: 'slate.300',
      },
      text: {
        default: 'white',
        disabled: 'slate.400',
      },
    },
  },

  // Glass Effect Colors
  glass: {
    light: {
      background: 'rgba(255, 255, 255, 0.7)',
      border: 'rgba(255, 255, 255, 0.2)',
      text: 'slate.800',
    },
    dark: {
      background: 'rgba(15, 23, 42, 0.8)', // slate.900 with opacity
      border: 'rgba(51, 65, 85, 0.2)', // slate.700 with opacity
      text: 'white',
    },
    brand: {
      light: {
        background: 'rgba(224, 231, 255, 0.7)', // indigo.100 with opacity
        border: 'rgba(165, 180, 252, 0.3)', // indigo.300 with opacity
        text: 'indigo.900',
      },
      dark: {
        background: 'rgba(55, 48, 163, 0.8)', // indigo.800 with opacity
        border: 'rgba(79, 70, 229, 0.3)', // indigo.600 with opacity
        text: 'white',
      },
    },
  },
};

export function resolveColorReference(colorRef: string): string {
  if (!colorRef || typeof colorRef !== 'string') {
    return colorRef as string; // Return as is if not a string
  }

  // Handle direct color values (for glass effects with rgba)
  if (colorRef.startsWith('#') || colorRef.startsWith('rgb')) {
    return colorRef;
  }

  try {
    const [palette, shade] = colorRef.split('.');

    // Handle 'white' and 'black' special cases
    if (palette === 'white') return '#ffffff';
    if (palette === 'black') return '#000000';

    // Look in colorPalettes first
    if (colorPalettes[palette] && colorPalettes[palette][shade as ColorShade]) {
      return colorPalettes[palette][shade as ColorShade];
    }

    // Then check grayPalettes
    if (grayPalettes[palette] && grayPalettes[palette][shade as ColorShade]) {
      return grayPalettes[palette][shade as ColorShade];
    }

    // Fallback to a safe value
    console.warn(`Color reference "${colorRef}" could not be resolved`);
    return colorRef; // Return original value as fallback
  } catch (error: any) {
    console.error(`Error resolving color reference: ${error.message}`);
    return colorRef; // Return original value as fallback
  }
}
