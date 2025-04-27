// src/theme/tokens/resolver.ts

import { colorScales, semanticColors, resolveColorToken } from './colors';
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

export type ThemeMode = 'light' | 'dark';

/**
 * Resolves all design tokens into a Tailwind-compatible theme configuration
 * @param mode - The theme mode (light or dark)
 * @returns Fully resolved theme configuration
 */
export function resolveTokens(mode: ThemeMode = 'light') {
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
      light: {
        background: resolveColorToken('glass.light.background', mode),
        border: resolveColorToken('glass.light.border', mode),
      },
      dark: {
        background: resolveColorToken('glass.dark.background', mode),
        border: resolveColorToken('glass.dark.border', mode),
      },
      brand: {
        background: resolveColorToken('glass.brand.background', mode),
        border: resolveColorToken('glass.brand.border', mode),
      },
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
  };
}

// Export a utility to get design tokens with resolved values
export function getDesignTokens(mode: ThemeMode = 'light') {
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
  };
}
