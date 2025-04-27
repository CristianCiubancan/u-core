import {
  type Config,
  type PluginAPI,
  type CSSRuleObject,
} from 'tailwindcss/types/config'; // Import CSSRuleObject
import forms from '@tailwindcss/forms';

import { colorPalettes, grayPalettes } from './colors';
import { brandPalette, grayPalette } from './config/palettes';
import { generateFontSizes } from './utils/fontSizeUtils';
import { generateMergedGlassClasses } from './utils/glassUtils';
import { generateAccessibleTextUtilities } from './utils/accessibleTextUtils';
import { generateSafelist } from './utils/safelistUtils';
import { hexToRgb, getContrastRatio } from '../utils/colorUtils';

const tailwindConfig: Config = {
  content: ['./src/**/*.{js,jsx,ts,tsx,astro,html}'],
  theme: {
    extend: {
      fontSize: generateFontSizes(),
      colors: {
        brand: brandPalette,
        gray: grayPalette,
      },
      boxShadow: {
        'glass': `0 4px 30px rgba(${hexToRgb(grayPalette[900])}, 0.1)`,
        'glass-lg': `0 8px 32px rgba(${hexToRgb(grayPalette[900])}, 0.15)`,
        'subtle': `0 1px 3px rgba(${hexToRgb(grayPalette[900])}, 0.08)`,
        'elevation-1': `0 1px 2px rgba(${hexToRgb(
          grayPalette[900]
        )}, 0.05), 0 1px 4px rgba(${hexToRgb(grayPalette[900])}, 0.1)`,
        'elevation-2': `0 2px 4px rgba(${hexToRgb(
          grayPalette[900]
        )}, 0.05), 0 3px 6px rgba(${hexToRgb(grayPalette[900])}, 0.1)`,
        'elevation-3': `0 4px 8px rgba(${hexToRgb(
          grayPalette[900]
        )}, 0.05), 0 8px 16px rgba(${hexToRgb(grayPalette[900])}, 0.1)`,
      },
      textColor: {
        'accessible': {
          'on-light': grayPalette[800],
          'on-dark': grayPalette[100],
          'on-brand':
            getContrastRatio(brandPalette[600], grayPalette[50]) >= 4.5
              ? grayPalette[100]
              : grayPalette[800],
        },
        'primary': brandPalette[600],
        'secondary': grayPalette[500],
        'muted': grayPalette[400],
      },
      borderRadius: {
        'xs': '0.125rem',
        'sm': '0.25rem',
        'DEFAULT': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '18': '4.5rem',
      },
      lineHeight: {
        'tighter': '1.15',
        'relaxed': '1.75',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [
    forms({
      strategy: 'class',
    }),

    function ({ addUtilities }: PluginAPI) {
      // Use double assertion to satisfy the type checker
      addUtilities(
        generateMergedGlassClasses(
          grayPalette,
          brandPalette
        ) as unknown as CSSRuleObject
      );
    },

    function ({ addUtilities }: PluginAPI) {
      addUtilities(generateAccessibleTextUtilities(grayPalette, brandPalette));
    },

    function ({ addUtilities }: PluginAPI) {
      addUtilities({
        '.min-text-size': {
          'font-size': 'max(1rem, 1.6vw)',
        },
        '.text-shadow-sm': {
          'text-shadow': `0 1px 2px rgba(${hexToRgb(grayPalette[900])}, 0.15)`,
        },
        '.text-shadow': {
          'text-shadow': `0 2px 4px rgba(${hexToRgb(grayPalette[900])}, 0.15)`,
        },
        '.text-shadow-lg': {
          'text-shadow': `0 4px 6px rgba(${hexToRgb(grayPalette[900])}, 0.2)`,
        },
        '.transition-all-fast': {
          'transition': 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        },
        '.font-smooth': {
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
        },
        '.text-balance': {
          'text-wrap': 'balance',
        },
        '.text-readable': {
          'max-width': '70ch',
          'word-spacing': '0.05em',
        },
      });
    },
  ],
  safelist: generateSafelist(colorPalettes, grayPalettes),
};

export default tailwindConfig;
