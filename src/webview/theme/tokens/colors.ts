// src/theme/tokens/colors.ts

// Type definitions for color scales
export type ColorShade =
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
export type ColorScale = Record<ColorShade, string>;
export type ColorScales = Record<string, ColorScale>;

// Core color scales (primitive tokens)
export const colorScales: ColorScales = {
  // Neutral tones
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
  // Primary brand colors
  primary: {
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
  // Success
  success: {
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
  // Warning
  warning: {
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
  // Error
  error: {
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
  // Info
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
};

// Semantic color tokens (semantic tokens)
export const semanticColors = {
  background: {
    page: { light: 'white', dark: 'gray.950' },
    card: { light: 'white', dark: 'gray.900' },
    subtle: { light: 'gray.50', dark: 'gray.800' },
    muted: { light: 'gray.100', dark: 'gray.800' },
    elevated: { light: 'white', dark: 'gray.800' },
  },
  surface: {
    primary: { light: 'primary.600', dark: 'primary.500' },
    success: { light: 'success.600', dark: 'success.500' },
    warning: { light: 'warning.500', dark: 'warning.400' },
    error: { light: 'error.600', dark: 'error.500' },
    info: { light: 'info.600', dark: 'info.500' },
  },
  border: {
    subtle: { light: 'gray.200', dark: 'gray.700' },
    moderate: { light: 'gray.300', dark: 'gray.600' },
    strong: { light: 'gray.400', dark: 'gray.500' },
    focus: { light: 'primary.500', dark: 'primary.400' },
    error: { light: 'error.500', dark: 'error.400' },
  },
  text: {
    primary: { light: 'gray.900', dark: 'gray.50' },
    secondary: { light: 'gray.600', dark: 'gray.300' },
    tertiary: { light: 'gray.500', dark: 'gray.400' },
    disabled: { light: 'gray.400', dark: 'gray.500' },
    inverted: { light: 'white', dark: 'gray.950' },
    link: { light: 'primary.600', dark: 'primary.400' },
    success: { light: 'success.700', dark: 'success.400' },
    error: { light: 'error.700', dark: 'error.400' },
    warning: { light: 'warning.700', dark: 'warning.400' },
    info: { light: 'info.700', dark: 'info.400' },
  },
  icon: {
    primary: { light: 'gray.900', dark: 'gray.50' },
    secondary: { light: 'gray.600', dark: 'gray.300' },
    tertiary: { light: 'gray.500', dark: 'gray.400' },
    inverted: { light: 'white', dark: 'gray.950' },
  },
  glass: {
    light: {
      background: {
        light: 'rgba(255, 255, 255, 0.7)',
        dark: 'rgba(255, 255, 255, 0.1)',
      },
      border: {
        light: 'rgba(255, 255, 255, 0.5)',
        dark: 'rgba(255, 255, 255, 0.1)',
      },
    },
    dark: {
      background: {
        light: 'rgba(15, 23, 42, 0.75)',
        dark: 'rgba(15, 23, 42, 0.85)',
      },
      border: { light: 'rgba(30, 41, 59, 0.5)', dark: 'rgba(30, 41, 59, 0.7)' },
    },
    brand: {
      background: {
        light: 'rgba(79, 70, 229, 0.15)',
        dark: 'rgba(79, 70, 229, 0.25)',
      },
      border: {
        light: 'rgba(79, 70, 229, 0.3)',
        dark: 'rgba(79, 70, 229, 0.4)',
      },
    },
  },
};

// Token resolver function
export function resolveColorToken(
  token: string,
  mode: 'light' | 'dark' = 'light'
): string {
  if (!token || typeof token !== 'string') return '';

  // If it's already a direct color value (hex, rgb, etc.)
  if (
    token.startsWith('#') ||
    token.startsWith('rgb') ||
    token.startsWith('hsl')
  ) {
    return token;
  }

  // For semantic tokens with light/dark variants
  const parts = token.split('.');

  // Handle deep nesting with traversal
  let result: any = semanticColors;
  for (const part of parts) {
    if (!result) break;
    result = result[part];
  }

  // If we have a light/dark object, select the appropriate mode
  if (result && typeof result === 'object' && (result.light || result.dark)) {
    const colorRef = result[mode] || '';
    // If this is a reference to a color scale, resolve it recursively
    if (typeof colorRef === 'string' && colorRef.includes('.')) {
      return resolveColorToken(colorRef, mode);
    }
    // If this is a direct reference to a color scale
    if (typeof colorRef === 'string') {
      const [scale, shade] = colorRef.split('.');
      // Type assertion to handle string indexing
      return colorScales[scale]?.[shade as ColorShade] || colorRef;
    }
    return colorRef;
  }

  // Direct reference to a color scale (e.g. "primary.500")
  if (parts.length === 2) {
    const [scale, shade] = parts;
    // Type assertion to handle string indexing
    return colorScales[scale]?.[shade as ColorShade] || token;
  }

  return token;
}
