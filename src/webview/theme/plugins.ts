/**
 * Custom plugins for Tailwind CSS
 * Centralizes all plugin definitions for easier management
 */
import { generateGlassStyles } from './glassStyles';
import { createScrollbarStyles } from './scrollbarUtils';
import { generateAccessibleTextUtilities } from './accessibleText';
import { generateResponsiveTypography } from './typography';
import { hexToRgb } from './colorUtils';
import themeConfig from './theme';
import { semanticColors } from '../colors';

// Get active palette references from imported modules
const brandPalette = themeConfig.colors.brand;
const grayPalette = themeConfig.colors.customGray;

// Define plugins array
const plugins = [
  // Glass morphism effects plugin
  function ({
    addUtilities,
  }: {
    addUtilities: (
      utilities: Record<string, unknown>,
      variants?: string[]
    ) => void;
  }) {
    try {
      // Ensure we have valid palette data before generating styles
      if (!brandPalette || !grayPalette) {
        console.warn('Missing color palettes, using fallbacks');
      }

      const glassStyles = generateGlassStyles(
        semanticColors,
        grayPalette || {},
        brandPalette || grayPalette || {}
      );

      addUtilities(glassStyles, ['responsive', 'hover']);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error generating glass styles: ${errorMessage}`);
      // Add minimal glass styles to prevent build failures
      addUtilities(
        {
          '.glass': {
            'background': 'rgba(255, 255, 255, 0.7)',
            'border': '1px solid rgba(255, 255, 255, 0.5)',
            'border-radius': '0.65rem',
          },
          '.glass-dark': {
            'background': 'rgba(15, 23, 42, 0.75)',
            'border': '1px solid rgba(30, 41, 59, 0.5)',
            'border-radius': '0.65rem',
          },
        },
        ['responsive', 'hover']
      );
    }
  },

  // Global scrollbar styles plugin
  function ({
    addBase,
    addUtilities,
  }: {
    addBase: (base: Record<string, unknown>) => void;
    addUtilities: (
      utilities: Record<string, unknown>,
      variants?: string[]
    ) => void;
  }) {
    // Add global styles to html and body
    addBase({
      'html': {
        ...createScrollbarStyles(
          `rgba(${hexToRgb(grayPalette[100])}, 0.2)`,
          `rgba(${hexToRgb(grayPalette[300])}, 0.3)`,
          `2px solid rgba(${hexToRgb(grayPalette[200])}, 0.2)`,
          `rgba(${hexToRgb(grayPalette[400])}, 0.4)`
        ),
      },
      'body': {
        ...createScrollbarStyles(
          `rgba(${hexToRgb(grayPalette[100])}, 0.2)`,
          `rgba(${hexToRgb(grayPalette[300])}, 0.3)`,
          `2px solid rgba(${hexToRgb(grayPalette[200])}, 0.2)`,
          `rgba(${hexToRgb(grayPalette[400])}, 0.4)`
        ),
      },
      // Direct global scrollbar styles for CEF environments
      '::-webkit-scrollbar': {
        width: '12px',
        height: '12px',
      },
      '::-webkit-scrollbar-track': {
        background: `rgba(${hexToRgb(grayPalette[100])}, 0.2)`,
        borderRadius: '8px',
      },
      '::-webkit-scrollbar-thumb': {
        background: `rgba(${hexToRgb(grayPalette[300])}, 0.3)`,
        borderRadius: '8px',
        border: `2px solid rgba(${hexToRgb(grayPalette[200])}, 0.2)`,
      },
      '::-webkit-scrollbar-thumb:hover': {
        background: `rgba(${hexToRgb(grayPalette[400])}, 0.4)`,
      },
    });

    // Add custom scrollbar utility classes
    addUtilities({
      '.custom-scrollbar': {
        ...createScrollbarStyles(
          `rgba(${hexToRgb(grayPalette[100])}, 0.2)`,
          `rgba(${hexToRgb(grayPalette[300])}, 0.3)`,
          `2px solid rgba(${hexToRgb(grayPalette[200])}, 0.2)`,
          `rgba(${hexToRgb(grayPalette[400])}, 0.4)`
        ),
      },
      '.custom-scrollbar-dark': {
        ...createScrollbarStyles(
          `rgba(${hexToRgb(grayPalette[800])}, 0.4)`,
          `rgba(${hexToRgb(grayPalette[600])}, 0.6)`,
          `2px solid rgba(${hexToRgb(grayPalette[700])}, 0.3)`,
          `rgba(${hexToRgb(grayPalette[500])}, 0.7)`
        ),
      },
      '.custom-scrollbar-brand': {
        ...createScrollbarStyles(
          `rgba(${hexToRgb(brandPalette[100])}, 0.3)`,
          `rgba(${hexToRgb(brandPalette[400])}, 0.5)`,
          `2px solid rgba(${hexToRgb(brandPalette[300])}, 0.3)`,
          `rgba(${hexToRgb(brandPalette[500])}, 0.6)`
        ),
      },
    });
  },

  // Accessible text utilities plugin
  function ({
    addUtilities,
  }: {
    addUtilities: (
      utilities: Record<string, unknown>,
      variants?: string[]
    ) => void;
  }) {
    try {
      addUtilities(generateAccessibleTextUtilities(grayPalette, brandPalette));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        `Error generating accessible text utilities: ${errorMessage}`
      );
      // Add minimal text utilities to prevent build failures
      addUtilities({
        '.text-accessible-light': {
          color: grayPalette[900] || '#000000',
          'font-weight': '450',
        },
        '.text-accessible-dark': {
          color: 'white',
          'font-weight': '400',
        },
      });
    }
  },

  // Enhanced typography and readability utilities plugin
  function ({
    addUtilities,
  }: {
    addUtilities: (
      utilities: Record<string, unknown>,
      variants?: string[]
    ) => void;
  }) {
    addUtilities(generateResponsiveTypography());
  },
];

export default plugins;
