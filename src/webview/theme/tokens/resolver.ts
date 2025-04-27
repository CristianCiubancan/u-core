// src/theme/tokens/resolver.ts

import {
  fontFamily,
  fontSize,
  fontWeight,
  letterSpacing,
  lineHeight,
  textStyles,
} from './typography';
import { spacing } from './spacing';
import { borderRadius } from './radius';
import { elevation } from './elevation';
import { animation } from './animation';
import { effects } from './effects';
import { breakpoints } from './breakpoints';
import { createColorScales, ThemeOptions, defaultThemeOptions } from './colors';
import { semanticColors } from '../../colors';

export type ThemeMode = 'light' | 'dark';

/**
 * Helper function to resolve a color token based on theme mode
 * @param path - Dot notation path to the color token (e.g., 'text.primary')
 * @param mode - Theme mode (light or dark)
 */
function resolveColorToken(path: string, mode: ThemeMode): string {
  const parts = path.split('.');
  let current: any = semanticColors;

  // Navigate through the path
  for (const part of parts) {
    if (!current[part]) {
      console.warn(`Color token path "${path}" not found`);
      return mode === 'light' ? '#000000' : '#ffffff'; // Fallback
    }
    current = current[part];
  }

  // Check if we have a mode-specific value
  if (typeof current === 'object' && (current.light || current.dark)) {
    return current[mode];
  }

  // Return the value directly if it's not mode-specific
  return current;
}

/**
 * Resolves all design tokens into a Tailwind-compatible theme configuration
 * @param mode - The theme mode (light or dark)
 * @param options - Theme color options
 * @returns Fully resolved theme configuration
 */
export function resolveTokens(
  mode: ThemeMode = 'light',
  options: ThemeOptions = defaultThemeOptions
) {
  // Get color scales from our theme options
  const colorScales = createColorScales(options);

  // Create semantic color references with correct mode
  const resolvedColors = {
    // Add all color scales directly
    ...colorScales,

    // Also add semantic color tokens with mode-specific values
    bg: {
      page: resolveColorToken('background.page', mode),
      card: resolveColorToken('background.card', mode),
      subtle: resolveColorToken('background.subtle', mode),
      muted: resolveColorToken('background.muted', mode),
      elevated: resolveColorToken('background.elevated', mode),
    },
    surface: {
      primary: resolveColorToken('surface.primary', mode),
      success: resolveColorToken('surface.success', mode),
      warning: resolveColorToken('surface.warning', mode),
      error: resolveColorToken('surface.error', mode),
      info: resolveColorToken('surface.info', mode),
    },
    border: {
      subtle: resolveColorToken('border.subtle', mode),
      moderate: resolveColorToken('border.moderate', mode),
      strong: resolveColorToken('border.strong', mode),
      focus: resolveColorToken('border.focus', mode),
      error: resolveColorToken('border.error', mode),
    },
    text: {
      primary: resolveColorToken('text.primary', mode),
      secondary: resolveColorToken('text.secondary', mode),
      tertiary: resolveColorToken('text.tertiary', mode),
      disabled: resolveColorToken('text.disabled', mode),
      inverted: resolveColorToken('text.inverted', mode),
      link: resolveColorToken('text.link', mode),
      success: resolveColorToken('text.success', mode),
      error: resolveColorToken('text.error', mode),
      warning: resolveColorToken('text.warning', mode),
      info: resolveColorToken('text.info', mode),
    },
    icon: {
      primary: resolveColorToken('icon.primary', mode),
      secondary: resolveColorToken('icon.secondary', mode),
      tertiary: resolveColorToken('icon.tertiary', mode),
      inverted: resolveColorToken('icon.inverted', mode),
    },
    glass: {
      'light-bg': resolveColorToken('glass.light.background', mode),
      'light-border': resolveColorToken('glass.light.border', mode),
      'dark-bg': resolveColorToken('glass.dark.background', mode),
      'dark-border': resolveColorToken('glass.dark.border', mode),
      'brand-bg': resolveColorToken('glass.brand.background', mode),
      'brand-border': resolveColorToken('glass.brand.border', mode),
    },
  };

  // Return the full theme configuration
  return {
    colors: resolvedColors,
    fontFamily,
    fontSize,
    fontWeight,
    letterSpacing,
    lineHeight,
    spacing,
    borderRadius,
    boxShadow: elevation,
    transitionProperty: animation.transitionProperty,
    transitionTimingFunction: animation.transitionTimingFunction,
    transitionDuration: animation.transitionDuration,
    screens: breakpoints,
    blur: effects.blur,
  };
}

// Export a utility to get design tokens with resolved values
export function getDesignTokens(
  mode: ThemeMode = 'light',
  options: ThemeOptions = defaultThemeOptions
) {
  const colorScales = createColorScales(options);

  return {
    colors: {
      scales: colorScales,
      semantic: Object.entries(semanticColors).reduce(
        (acc: Record<string, Record<string, any>>, [category, values]) => {
          acc[category] = Object.entries(values).reduce(
            (catAcc: Record<string, any>, [key, value]) => {
              if (typeof value === 'object' && (value.light || value.dark)) {
                catAcc[key] = value[mode];
              } else {
                catAcc[key] = value;
              }
              return catAcc;
            },
            {}
          );
          return acc;
        },
        {}
      ),
    },
    typography: {
      fontFamily,
      fontSize,
      fontWeight,
      letterSpacing,
      lineHeight,
      textStyles,
    },
    spacing,
    borderRadius,
    elevation,
    animation,
    effects,
    breakpoints,
  };
}
