// tailwind.config.ts
import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
// Import Tailwind types for plugin functions
import type { PluginAPI } from 'tailwindcss/types/config';

// Import custom plugins
import { accessibleTextPlugin } from './theme/plugins/accessibleText';
import { glassMorphismPlugin } from './theme/plugins/glassMorphism';
import { scrollbarPlugin } from './theme/plugins/scrollbar';

// Import token resolvers
import { generateResponsiveTypography } from './theme/tokens/typography';
import { colorScales } from './theme/tokens/colors';
import {
  spacing,
  fontFamily,
  lineHeight,
  letterSpacing,
  fontWeight,
} from './theme/tokens/index';
import { borderRadius } from './theme/tokens/radius';
import { elevation } from './theme/tokens/elevation';
import { effects } from './theme/tokens/effects';
import { animation } from './theme/tokens/animation';
import { breakpoints } from './theme/tokens/breakpoints';

// Font size configuration is now defined directly in the theme object
// This helps avoid TypeScript issues with font size array types

// Create plugin wrappers with correct interface
const createAccessibleTextPlugin = () => {
  return (api: PluginAPI) => {
    const { addComponents, theme } = api;
    accessibleTextPlugin({
      addComponents: (components, _variants) => {
        // The second parameter should be an options object, not an array
        addComponents(components, {
          // Optional properties you can set:
          // respectPrefix: true,
          // respectImportant: true
        });
      },
      theme,
    });
  };
};

const createGlassMorphismPlugin = () => {
  return ({ addComponents, theme }: PluginAPI) => {
    glassMorphismPlugin({
      addComponents: (components, _variants) => {
        addComponents(components);
      },
      theme,
    });
  };
};

const createScrollbarPlugin = () => {
  return ({ addComponents, addBase, theme }: PluginAPI) => {
    scrollbarPlugin({
      addComponents: (components, _variants) => {
        addComponents(components);
      },
      addBase,
      theme,
    });
  };
};

/**
 * Tailwind CSS configuration with custom theming system
 */
const config: Config = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  // Specify theme configuration directly with tailwind-compatible formats
  theme: {
    colors: colorScales,
    fontFamily,
    fontSize: {
      '2xs': ['0.625rem', { lineHeight: '1rem' }],
      'xs': ['0.75rem', { lineHeight: '1rem' }],
      'sm': ['0.875rem', { lineHeight: '1.25rem' }],
      'base': ['1rem', { lineHeight: '1.5rem' }],
      'lg': ['1.125rem', { lineHeight: '1.75rem' }],
      'xl': ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1.16' }],
      '6xl': ['3.75rem', { lineHeight: '1.08' }],
      '7xl': ['4.5rem', { lineHeight: '1.05' }],
      '8xl': ['6rem', { lineHeight: '1' }],
      '9xl': ['8rem', { lineHeight: '1' }],
    },
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
    extend: {
      // Additional theme extensions can go here
    },
  },
  // Default variant configuration
  variants: {
    extend: {
      opacity: ['disabled'],
      backgroundColor: ['disabled', 'active', 'group-hover'],
      textColor: ['disabled', 'active', 'group-hover'],
      borderColor: ['disabled', 'active', 'focus'],
      ringColor: ['focus'],
      ringWidth: ['focus'],
    },
  },
  // Plugin configuration
  plugins: [
    // Register custom plugins with correct interfaces
    plugin(createAccessibleTextPlugin()),
    plugin(createGlassMorphismPlugin()),
    plugin(createScrollbarPlugin()),

    // Add responsive typography utilities
    plugin(({ addComponents }: PluginAPI) => {
      addComponents(generateResponsiveTypography());
    }),

    // Add custom utilities
    plugin(({ addUtilities }: PluginAPI) => {
      // Add custom truncation utilities
      addUtilities({
        '.truncate-1': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          '-webkit-line-clamp': '1',
          '-webkit-box-orient': 'vertical',
        },
        '.truncate-2': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          '-webkit-line-clamp': '2',
          '-webkit-box-orient': 'vertical',
        },
        '.truncate-3': {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          '-webkit-line-clamp': '3',
          '-webkit-box-orient': 'vertical',
        },
      });

      // Add high-quality rendering utilities
      addUtilities({
        '.rendering-crisp': {
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
        },
        '.rendering-auto': {
          '-webkit-font-smoothing': 'auto',
          '-moz-osx-font-smoothing': 'auto',
        },
      });
    }),
  ],
  // Configuration options
  darkMode: 'class', // Use class-based dark mode
  important: false, // Don't use !important for utility classes
  future: {
    hoverOnlyWhenSupported: true,
    respectDefaultRingColorOpacity: true,
  },
  // Safelist specific utility classes that might be used dynamically
  safelist: [
    // Glass variants
    'glass',
    'glass-dark',
    'glass-brand',
    'glass-brand-dark',
    'glass-bg',
    'glass-bg-dark',
    'glass-subtle',
    'glass-subtle-dark',
    'glass-gaming',
    'glass-button',
    'glass-header',
    'glass-sidebar',
    'glass-active',

    // Text accessibility classes
    'text-on-light',
    'text-on-dark',
    'text-on-brand',
    'text-on-glass-dark',
    'text-on-glass-light',
    'text-primary',
    'text-secondary',
    'text-tertiary',
    'text-inverted',
    'text-link',
    'text-success',
    'text-error',
    'text-warning',
    'text-info',
    'high-contrast',
    'text-shadow-light',
    'text-shadow-dark',

    // Scrollbar variants
    'scrollbar-light',
    'scrollbar-dark',
    'scrollbar-brand',
    'scrollbar-thin',
    'scrollbar-thin-dark',
    'scrollbar-hidden',
    'scrollbar-rounded',

    // Responsive typography
    'text-fluid-xs',
    'text-fluid-sm',
    'text-fluid-base',
    'text-fluid-lg',
    'text-fluid-xl',
    'text-fluid-2xl',
    'text-fluid-3xl',
    'text-fluid-4xl',
    'text-fluid-5xl',
    'text-hd',
    'text-readable',

    // Custom utilities
    'truncate-1',
    'truncate-2',
    'truncate-3',
    'rendering-crisp',
    'rendering-auto',
  ],
};

export default config;
