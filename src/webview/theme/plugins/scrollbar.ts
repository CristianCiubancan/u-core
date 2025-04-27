// src/theme/plugins/scrollbar.ts
// Refactored to use theme tokens and reduce hardcoded values

import { hexToRgb } from '../utils/colorUtils';
import { scrollbars, opacityLevels, borders } from '../tokens/constants';

/**
 * Scrollbar configuration interface
 */
interface ScrollbarConfig {
  trackBg: string;
  thumbBg: string;
  thumbBorder: string;
  thumbHoverBg: string;
  width?: string;
  height?: string;
  borderRadius?: string;
}

/**
 * Plugin parameter types
 */
interface ScrollbarPluginParams {
  addBase: (baseStyles: Record<string, any>) => void;
  addComponents: (components: Record<string, any>, variants?: string[]) => void;
  theme: (path: string) => any;
}

/**
 * Creates consistent scrollbar styles
 */
function createScrollbarStyles({
  trackBg,
  thumbBg,
  thumbBorder,
  thumbHoverBg,
  width = scrollbars.width.default,
  height = scrollbars.width.default,
  borderRadius = scrollbars.borderRadius.default,
}: ScrollbarConfig) {
  return {
    // WebKit-based browsers (Chrome, Safari, newer versions of Edge)
    '&::-webkit-scrollbar': {
      width,
      height,
    },
    '&::-webkit-scrollbar-track': {
      background: trackBg,
      borderRadius,
    },
    '&::-webkit-scrollbar-thumb': {
      background: thumbBg,
      borderRadius,
      border: thumbBorder,
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: thumbHoverBg,
    },

    // Firefox
    'scrollbar-width': 'thin',
    'scrollbar-color': `${thumbBg} ${trackBg}`,
  };
}

/**
 * Scrollbar plugin for Tailwind CSS
 */
export function scrollbarPlugin({
  addBase,
  addComponents,
  theme,
}: ScrollbarPluginParams) {
  // Get color references from theme
  const colors = theme('colors');
  const gray = colors.gray || {};
  const primary = colors.primary || {};

  // Get semantic color tokens if available
  const surfaceSubtle = theme('colors.bg.subtle');
  const borderSubtle = theme('colors.border.subtle');
  const borderModerate = theme('colors.border.moderate');

  // Apply minimal global scrollbar styles with theme tokens
  addBase({
    'html': {
      'scrollbar-width': 'thin',
      'scrollbar-color': `rgba(${hexToRgb(
        theme('colors.gray.400') || gray[400]
      )}, ${opacityLevels.light.low}) transparent`,
    },
    'body': {
      'scrollbar-width': 'thin',
      'scrollbar-color': `rgba(${hexToRgb(
        theme('colors.gray.400') || gray[400]
      )}, ${opacityLevels.light.low}) transparent`,
    },
    '::-webkit-scrollbar': {
      width: scrollbars.width.default,
      height: scrollbars.width.default,
    },
    '::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '::-webkit-scrollbar-thumb': {
      background: `rgba(${hexToRgb(theme('colors.gray.400') || gray[400])}, ${
        opacityLevels.light.low
      })`,
      borderRadius: scrollbars.borderRadius.default,
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: `rgba(${hexToRgb(theme('colors.gray.500') || gray[500])}, ${
        opacityLevels.light.medium
      })`,
    },
  });

  // Define scrollbar variants as components using theme tokens
  const scrollbarComponents = {
    // Light theme scrollbars
    '.scrollbar-light': createScrollbarStyles({
      trackBg:
        surfaceSubtle ||
        `rgba(${hexToRgb(theme('colors.gray.100') || gray[100])}, ${
          opacityLevels.light.low
        })`,
      thumbBg:
        borderSubtle ||
        `rgba(${hexToRgb(theme('colors.gray.300') || gray[300])}, ${
          opacityLevels.light.low
        })`,
      thumbBorder: `${borders.width.medium} solid ${
        borderSubtle ||
        `rgba(${hexToRgb(theme('colors.gray.200') || gray[200])}, ${
          opacityLevels.light.low
        })`
      }`,
      thumbHoverBg:
        borderModerate ||
        `rgba(${hexToRgb(theme('colors.gray.400') || gray[400])}, ${
          opacityLevels.light.medium
        })`,
    }),

    // Dark theme scrollbars
    '.scrollbar-dark': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(theme('colors.gray.800') || gray[800])}, ${
        opacityLevels.light.medium
      })`,
      thumbBg: `rgba(${hexToRgb(theme('colors.gray.600') || gray[600])}, ${
        opacityLevels.light.high
      })`,
      thumbBorder: `${borders.width.medium} solid rgba(${hexToRgb(
        theme('colors.gray.700') || gray[700]
      )}, ${opacityLevels.light.low})`,
      thumbHoverBg: `rgba(${hexToRgb(theme('colors.gray.500') || gray[500])}, ${
        opacityLevels.light.high
      })`,
    }),

    // Brand-colored scrollbars
    '.scrollbar-brand': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(
        theme('colors.primary.100') || primary[100]
      )}, ${opacityLevels.light.low})`,
      thumbBg: `rgba(${hexToRgb(
        theme('colors.primary.400') || primary[400]
      )}, ${opacityLevels.light.medium})`,
      thumbBorder: `${borders.width.medium} solid rgba(${hexToRgb(
        theme('colors.primary.300') || primary[300]
      )}, ${opacityLevels.light.low})`,
      thumbHoverBg: `rgba(${hexToRgb(
        theme('colors.primary.500') || primary[500]
      )}, ${opacityLevels.light.high})`,
    }),

    // Thin scrollbars for compact UI elements - use border tokens
    '.scrollbar-thin': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(theme('colors.gray.100') || gray[100])}, ${
        opacityLevels.light.low
      })`,
      thumbBg: `rgba(${hexToRgb(theme('colors.gray.300') || gray[300])}, ${
        opacityLevels.light.low
      })`,
      thumbBorder: `${borders.width.thin} solid rgba(${hexToRgb(
        theme('colors.gray.200') || gray[200]
      )}, ${opacityLevels.light.low})`,
      thumbHoverBg: `rgba(${hexToRgb(theme('colors.gray.400') || gray[400])}, ${
        opacityLevels.light.medium
      })`,
      width: scrollbars.width.thin,
      height: scrollbars.width.thin,
      borderRadius: scrollbars.borderRadius.sm,
    }),

    // Thin dark scrollbars - use border tokens
    '.scrollbar-thin-dark': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(theme('colors.gray.800') || gray[800])}, ${
        opacityLevels.light.medium
      })`,
      thumbBg: `rgba(${hexToRgb(theme('colors.gray.600') || gray[600])}, ${
        opacityLevels.light.high
      })`,
      thumbBorder: `${borders.width.thin} solid rgba(${hexToRgb(
        theme('colors.gray.700') || gray[700]
      )}, ${opacityLevels.light.low})`,
      thumbHoverBg: `rgba(${hexToRgb(theme('colors.gray.500') || gray[500])}, ${
        opacityLevels.light.high
      })`,
      width: scrollbars.width.thin,
      height: scrollbars.width.thin,
      borderRadius: scrollbars.borderRadius.sm,
    }),

    // Hide scrollbars but keep functionality
    '.scrollbar-hidden': {
      '-ms-overflow-style': 'none',
      'scrollbar-width': 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
    },

    // Rounded scrollbars - use border and shadow tokens
    '.scrollbar-rounded': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(theme('colors.gray.100') || gray[100])}, ${
        opacityLevels.light.low
      })`,
      thumbBg: `rgba(${hexToRgb(theme('colors.gray.300') || gray[300])}, ${
        opacityLevels.light.low
      })`,
      thumbBorder: `${borders.width.thin} solid rgba(${hexToRgb(
        theme('colors.gray.200') || gray[200]
      )}, ${opacityLevels.light.low})`,
      thumbHoverBg: `rgba(${hexToRgb(theme('colors.gray.400') || gray[400])}, ${
        opacityLevels.light.medium
      })`,
      borderRadius: scrollbars.borderRadius.rounded,
    }),

    // NEW: Subtle scrollbars with shadow - theme token powered
    '.scrollbar-subtle': createScrollbarStyles({
      trackBg: 'transparent',
      thumbBg: `rgba(${hexToRgb(theme('colors.gray.400') || gray[400])}, ${
        opacityLevels.light.medium
      })`,
      thumbBorder: 'none',
      thumbHoverBg: `rgba(${hexToRgb(theme('colors.gray.500') || gray[500])}, ${
        opacityLevels.light.high
      })`,
      width: scrollbars.width.thin,
      borderRadius: scrollbars.borderRadius.rounded,
    }),

    // NEW: Glass-style scrollbars for glass UI elements - theme token powered
    '.scrollbar-glass': createScrollbarStyles({
      trackBg:
        theme('colors.glass.light-bg') ||
        `rgba(255, 255, 255, ${opacityLevels.subtle})`,
      thumbBg:
        theme('colors.glass.light-border') ||
        `rgba(255, 255, 255, ${opacityLevels.light.medium})`,
      thumbBorder: 'none',
      thumbHoverBg: `rgba(255, 255, 255, ${opacityLevels.light.high})`,
      width: scrollbars.width.thin,
      borderRadius: scrollbars.borderRadius.rounded,
    }),

    // NEW: Glass-dark scrollbars - theme token powered
    '.scrollbar-glass-dark': createScrollbarStyles({
      trackBg:
        theme('colors.glass.dark-bg') ||
        `rgba(0, 0, 0, ${opacityLevels.subtle})`,
      thumbBg:
        theme('colors.glass.dark-border') ||
        `rgba(${hexToRgb(theme('colors.gray.700') || gray[700])}, ${
          opacityLevels.light.medium
        })`,
      thumbBorder: 'none',
      thumbHoverBg: `rgba(${hexToRgb(theme('colors.gray.600') || gray[600])}, ${
        opacityLevels.light.high
      })`,
      width: scrollbars.width.thin,
      borderRadius: scrollbars.borderRadius.rounded,
    }),
  };

  addComponents(scrollbarComponents, ['responsive']);
}
