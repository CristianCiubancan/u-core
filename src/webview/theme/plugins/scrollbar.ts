// src/theme/plugins/scrollbar.ts

import { hexToRgb } from '../utils/colorUtils';
import { scrollbars, opacityLevels } from '../tokens/constants';

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
  // Get color references
  const colors = theme('colors');
  const gray = colors.gray || {};
  const primary = colors.primary || {};

  // Apply minimal global scrollbar styles
  addBase({
    'html': {
      'scrollbar-width': 'thin',
      'scrollbar-color': `rgba(${hexToRgb(gray[400])}, ${
        opacityLevels.light.low
      }) transparent`,
    },
    'body': {
      'scrollbar-width': 'thin',
      'scrollbar-color': `rgba(${hexToRgb(gray[400])}, ${
        opacityLevels.light.low
      }) transparent`,
    },
    '::-webkit-scrollbar': {
      width: scrollbars.width.default,
      height: scrollbars.width.default,
    },
    '::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '::-webkit-scrollbar-thumb': {
      background: `rgba(${hexToRgb(gray[400])}, ${opacityLevels.light.low})`,
      borderRadius: scrollbars.borderRadius.default,
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: `rgba(${hexToRgb(gray[500])}, ${opacityLevels.light.medium})`,
    },
  });

  // Define scrollbar variants as components
  const scrollbarComponents = {
    // Light theme scrollbars
    '.scrollbar-light': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(gray[100])}, ${opacityLevels.light.low})`,
      thumbBg: `rgba(${hexToRgb(gray[300])}, ${opacityLevels.light.low})`,
      thumbBorder: `2px solid rgba(${hexToRgb(gray[200])}, ${
        opacityLevels.light.low
      })`,
      thumbHoverBg: `rgba(${hexToRgb(gray[400])}, ${
        opacityLevels.light.medium
      })`,
    }),

    // Dark theme scrollbars
    '.scrollbar-dark': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(gray[800])}, ${opacityLevels.light.medium})`,
      thumbBg: `rgba(${hexToRgb(gray[600])}, ${opacityLevels.light.high})`,
      thumbBorder: `2px solid rgba(${hexToRgb(gray[700])}, ${
        opacityLevels.light.low
      })`,
      thumbHoverBg: `rgba(${hexToRgb(gray[500])}, ${opacityLevels.light.high})`,
    }),

    // Brand-colored scrollbars
    '.scrollbar-brand': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(primary[100])}, ${opacityLevels.light.low})`,
      thumbBg: `rgba(${hexToRgb(primary[400])}, ${opacityLevels.light.medium})`,
      thumbBorder: `2px solid rgba(${hexToRgb(primary[300])}, ${
        opacityLevels.light.low
      })`,
      thumbHoverBg: `rgba(${hexToRgb(primary[500])}, ${
        opacityLevels.light.high
      })`,
    }),

    // Thin scrollbars for compact UI elements
    '.scrollbar-thin': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(gray[100])}, ${opacityLevels.light.low})`,
      thumbBg: `rgba(${hexToRgb(gray[300])}, ${opacityLevels.light.low})`,
      thumbBorder: `1px solid rgba(${hexToRgb(gray[200])}, ${
        opacityLevels.light.low
      })`,
      thumbHoverBg: `rgba(${hexToRgb(gray[400])}, ${
        opacityLevels.light.medium
      })`,
      width: scrollbars.width.thin,
      height: scrollbars.width.thin,
      borderRadius: scrollbars.borderRadius.sm,
    }),

    // Thin dark scrollbars
    '.scrollbar-thin-dark': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(gray[800])}, ${opacityLevels.light.medium})`,
      thumbBg: `rgba(${hexToRgb(gray[600])}, ${opacityLevels.light.high})`,
      thumbBorder: `1px solid rgba(${hexToRgb(gray[700])}, ${
        opacityLevels.light.low
      })`,
      thumbHoverBg: `rgba(${hexToRgb(gray[500])}, ${opacityLevels.light.high})`,
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

    // Rounded scrollbars
    '.scrollbar-rounded': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(gray[100])}, ${opacityLevels.light.low})`,
      thumbBg: `rgba(${hexToRgb(gray[300])}, ${opacityLevels.light.low})`,
      thumbBorder: `2px solid rgba(${hexToRgb(gray[200])}, ${
        opacityLevels.light.low
      })`,
      thumbHoverBg: `rgba(${hexToRgb(gray[400])}, ${
        opacityLevels.light.medium
      })`,
      borderRadius: scrollbars.borderRadius.rounded,
    }),
  };

  addComponents(scrollbarComponents, ['responsive']);
}
