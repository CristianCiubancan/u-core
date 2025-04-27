// src/theme/plugins/glassMorphism.ts

import { hexToRgb } from '../utils/colorUtils';

/**
 * Plugin parameter types
 */
interface GlassMorphismPluginParams {
  addComponents: (components: Record<string, any>, variants?: string[]) => void;
  theme: (path: string) => any;
}

/**
 * Glass effect configuration
 */
interface GlassConfig {
  background: string;
  border: string;
  shadowColor: string;
  shadowOpacity: number;
  borderRadius: string;
  backdropBlur?: string;
}

/**
 * Creates glass effect styles with optimized properties
 */
function createGlassStyles(config: GlassConfig) {
  const {
    background,
    border,
    shadowColor,
    shadowOpacity,
    borderRadius,
    backdropBlur = '12px',
  } = config;

  const rgbShadowColor = hexToRgb(shadowColor);

  return {
    'background': background,
    'backdrop-filter': `blur(${backdropBlur})`,
    '-webkit-backdrop-filter': `blur(${backdropBlur})`,
    'border': `1px solid ${border}`,
    'border-radius': borderRadius,
    'box-shadow': `0 8px 32px rgba(${rgbShadowColor}, ${shadowOpacity})`,
  };
}

/**
 * Glass morphism plugin for Tailwind CSS
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
      background: 'rgba(255, 255, 255, 0.7)',
      border: 'rgba(255, 255, 255, 0.5)',
      shadowColor: gray[900],
      shadowOpacity: 0.15,
      borderRadius: '0.75rem',
    }),

    // Dark glass effect
    '.glass-dark': createGlassStyles({
      background: 'rgba(15, 23, 42, 0.75)',
      border: 'rgba(30, 41, 59, 0.5)',
      shadowColor: gray[900],
      shadowOpacity: 0.25,
      borderRadius: '0.75rem',
    }),

    // Brand-colored glass effect
    '.glass-brand': createGlassStyles({
      background: `rgba(${hexToRgb(primary[500])}, 0.15)`,
      border: `rgba(${hexToRgb(primary[400])}, 0.3)`,
      shadowColor: primary[700],
      shadowOpacity: 0.2,
      borderRadius: '0.75rem',
    }),

    // Dark brand-colored glass effect
    '.glass-brand-dark': createGlassStyles({
      background: `rgba(${hexToRgb(primary[800])}, 0.75)`,
      border: `rgba(${hexToRgb(primary[700])}, 0.5)`,
      shadowColor: primary[900],
      shadowOpacity: 0.3,
      borderRadius: '0.75rem',
    }),

    // Just background effect without borders/shadows
    '.glass-bg': {
      'background': 'rgba(255, 255, 255, 0.7)',
      'backdrop-filter': 'blur(12px)',
      '-webkit-backdrop-filter': 'blur(12px)',
    },

    '.glass-bg-dark': {
      'background': 'rgba(15, 23, 42, 0.75)',
      'backdrop-filter': 'blur(12px)',
      '-webkit-backdrop-filter': 'blur(12px)',
    },

    // Special subtle glass variants
    '.glass-subtle': {
      'background': 'rgba(255, 255, 255, 0.5)',
      'backdrop-filter': 'blur(8px)',
      '-webkit-backdrop-filter': 'blur(8px)',
      'border': '1px solid rgba(255, 255, 255, 0.3)',
      'border-radius': '0.75rem',
    },

    '.glass-subtle-dark': {
      'background': 'rgba(15, 23, 42, 0.4)',
      'backdrop-filter': 'blur(8px)',
      '-webkit-backdrop-filter': 'blur(8px)',
      'border': '1px solid rgba(30, 41, 59, 0.3)',
      'border-radius': '0.75rem',
    },

    // Gaming UI specific glass styles (like the one in your screenshot)
    '.glass-gaming': {
      'background': 'rgba(30, 41, 59, 0.7)',
      'backdrop-filter': 'blur(4px)',
      '-webkit-backdrop-filter': 'blur(4px)',
      'border': '1px solid rgba(100, 116, 139, 0.4)',
      'border-radius': '0.25rem',
      'box-shadow': `0 4px 16px rgba(0, 0, 0, 0.25)`,
    },

    // Gaming UI button glass effect
    '.glass-button': {
      'background': 'rgba(30, 41, 59, 0.8)',
      'backdrop-filter': 'blur(4px)',
      '-webkit-backdrop-filter': 'blur(4px)',
      'border': '1px solid rgba(100, 116, 139, 0.5)',
      'border-radius': '0.25rem',
      'transition': 'all 0.2s ease',
      '&:hover': {
        'background': 'rgba(51, 65, 85, 0.9)',
        'box-shadow': `0 4px 12px rgba(0, 0, 0, 0.3)`,
      },
    },

    // Gaming UI header glass effect
    '.glass-header': {
      'background': 'rgba(15, 23, 42, 0.85)',
      'backdrop-filter': 'blur(8px)',
      '-webkit-backdrop-filter': 'blur(8px)',
      'border-bottom': '1px solid rgba(100, 116, 139, 0.4)',
      'box-shadow': `0 4px 6px rgba(0, 0, 0, 0.1)`,
    },

    // Gaming UI sidebar glass effect
    '.glass-sidebar': {
      'background': 'rgba(15, 23, 42, 0.8)',
      'backdrop-filter': 'blur(12px)',
      '-webkit-backdrop-filter': 'blur(12px)',
      'border-right': '1px solid rgba(100, 116, 139, 0.4)',
      'box-shadow': `4px 0 16px rgba(0, 0, 0, 0.2)`,
    },

    // Gaming UI active/selected item
    '.glass-active': {
      'background': `rgba(${hexToRgb(primary[600])}, 0.6)`,
      'backdrop-filter': 'blur(8px)',
      '-webkit-backdrop-filter': 'blur(8px)',
      'border': `1px solid rgba(${hexToRgb(primary[400])}, 0.7)`,
      'box-shadow': `0 2px 8px rgba(${hexToRgb(primary[900])}, 0.4)`,
    },
  };

  addComponents(glassVariants, ['responsive', 'hover']);
}
