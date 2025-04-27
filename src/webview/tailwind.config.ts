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
import {
  spacing,
  fontFamily,
  lineHeight,
  letterSpacing,
  fontWeight,
  generateEnhancedCssVariables,
} from './theme/tokens/index';
import { borderRadius } from './theme/tokens/radius';
import { elevation } from './theme/tokens/elevation';
import { effects } from './theme/tokens/effects';
import { animation } from './theme/tokens/animation';
import { breakpoints } from './theme/tokens/breakpoints';
import { ThemeOptions, createColorScales } from './theme/tokens/tailwindColors'; // Updated to import ThemeOptions from the correct file

// Create plugin wrappers with correct interface
const createAccessibleTextPlugin = () => {
  return (api: PluginAPI) => {
    const { addComponents, theme } = api;
    accessibleTextPlugin({
      addComponents: (components, _variants) => {
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

// Define theme configuration using our ThemeOptions interface
const themeOptions: ThemeOptions = {
  // Reverted to ThemeOptions
  brandColor: 'indigo', // Ensure this matches ThemeOptions
  grayColor: 'zinc', // Updated from 'gray' to 'zinc' to match modern Tailwind naming
};

// Create color scales using CSS variables
const variableBasedColorScales = createColorScales(themeOptions);

/**
 * Tailwind CSS configuration with enhanced theming system
 */
const config: Config = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './pages/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  // Theme configuration using CSS variables
  theme: {
    colors: variableBasedColorScales,
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
      // Semantic colors as CSS variables
      colors: {
        bg: {
          page: 'var(--color-background-page)',
          card: 'var(--color-background-card)',
          subtle: 'var(--color-background-subtle)',
          muted: 'var(--color-background-muted)',
          elevated: 'var(--color-background-elevated)',
        },
        surface: {
          primary: 'var(--color-surface-primary)',
          success: 'var(--color-surface-success)',
          warning: 'var(--color-surface-warning)',
          error: 'var(--color-surface-error)',
          info: 'var(--color-surface-info)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          moderate: 'var(--color-border-moderate)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
          error: 'var(--color-border-error)',
          // NEW: Use CSS variables
          light: 'var(--border-light)',
          medium: 'var(--border-medium)',
          strongFixed: 'var(--border-strong-fixed)', // Retain to avoid conflicts
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          disabled: 'var(--color-text-disabled)',
          inverted: 'var(--color-text-inverted)',
          link: 'var(--color-text-link)',
          success: 'var(--color-text-success)',
          error: 'var(--color-text-error)',
          warning: 'var(--color-text-warning)',
          info: 'var(--color-text-info)',
        },
        icon: {
          primary: 'var(--color-icon-primary)',
          secondary: 'var(--color-icon-secondary)',
          tertiary: 'var(--color-icon-tertiary)',
          inverted: 'var(--color-icon-inverted)',
        },
        // Glass color variants - updated to use CSS variables
        glass: {
          'light-bg': 'var(--glass-light-bg)',
          'light-border': 'var(--glass-light-border)',
          'dark-bg': 'var(--glass-dark-bg)',
          'dark-border': 'var(--glass-dark-border)',
          'brand-bg': 'var(--glass-brand-bg)',
          'brand-border': 'var(--glass-brand-border)',
        },
        // NEW: Gaming UI specific colors
        gaming: {
          'bg-dark': 'var(--gaming-bg-dark)',
          'bg-medium': 'var(--gaming-bg-medium)',
          'bg-light': 'var(--gaming-bg-light)',
          'border-dark': 'var(--gaming-border-dark)',
          'border-light': 'var(--gaming-border-light)',
        },
      },
      // NEW: Shadow tokens using CSS variables
      boxShadow: {
        'subtle': 'var(--shadow-subtle)',
        'light': 'var(--shadow-light)',
        'medium': 'var(--shadow-medium)',
        'strong': 'var(--shadow-strong)',
        'intense': 'var(--shadow-intense)',
        'brand-light': 'var(--shadow-brand-light)',
        'brand-medium': 'var(--shadow-brand-medium)',
        'brand-strong': 'var(--shadow-brand-strong)',
        'gaming': 'var(--gaming-shadow-default)',
        'gaming-hover': 'var(--gaming-shadow-hover)',
        'gaming-header': 'var(--gaming-shadow-header)',
      },
      // NEW: Typography utilities using CSS variables
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': 'var(--color-text-primary)',
            '--tw-prose-headings': 'var(--color-text-primary)',
            '--tw-prose-lead': 'var(--color-text-secondary)',
            '--tw-prose-links': 'var(--color-text-link)',
            '--tw-prose-bold': 'var(--color-text-primary)',
            '--tw-prose-counters': 'var(--color-text-tertiary)',
            '--tw-prose-bullets': 'var(--color-text-tertiary)',
            '--tw-prose-quotes': 'var(--color-text-primary)',
            '--tw-prose-quote-borders': 'var(--border-light)',
            '--tw-prose-captions': 'var(--color-text-tertiary)',
            '--tw-prose-code': 'var(--color-text-primary)',
            '--tw-prose-pre-code': 'var(--color-text-inverted)',
            '--tw-prose-pre-bg': 'var(--color-gray-900)',
            '--tw-prose-th-borders': 'var(--border-medium)',
            '--tw-prose-td-borders': 'var(--border-light)',
          },
        },
      },
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
    // Theme initialization plugin - this defines CSS variables at build time
    plugin(({ addBase }) => {
      // Use the enhanced CSS variables
      const cssVariables = generateEnhancedCssVariables(themeOptions);

      // Add CSS variables as base styles
      addBase({
        // We can't use the full string directly, so we parse it
        [':root']: Object.fromEntries(
          cssVariables
            .replace(':root {', '')
            .replace('}', '')
            .split('\n')
            .filter((line) => line.trim())
            .map((line) => {
              const parts = line.trim().replace(';', '').split(': ');
              if (parts.length >= 2) {
                const name = parts[0].trim();
                const value = parts.slice(1).join(': ').trim();
                return [name, value];
              } else {
                return null;
              }
            })
            .filter((entry) => entry !== null) // Filter out null entries
        ),
      });
    }),

    // Register custom plugins with correct interfaces
    plugin(createAccessibleTextPlugin()),
    plugin(createGlassMorphismPlugin()),
    plugin(createScrollbarPlugin()),

    // Add responsive typography utilities with theme access
    plugin(({ addComponents }: PluginAPI) => {
      addComponents(generateResponsiveTypography()); // Adjusted to match expected arguments
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

      // NEW: Add scrollbar utilities that use CSS variables
      addUtilities({
        '.scrollbar-theme-light': {
          'scrollbar-width': 'thin',
          'scrollbar-color':
            'var(--scrollbar-thumb-light) var(--scrollbar-track-light)',
          '&::-webkit-scrollbar': {
            width: 'var(--scrollbar-width-default)',
            height: 'var(--scrollbar-width-default)',
          },
          '&::-webkit-scrollbar-track': {
            background: 'var(--scrollbar-track-light)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'var(--scrollbar-thumb-light)',
            borderRadius: 'var(--scrollbar-radius-default)',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'var(--scrollbar-thumb-hover-light)',
          },
        },
        '.scrollbar-theme-dark': {
          'scrollbar-width': 'thin',
          'scrollbar-color':
            'var(--scrollbar-thumb-dark) var(--scrollbar-track-dark)',
          '&::-webkit-scrollbar': {
            width: 'var(--scrollbar-width-default)',
            height: 'var(--scrollbar-width-default)',
          },
          '&::-webkit-scrollbar-track': {
            background: 'var(--scrollbar-track-dark)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'var(--scrollbar-thumb-dark)',
            borderRadius: 'var(--scrollbar-radius-default)',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: 'var(--scrollbar-thumb-hover-dark)',
          },
        },
      });

      // NEW: Add glass utilities that use CSS variables
      addUtilities({
        '.glass-theme-light': {
          background: 'var(--glass-light-bg)',
          border: `var(--border-width-thin) solid var(--glass-light-border)`,
          borderRadius: 'var(--border-radius-xl)',
          boxShadow: 'var(--shadow-light)',
        },
        '.glass-theme-dark': {
          background: 'var(--glass-dark-bg)',
          border: `var(--border-width-thin) solid var(--glass-dark-border)`,
          borderRadius: 'var(--border-radius-xl)',
          boxShadow: 'var(--shadow-medium)',
        },
        '.glass-theme-brand': {
          background: 'var(--glass-brand-bg)',
          border: `var(--border-width-thin) solid var(--glass-brand-border)`,
          borderRadius: 'var(--border-radius-xl)',
          boxShadow: 'var(--shadow-brand-medium)',
        },
      });

      // Dark mode selector utilities - using CSS variables
      addUtilities({
        '.dark-mode': {
          '.bg-page': {
            backgroundColor: 'var(--color-background-page-dark)',
          },
          '.bg-card': {
            backgroundColor: 'var(--color-background-card-dark)',
          },
          '.text-primary': {
            color: 'var(--color-text-primary-dark)',
          },
          '.text-secondary': {
            color: 'var(--color-text-secondary-dark)',
          },
          '.border': {
            borderColor: 'var(--border-light-dark)',
          },
          '.shadow': {
            boxShadow: 'var(--shadow-medium-dark)',
          },
          // New theme-compatible glass variants
          '.glass-theme-light': {
            background: 'var(--glass-dark-bg)',
            border: `var(--border-width-thin) solid var(--glass-dark-border)`,
          },
          '.scrollbar-theme-light': {
            'scrollbar-color':
              'var(--scrollbar-thumb-dark) var(--scrollbar-track-dark)',
            '&::-webkit-scrollbar-track': {
              background: 'var(--scrollbar-track-dark)',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'var(--scrollbar-thumb-dark)',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'var(--scrollbar-thumb-hover-dark)',
            },
          },
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
  // Expanded safelist with new theme-aware utilities
  safelist: [
    // Original safelist
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
    'scrollbar-light',
    'scrollbar-dark',
    'scrollbar-brand',
    'scrollbar-thin',
    'scrollbar-thin-dark',
    'scrollbar-hidden',
    'scrollbar-rounded',

    // NEW: Theme-aware utilities
    'glass-theme-light',
    'glass-theme-dark',
    'glass-theme-brand',
    'scrollbar-theme-light',
    'scrollbar-theme-dark',
    'shadow-subtle',
    'shadow-light',
    'shadow-medium',
    'shadow-strong',
    'shadow-intense',
    'shadow-brand-light',
    'shadow-brand-medium',
    'shadow-brand-strong',
    'text-on-primary-surface',
    'text-on-success-surface',
    'text-on-error-surface',
    'text-on-warning-surface',
    'text-on-info-surface',
    'text-auto-contrast',

    // Existing utilities
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
    'truncate-1',
    'truncate-2',
    'truncate-3',
    'rendering-crisp',
    'rendering-auto',
    'dark-mode',
  ],
};

export default config;
