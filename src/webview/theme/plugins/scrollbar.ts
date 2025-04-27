// src/theme/plugins/scrollbar.ts

import { hexToRgb } from '../utils/colorUtils';

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
 * Creates consistent scrollbar styles
 */
function createScrollbarStyles({
  trackBg,
  thumbBg,
  thumbBorder,
  thumbHoverBg,
  width = '12px',
  height = '12px',
  borderRadius = '8px',
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
export function scrollbarPlugin({ addBase, addComponents, theme }) {
  // Get color references
  const colors = theme('colors');
  const gray = colors.gray || {};
  const primary = colors.primary || {};

  // Apply minimal global scrollbar styles
  addBase({
    'html': {
      'scrollbar-width': 'thin',
      'scrollbar-color': `rgba(${hexToRgb(gray[400])}, 0.3) transparent`,
    },
    'body': {
      'scrollbar-width': 'thin',
      'scrollbar-color': `rgba(${hexToRgb(gray[400])}, 0.3) transparent`,
    },
    '::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '::-webkit-scrollbar-thumb': {
      background: `rgba(${hexToRgb(gray[400])}, 0.3)`,
      borderRadius: '8px',
    },
    '::-webkit-scrollbar-thumb:hover': {
      background: `rgba(${hexToRgb(gray[500])}, 0.4)`,
    },
  });

  // Define scrollbar variants as components
  const scrollbarComponents = {
    // Light theme scrollbars
    '.scrollbar-light': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(gray[100])}, 0.2)`,
      thumbBg: `rgba(${hexToRgb(gray[300])}, 0.3)`,
      thumbBorder: `2px solid rgba(${hexToRgb(gray[200])}, 0.2)`,
      thumbHoverBg: `rgba(${hexToRgb(gray[400])}, 0.4)`,
    }),

    // Dark theme scrollbars
    '.scrollbar-dark': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(gray[800])}, 0.4)`,
      thumbBg: `rgba(${hexToRgb(gray[600])}, 0.6)`,
      thumbBorder: `2px solid rgba(${hexToRgb(gray[700])}, 0.3)`,
      thumbHoverBg: `rgba(${hexToRgb(gray[500])}, 0.7)`,
    }),

    // Brand-colored scrollbars
    '.scrollbar-brand': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(primary[100])}, 0.3)`,
      thumbBg: `rgba(${hexToRgb(primary[400])}, 0.5)`,
      thumbBorder: `2px solid rgba(${hexToRgb(primary[300])}, 0.3)`,
      thumbHoverBg: `rgba(${hexToRgb(primary[500])}, 0.6)`,
    }),

    // Thin scrollbars for compact UI elements
    '.scrollbar-thin': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(gray[100])}, 0.2)`,
      thumbBg: `rgba(${hexToRgb(gray[300])}, 0.3)`,
      thumbBorder: `1px solid rgba(${hexToRgb(gray[200])}, 0.2)`,
      thumbHoverBg: `rgba(${hexToRgb(gray[400])}, 0.4)`,
      width: '6px',
      height: '6px',
      borderRadius: '3px',
    }),

    // Thin dark scrollbars
    '.scrollbar-thin-dark': createScrollbarStyles({
      trackBg: `rgba(${hexToRgb(gray[800])}, 0.4)`,
      thumbBg: `rgba(${hexToRgb(gray[600])}, 0.6)`,
      thumbBorder: `1px solid rgba(${hexToRgb(gray[700])}, 0.3)`,
      thumbHoverBg: `rgba(${hexToRgb(gray[500])}, 0.7)`,
      width: '6px',
      height: '6px',
      borderRadius: '3px',
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
      trackBg: `rgba(${hexToRgb(gray[100])}, 0.2)`,
      thumbBg: `rgba(${hexToRgb(gray[300])}, 0.3)`,
      thumbBorder: `2px solid rgba(${hexToRgb(gray[200])}, 0.2)`,
      thumbHoverBg: `rgba(${hexToRgb(gray[400])}, 0.4)`,
      borderRadius: '999px',
    }),
  };

  addComponents(scrollbarComponents, ['responsive']);
}
