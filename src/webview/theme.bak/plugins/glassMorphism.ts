// src/theme/plugins/glassMorphism.ts - Refactored for FiveM compatibility
// Enhanced with token references and reduced hardcoded values

import { hexToRgb } from '../utils/colorUtils';
import { borders, opacityLevels, shadowOpacity } from '../tokens/constants';

/**
 * Plugin parameter types
 */
interface GlassMorphismPluginParams {
  addComponents: (components: Record<string, any>, variants?: string[]) => void;
  theme: (path: string) => any;
}

/**
 * Glass morphism plugin for Tailwind CSS - FiveM compatible version
 * Removed backdrop-filter properties that aren't supported
 * Enhanced with theme token references
 */
export function glassMorphismPlugin({
  addComponents,
  theme,
}: GlassMorphismPluginParams) {
  // Semantic color references are now handled by getColorValue helper function

  // Elevation references
  const shadowSm = theme('boxShadow.sm');
  const shadowMd = theme('boxShadow.md');
  const shadowLg = theme('boxShadow.lg');

  // Helper function to safely get color values
  const getColorValue = (path: string, fallback: string) => {
    const value = theme(`colors.${path}`) || fallback;
    return value;
  };

  // Define glass variants
  const glassVariants = {
    // Standard light glass effect
    '.glass': createGlassStyles({
      background: `rgba(${hexToRgb(getColorValue('gray.50', '#ffffff'))}, ${
        opacityLevels.light.high
      })`,
      border: `rgba(${hexToRgb(getColorValue('gray.100', '#f3f4f6'))}, ${
        opacityLevels.light.medium
      })`,
      shadowColor: getColorValue('gray.900', '#111827'),
      shadowOpacity: shadowOpacity.light,
      borderRadius: theme('borderRadius.xl') || '0.75rem',
    }),

    // Dark glass effect
    '.glass-dark': createGlassStyles({
      background: `rgba(${hexToRgb(getColorValue('gray.900', '#111827'))}, ${
        opacityLevels.dark.medium
      })`,
      border: `rgba(${hexToRgb(getColorValue('gray.800', '#1f2937'))}, ${
        opacityLevels.light.medium
      })`,
      shadowColor: getColorValue('gray.950', '#030712'),
      shadowOpacity: shadowOpacity.medium,
      borderRadius: theme('borderRadius.xl') || '0.75rem',
    }),

    // Brand-colored glass effect
    '.glass-brand': createGlassStyles({
      background: `rgba(${hexToRgb(getColorValue('primary.500', '#6366f1'))}, ${
        opacityLevels.brand.low
      })`,
      border: `rgba(${hexToRgb(getColorValue('primary.400', '#818cf8'))}, ${
        opacityLevels.brand.medium
      })`,
      shadowColor: getColorValue('primary.700', '#4338ca'),
      shadowOpacity: shadowOpacity.medium,
      borderRadius: theme('borderRadius.xl') || '0.75rem',
    }),

    // Dark brand-colored glass effect
    '.glass-brand-dark': createGlassStyles({
      background: `rgba(${hexToRgb(getColorValue('primary.800', '#3730a3'))}, ${
        opacityLevels.dark.medium
      })`,
      border: `rgba(${hexToRgb(getColorValue('primary.700', '#4338ca'))}, ${
        opacityLevels.light.medium
      })`,
      shadowColor: getColorValue('primary.900', '#312e81'),
      shadowOpacity: shadowOpacity.strong,
      borderRadius: theme('borderRadius.xl') || '0.75rem',
    }),

    // Just background effect without borders/shadows
    '.glass-bg': {
      'background': `rgba(${hexToRgb(getColorValue('gray.50', '#ffffff'))}, ${
        opacityLevels.light.high
      })`,
    },

    '.glass-bg-dark': {
      'background': `rgba(${hexToRgb(getColorValue('gray.900', '#111827'))}, ${
        opacityLevels.dark.medium
      })`,
    },

    // Special subtle glass variants
    '.glass-subtle': {
      'background': `rgba(${hexToRgb(getColorValue('gray.50', '#ffffff'))}, ${
        opacityLevels.light.medium
      })`,
      'border': `${borders.width.thin} solid rgba(${hexToRgb(
        getColorValue('gray.100', '#f3f4f6')
      )}, ${opacityLevels.light.low})`,
      'border-radius': theme('borderRadius.xl') || '0.75rem',
    },

    '.glass-subtle-dark': {
      'background': `rgba(${hexToRgb(getColorValue('gray.900', '#111827'))}, ${
        opacityLevels.dark.low
      })`,
      'border': `${borders.width.thin} solid rgba(${hexToRgb(
        getColorValue('gray.800', '#1f2937')
      )}, ${opacityLevels.light.low})`,
      'border-radius': theme('borderRadius.xl') || '0.75rem',
    },

    // Gaming UI specific glass styles - Using theme tokens
    '.glass-gaming': {
      'background': `rgba(${hexToRgb(getColorValue('gray.900', '#111827'))}, ${
        opacityLevels.dark.high
      })`,
      'border': `${borders.width.thin} solid rgba(${hexToRgb(
        getColorValue('gray.700', '#374151')
      )}, ${opacityLevels.light.low})`,
      'border-radius': theme('borderRadius.DEFAULT') || '0.25rem',
      'box-shadow':
        shadowMd ||
        `0 4px 16px rgba(${hexToRgb(getColorValue('gray.950', '#030712'))}, ${
          shadowOpacity.medium
        })`,
    },

    // Gaming UI button glass effect - Using theme tokens
    '.glass-button': {
      'background': `rgba(${hexToRgb(getColorValue('gray.800', '#1f2937'))}, ${
        opacityLevels.dark.high
      })`,
      'border': `${borders.width.thin} solid rgba(${hexToRgb(
        getColorValue('gray.600', '#4b5563')
      )}, ${opacityLevels.light.low})`,
      'border-radius': theme('borderRadius.DEFAULT') || '0.25rem',
      'transition': theme('transitionProperty.DEFAULT') || 'all',
      '&:hover': {
        'background': `rgba(${hexToRgb(
          getColorValue('gray.700', '#374151')
        )}, ${opacityLevels.dark.high})`,
        'box-shadow':
          shadowSm ||
          `0 4px 12px rgba(${hexToRgb(getColorValue('gray.950', '#030712'))}, ${
            shadowOpacity.medium
          })`,
      },
    },

    // Gaming UI header glass effect - Using theme tokens
    '.glass-header': {
      'background': `rgba(${hexToRgb(getColorValue('gray.900', '#111827'))}, ${
        opacityLevels.dark.high
      })`,
      'border-bottom': `${borders.width.thin} solid rgba(${hexToRgb(
        getColorValue('gray.800', '#1f2937')
      )}, ${opacityLevels.light.low})`,
      'box-shadow': `0 4px 6px rgba(${hexToRgb(
        getColorValue('gray.950', '#030712')
      )}, ${shadowOpacity.light})`,
    },

    // Gaming UI sidebar glass effect - Using theme tokens
    '.glass-sidebar': {
      'background': `rgba(${hexToRgb(getColorValue('gray.900', '#111827'))}, ${
        opacityLevels.dark.high
      })`,
      'border-right': `${borders.width.thin} solid rgba(${hexToRgb(
        getColorValue('gray.800', '#1f2937')
      )}, ${opacityLevels.light.low})`,
      'box-shadow':
        shadowLg ||
        `4px 0 16px rgba(${hexToRgb(getColorValue('gray.950', '#030712'))}, ${
          shadowOpacity.medium
        })`,
    },

    // Gaming UI active/selected item - Using theme tokens
    '.glass-active': {
      'background': `rgba(${hexToRgb(
        getColorValue('primary.600', '#4f46e5')
      )}, ${opacityLevels.light.high})`,
      'border': `${borders.width.thin} solid rgba(${hexToRgb(
        getColorValue('primary.400', '#818cf8')
      )}, ${opacityLevels.light.high})`,
      'box-shadow': `0 2px 8px rgba(${hexToRgb(
        getColorValue('primary.900', '#312e81')
      )}, ${shadowOpacity.intense})`,
    },
  };

  addComponents(glassVariants, ['responsive', 'hover']);
}

// Modified styleUtils.ts for FiveM compatibility
// Removed backdrop-filter from glass styles

/**
 * Creates glass effect styles with optimized properties for FiveM
 * Removed backdrop blur properties
 * @param config - Glass effect configuration
 * @returns Object with CSS properties for glass effect
 */
export function createGlassStyles(config: GlassConfig) {
  const { background, border, shadowColor, shadowOpacity, borderRadius } =
    config;

  // Use a fallback RGB value if hexToRgb returns an error
  const rgbShadowColor = hexToRgb(shadowColor);

  return {
    'background': background,
    'border': `${borders.width.thin} solid ${border}`,
    'border-radius': borderRadius,
    'box-shadow': `0 8px 32px rgba(${rgbShadowColor}, ${shadowOpacity})`,
  };
}

// Responsive typography generator - Updated to use theme tokens
export function generateResponsiveTypography(theme?: (path: string) => any) {
  /* Removed unused variable */
  const lineHeight = theme ? theme('lineHeight') : {};

  return {
    // Generate fluid typography utilities with theme references
    '.text-fluid-xs': {
      'fontSize': 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
      'lineHeight': lineHeight?.normal || '1.5',
    },
    '.text-fluid-sm': {
      'fontSize': 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
      'lineHeight': lineHeight?.normal || '1.5',
    },
    '.text-fluid-base': {
      'fontSize': 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)',
      'lineHeight': lineHeight?.normal || '1.5',
    },
    '.text-fluid-lg': {
      'fontSize': 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)',
      'lineHeight': lineHeight?.normal || '1.5',
    },
    '.text-fluid-xl': {
      'fontSize': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
      'lineHeight': lineHeight?.relaxed || '1.4',
    },
    '.text-fluid-2xl': {
      'fontSize': 'clamp(1.5rem, 1.3rem + 1vw, 1.875rem)',
      'lineHeight': lineHeight?.relaxed || '1.3',
    },
    '.text-fluid-3xl': {
      'fontSize': 'clamp(1.875rem, 1.6rem + 1.375vw, 2.25rem)',
      'lineHeight': lineHeight?.tight || '1.2',
    },
    '.text-fluid-4xl': {
      'fontSize': 'clamp(2.25rem, 1.9rem + 1.75vw, 3rem)',
      'lineHeight': lineHeight?.tight || '1.1',
    },
    '.text-fluid-5xl': {
      'fontSize': 'clamp(3rem, 2.5rem + 2.5vw, 4rem)',
      'lineHeight': lineHeight?.tight || '1',
    },

    // Utilities for high-resolution displays
    '.text-hd': {
      '-webkit-font-smoothing': 'antialiased',
      '-moz-osx-font-smoothing': 'grayscale',
      'font-feature-settings': '"kern" 1, "liga" 1, "calt" 1',
    },

    // Utilities for maximum readability
    '.text-readable': {
      'max-width': '70ch',
      'word-spacing': '0.05em',
      // Removed 'hyphens': 'auto' as it might not be well supported
    },
  };
}

// Updated constants.ts - keep blur levels for reference but they won't be used

/**
 * Blur levels - kept for reference but not used in FiveM
 */
export const blurLevels = {
  none: '0px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
};

// Updated GlassConfig interface for styleUtils.ts

/**
 * Glass effect configuration - FiveM compatible
 * Removed backdropBlur property
 */
export interface GlassConfig {
  background: string;
  border: string;
  shadowColor: string;
  shadowOpacity: number;
  borderRadius: string;
}
