// tailwind.config.js
const plugin = require('tailwindcss/plugin');
const defaultTheme = require('tailwindcss/defaultTheme');

// Import our design tokens
const { resolveTokens } = require('./theme/tokens/resolver');

// Import our plugins
const { glassMorphismPlugin } = require('./theme/plugins/glassMorphism');
const { accessibleTextPlugin } = require('./theme/plugins/accessibleText');
const { scrollbarPlugin } = require('./theme/plugins/scrollbar');
const { generateResponsiveTypography } = require('./theme/tokens/typography');

/**
 * Get project-specific safelist to prevent class purging
 * This function can be safely moved to a separate file if it grows
 */
function generateSafelist() {
  // Core safelist items for critical UI classes
  return [
    // Glass variants
    'glass',
    'glass-dark',
    'glass-brand',
    'glass-brand-dark',
    'glass-subtle',
    'glass-subtle-dark',

    // Scrollbar variants
    'scrollbar-light',
    'scrollbar-dark',
    'scrollbar-brand',
    'scrollbar-thin',
    'scrollbar-thin-dark',
    'scrollbar-hidden',

    // Accessible text classes
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

    // Responsive typography
    'text-fluid-xs',
    'text-fluid-sm',
    'text-fluid-base',
    'text-fluid-lg',
    'text-fluid-xl',
    'text-fluid-2xl',
    'text-fluid-3xl',
    'text-fluid-4xl',
    'text-hd',
    'text-readable',
    'text-balance',
    'text-pretty',
  ];
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Content paths to analyze for used classes
  content: [
    './src/**/*.{js,jsx,ts,tsx,astro,html}',
    './pages/**/*.{js,jsx,ts,tsx,astro,html}',
    './components/**/*.{js,jsx,ts,tsx,astro,html}',
  ],

  // Enable dark mode using class strategy
  darkMode: 'class',

  // Extend the default theme
  theme: {
    extend: {
      // Spread our resolved tokens
      ...resolveTokens('light'),
    },
  },

  // Define plugins
  plugins: [
    // Core plugins from packages
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),

    // Custom plugins
    plugin(glassMorphismPlugin),
    plugin(accessibleTextPlugin),
    plugin(scrollbarPlugin),

    // Responsive typography utilities
    plugin(({ addUtilities }) => {
      addUtilities(generateResponsiveTypography());
    }),

    // Add any other custom plugins here
  ],

  // Safelist of classes that should never be purged
  safelist: generateSafelist(),
};
