// Modified glassMorphism.ts for FiveM compatibility
// Removed backdrop-filter and -webkit-backdrop-filter

import { hexToRgb } from '../utils/colorUtils';
import {
  borders,
  opacityLevels,
  shadowOpacity,
  elements,
} from '../tokens/constants';

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
 */
export function glassMorphismPlugin({
  addComponents,
  theme,
}: GlassMorphismPluginParams) {
  // Get color palette references
  const colors = theme('colors');
  const gray = colors.gray || {};
  const primary = colors.primary || {};

  // Define glass variants
  const glassVariants = {
    // Standard light glass effect
    '.glass': createGlassStyles({
      background: `rgba(255, 255, 255, ${opacityLevels.light.high})`,
      border: `rgba(255, 255, 255, ${opacityLevels.light.medium})`,
      shadowColor: gray[900],
      shadowOpacity: shadowOpacity.light,
      borderRadius: theme('borderRadius.xl'),
      // Removed backdropBlur
    }),

    // Dark glass effect
    '.glass-dark': createGlassStyles({
      background: `rgba(15, 23, 42, ${opacityLevels.dark.medium})`,
      border: `rgba(30, 41, 59, ${opacityLevels.light.medium})`,
      shadowColor: gray[900],
      shadowOpacity: shadowOpacity.medium,
      borderRadius: theme('borderRadius.xl'),
      // Removed backdropBlur
    }),

    // Brand-colored glass effect
    '.glass-brand': createGlassStyles({
      background: `rgba(${hexToRgb(primary[500])}, ${opacityLevels.brand.low})`,
      border: `rgba(${hexToRgb(primary[400])}, ${opacityLevels.brand.medium})`,
      shadowColor: primary[700],
      shadowOpacity: shadowOpacity.medium,
      borderRadius: theme('borderRadius.xl'),
      // Removed backdropBlur
    }),

    // Dark brand-colored glass effect
    '.glass-brand-dark': createGlassStyles({
      background: `rgba(${hexToRgb(primary[800])}, ${
        opacityLevels.dark.medium
      })`,
      border: `rgba(${hexToRgb(primary[700])}, ${opacityLevels.light.medium})`,
      shadowColor: primary[900],
      shadowOpacity: shadowOpacity.strong,
      borderRadius: theme('borderRadius.xl'),
      // Removed backdropBlur
    }),

    // Just background effect without borders/shadows
    '.glass-bg': {
      'background': `rgba(255, 255, 255, ${opacityLevels.light.high})`,
      // Removed backdrop-filter and -webkit-backdrop-filter
    },

    '.glass-bg-dark': {
      'background': `rgba(15, 23, 42, ${opacityLevels.dark.medium})`,
      // Removed backdrop-filter and -webkit-backdrop-filter
    },

    // Special subtle glass variants
    '.glass-subtle': {
      'background': `rgba(255, 255, 255, ${opacityLevels.light.medium})`,
      // Removed backdrop-filter and -webkit-backdrop-filter
      'border': `${borders.width.thin} solid rgba(255, 255, 255, ${opacityLevels.light.low})`,
      'border-radius': theme('borderRadius.xl'),
    },

    '.glass-subtle-dark': {
      'background': `rgba(15, 23, 42, ${opacityLevels.dark.low})`,
      // Removed backdrop-filter and -webkit-backdrop-filter
      'border': `${borders.width.thin} solid rgba(30, 41, 59, ${opacityLevels.light.low})`,
      'border-radius': theme('borderRadius.xl'),
    },

    // Gaming UI specific glass styles
    '.glass-gaming': {
      'background': elements.gaming.background.medium,
      // Removed backdrop-filter and -webkit-backdrop-filter
      'border': `${borders.width.thin} solid ${elements.gaming.border.light}`,
      'border-radius': theme('borderRadius.DEFAULT'),
      'box-shadow': elements.gaming.shadow.default,
    },

    // Gaming UI button glass effect
    '.glass-button': {
      'background': elements.gaming.background.dark,
      // Removed backdrop-filter and -webkit-backdrop-filter
      'border': `${borders.width.thin} solid ${elements.gaming.border.light}`,
      'border-radius': theme('borderRadius.DEFAULT'),
      'transition': theme('transitionProperty.DEFAULT'),
      '&:hover': {
        'background': elements.gaming.background.light,
        'box-shadow': elements.gaming.shadow.hover,
      },
    },

    // Gaming UI header glass effect
    '.glass-header': {
      'background': elements.gaming.background.dark,
      // Removed backdrop-filter and -webkit-backdrop-filter
      'border-bottom': `${borders.width.thin} solid ${elements.gaming.border.dark}`,
      'box-shadow': elements.gaming.shadow.header,
    },

    // Gaming UI sidebar glass effect
    '.glass-sidebar': {
      'background': elements.gaming.background.dark,
      // Removed backdrop-filter and -webkit-backdrop-filter
      'border-right': `${borders.width.thin} solid ${elements.gaming.border.dark}`,
      'box-shadow': elements.gaming.shadow.sidebar,
    },

    // Gaming UI active/selected item
    '.glass-active': {
      'background': `rgba(${hexToRgb(primary[600])}, ${
        opacityLevels.light.high
      })`,
      // Removed backdrop-filter and -webkit-backdrop-filter
      'border': `${borders.width.thin} solid rgba(${hexToRgb(primary[400])}, ${
        opacityLevels.light.high
      })`,
      'box-shadow': `0 2px 8px rgba(${hexToRgb(primary[900])}, ${
        shadowOpacity.intense
      })`,
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
  const {
    background,
    border,
    shadowColor,
    shadowOpacity,
    borderRadius,
    // Removed backdropBlur parameter
  } = config;

  const rgbShadowColor = hexToRgb(shadowColor);

  return {
    'background': background,
    // Removed backdrop-filter and -webkit-backdrop-filter properties
    'border': `${borders.width.thin} solid ${border}`,
    'border-radius': borderRadius,
    'box-shadow': `0 8px 32px rgba(${rgbShadowColor}, ${shadowOpacity})`,
  };
}

// Updated typography.ts - removed modern CSS text-wrap properties

// Responsive typography generator
export function generateResponsiveTypography() {
  return {
    // Generate fluid typography utilities
    '.text-fluid-xs': {
      'fontSize': 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
      'lineHeight': '1.5',
    },
    '.text-fluid-sm': {
      'fontSize': 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
      'lineHeight': '1.5',
    },
    '.text-fluid-base': {
      'fontSize': 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)',
      'lineHeight': '1.5',
    },
    '.text-fluid-lg': {
      'fontSize': 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)',
      'lineHeight': '1.5',
    },
    '.text-fluid-xl': {
      'fontSize': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
      'lineHeight': '1.4',
    },
    '.text-fluid-2xl': {
      'fontSize': 'clamp(1.5rem, 1.3rem + 1vw, 1.875rem)',
      'lineHeight': '1.3',
    },
    '.text-fluid-3xl': {
      'fontSize': 'clamp(1.875rem, 1.6rem + 1.375vw, 2.25rem)',
      'lineHeight': '1.2',
    },
    '.text-fluid-4xl': {
      'fontSize': 'clamp(2.25rem, 1.9rem + 1.75vw, 3rem)',
      'lineHeight': '1.1',
    },
    '.text-fluid-5xl': {
      'fontSize': 'clamp(3rem, 2.5rem + 2.5vw, 4rem)',
      'lineHeight': '1',
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

    // Removed modern CSS properties for typography
    // Removed '.text-balance' and '.text-pretty'
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

// Updated effects.ts - removed blur references

/**
 * Effect tokens for consistent visual treatments across the UI
 */
export const effects = {
  /**
   * Opacity tokens for consistent transparency levels
   */
  opacity: opacityLevels,

  /**
   * Border width tokens
   */
  borderWidth: borders.width,
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
