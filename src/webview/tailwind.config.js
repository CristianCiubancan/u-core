/** @type {import('tailwindcss').Config} */
const { grayPalettes, colorPalettes, semanticColors } = require('./colors');
const { createScrollbarStyles } = require('./utils/scrollbarUtils');
const { getContrastRatio, hexToRgb } = require('./utils/colorUtils');

const fontSizeMultiplier = 1.15; // Optimized for readability

// Configuration settings
const config = {
  brandColor: 'indigo', // Modern, professional brand color
  grayColor: 'slate', // Cool-toned gray for better contrast with indigo
};

// Get active palette references
const brandPalette = colorPalettes[config.brandColor];
const grayPalette = grayPalettes[config.grayColor];

// Function to generate glass class styles
function createGlassStyles(background, border, boxShadow, scrollbarConfig) {
  return {
    background,
    border,
    'box-shadow': boxShadow,
    'border-radius': '0.65rem', // Increased for better visual appearance
    ...createScrollbarStyles(
      scrollbarConfig.trackBg,
      scrollbarConfig.thumbBg,
      scrollbarConfig.thumbBorder,
      scrollbarConfig.thumbHoverBg
    ),
  };
}

// Function to generate merged glass classes with the active brand color and matching scrollbars
function generateMergedGlassClasses() {
  // Use semantic colors for glass effects
  return {
    '.glass': {
      ...createGlassStyles(
        semanticColors.glass.light.background,
        `1px solid ${semanticColors.glass.light.border}`,
        `0 4px 30px rgba(${hexToRgb(grayPalette[900])}, 0.15)`,
        {
          trackBg: `rgba(${hexToRgb(grayPalette[100])}, 0.2)`,
          thumbBg: `rgba(${hexToRgb(grayPalette[300])}, 0.3)`,
          thumbBorder: `2px solid rgba(${hexToRgb(grayPalette[200])}, 0.2)`,
          thumbHoverBg: `rgba(${hexToRgb(grayPalette[400])}, 0.4)`,
        }
      ),
      color: semanticColors.glass.light.text,
    },
    '.glass-dark': {
      ...createGlassStyles(
        semanticColors.glass.dark.background,
        `1px solid ${semanticColors.glass.dark.border}`,
        `0 6px 32px rgba(${hexToRgb(grayPalette[900])}, 0.25)`,
        {
          trackBg: `rgba(${hexToRgb(grayPalette[800])}, 0.4)`,
          thumbBg: `rgba(${hexToRgb(grayPalette[600])}, 0.6)`,
          thumbBorder: `2px solid rgba(${hexToRgb(grayPalette[700])}, 0.3)`,
          thumbHoverBg: `rgba(${hexToRgb(grayPalette[500])}, 0.7)`,
        }
      ),
      color: semanticColors.glass.dark.text,
    },
    '.glass-brand': {
      ...createGlassStyles(
        semanticColors.glass.brand.light.background,
        `1px solid ${semanticColors.glass.brand.light.border}`,
        `0 6px 30px rgba(${hexToRgb(brandPalette[500])}, 0.15)`,
        {
          trackBg: `rgba(${hexToRgb(brandPalette[100])}, 0.3)`,
          thumbBg: `rgba(${hexToRgb(brandPalette[400])}, 0.5)`,
          thumbBorder: `2px solid rgba(${hexToRgb(brandPalette[300])}, 0.3)`,
          thumbHoverBg: `rgba(${hexToRgb(brandPalette[500])}, 0.6)`,
        }
      ),
      color: semanticColors.glass.brand.light.text,
    },
    '.glass-brand-dark': {
      ...createGlassStyles(
        semanticColors.glass.brand.dark.background,
        `1px solid ${semanticColors.glass.brand.dark.border}`,
        `0 8px 36px rgba(${hexToRgb(brandPalette[900])}, 0.3)`,
        {
          trackBg: `rgba(${hexToRgb(brandPalette[700])}, 0.4)`,
          thumbBg: `rgba(${hexToRgb(brandPalette[400])}, 0.7)`,
          thumbBorder: `2px solid rgba(${hexToRgb(brandPalette[500])}, 0.5)`,
          thumbHoverBg: `rgba(${hexToRgb(brandPalette[300])}, 0.8)`,
        }
      ),
      color: semanticColors.glass.brand.dark.text,
    },
  };
}

// Generate scrollbar styles that apply globally or to specific classes
function generateGlobalScrollbarStyles() {
  return {
    // Global default scrollbar styles
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
    // Custom scrollbar class for direct application
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
  };
}

// Generate font size configuration with optimized readability
function generateFontSizes() {
  const sizes = {
    'xs': [0.75, 1.3], // Increased line height for better readability
    'sm': [0.875, 1.55], // Increased line height for better readability
    'base': [1, 1.65], // Optimal line height for main text
    'lg': [1.125, 1.6], // Slightly reduced line height for larger text
    'xl': [1.25, 1.55], // Adjusted for headings
    '2xl': [1.5, 1.4], // Adjusted for headings
    '3xl': [1.875, 1.3], // Adjusted for headings
    '4xl': [2.25, 1.2], // Headings need less line height
    '5xl': [3, 1.1], // Improved for very large text
    '6xl': [3.75, 1.05], // Improved for very large text
  };

  return Object.entries(sizes).reduce((acc, [key, [size, lineHeight]]) => {
    acc[key] = [
      `${size * fontSizeMultiplier}rem`,
      {
        lineHeight: `${
          typeof lineHeight === 'number'
            ? lineHeight * fontSizeMultiplier
            : lineHeight
        }rem`,
        letterSpacing:
          key === 'xs' || key === 'sm'
            ? '0.01em'
            : key === 'base'
            ? '0.005em'
            : '0em', // Improved letter spacing for small text
      },
    ];
    return acc;
  }, {});
}

// Generate safelist for colors
function generateSafelist() {
  // Core color classes
  const colorTypes = [
    { palettes: colorPalettes, prefix: '' },
    { palettes: grayPalettes, prefix: '' },
  ];

  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const modifiers = [
    'bg',
    'text',
    'hover:bg',
    'hover:text',
    'focus:bg',
    'focus:text',
    'border',
    'hover:border',
  ];

  const colorClasses = colorTypes.flatMap(({ palettes, prefix }) =>
    Object.keys(palettes).flatMap((color) =>
      shades.flatMap((shade) =>
        modifiers.map((modifier) => `${modifier}-${prefix}${color}-${shade}`)
      )
    )
  );

  // Glass effect classes
  const glassClasses = [
    'glass',
    'glass-dark',
    'glass-brand',
    'glass-brand-dark',
    'hover:glass',
    'hover:glass-dark',
    'hover:glass-brand',
    'hover:glass-brand-dark',
  ];

  // Scrollbar classes
  const scrollbarClasses = [
    'custom-scrollbar',
    'custom-scrollbar-dark',
    'custom-scrollbar-brand',
  ];

  // Accessibility classes
  const accessibilityClasses = [
    'text-accessible-light',
    'text-accessible-dark',
    'text-accessible-on-brand',
    'text-accessible-on-glass',
    'text-on-dark',
    'text-on-light',
    'text-primary',
    'text-secondary',
    'text-tertiary',
    'text-inverted',
    'text-link',
    'text-error',
    'text-disabled',
  ];

  // Cursor classes
  const cursorClasses = [
    'cursor-pointer',
    'cursor-default',
    'cursor-wait',
    'cursor-text',
    'cursor-move',
    'cursor-not-allowed',
  ];

  // Semantic UI background classes
  const uiBackgroundClasses = [
    // Page backgrounds
    'bg-ui-background-page',
    'bg-ui-background-card',
    'bg-ui-background-modal',

    // Input backgrounds
    'bg-ui-background-input-default',
    'bg-ui-background-input-disabled',

    // State backgrounds
    'bg-ui-background-hover',
    'bg-ui-background-selected',
    'bg-ui-background-disabled',
  ];

  // Semantic UI border classes
  const uiBorderClasses = [
    'border-ui-border-default',
    'border-ui-border-focus',
    'border-ui-border-hover',
    'border-ui-border-error',
  ];

  // Semantic feedback classes
  const feedbackClasses = [
    // Success
    'bg-feedback-success-background',
    'border-feedback-success-border',
    'text-feedback-success-text',
    'text-feedback-success-icon',

    // Warning
    'bg-feedback-warning-background',
    'border-feedback-warning-border',
    'text-feedback-warning-text',
    'text-feedback-warning-icon',

    // Error
    'bg-feedback-error-background',
    'border-feedback-error-border',
    'text-feedback-error-text',
    'text-feedback-error-icon',

    // Info
    'bg-feedback-info-background',
    'border-feedback-info-border',
    'text-feedback-info-text',
    'text-feedback-info-icon',
  ];

  // Enhanced utility classes for UI/UX readability
  const extraClasses = [
    // Shadows for depth
    'shadow-sm',
    'shadow',
    'shadow-lg',
    'shadow-xl',
    'shadow-subtle',
    'shadow-elevation-1',
    'shadow-elevation-2',
    'shadow-elevation-3',

    // Border radius
    'rounded-xs',
    'rounded-sm',
    'rounded',
    'rounded-md',
    'rounded-lg',
    'rounded-xl',
    'rounded-2xl',

    // Opacity
    'opacity-75',
    'opacity-90',
    'opacity-95',

    // Transitions
    'transition-all-fast',
    'transition-colors',
    'transition-opacity',
    'transition-transform',
    'ease-smooth',

    // Text effects
    'text-shadow-sm',
    'text-shadow',
    'text-shadow-lg',
    'font-smooth',
    'text-balance',
    'text-readable',

    // Resolution-independent text classes
    'text-responsive-xs',
    'text-responsive-sm',
    'text-responsive-base',
    'text-responsive-lg',
    'text-responsive-xl',
    'text-responsive-2xl',
    'text-responsive-3xl',
    'text-resolution-aware',
    'text-hd',
    'min-text-size',
    'text-4k',
    'text-scale-with-screen',

    // Transforms
    'scale-95',
    'scale-98',
    'scale-100',
    'scale-102',
    'scale-105',
    'hover:scale-102',
    'hover:scale-105',
    'focus:scale-102',
    'focus:scale-105',

    // Line heights
    'leading-tighter',
    'leading-relaxed',

    // Font weights for readability
    'font-normal',
    'font-medium',
    'font-semibold',

    // Letter spacing
    'tracking-tight',
    'tracking-normal',
    'tracking-wide',
  ];

  return [
    ...colorClasses,
    ...glassClasses,
    ...scrollbarClasses,
    ...accessibilityClasses,
    ...cursorClasses,
    ...uiBackgroundClasses,
    ...uiBorderClasses,
    ...feedbackClasses,
    ...extraClasses,
  ];
}

// Generate accessible color utilities with improved readability focus
function generateAccessibleTextUtilities() {
  // Determine contrast-optimized text colors for each background context
  const isDarkBrand =
    getContrastRatio(brandPalette[600], grayPalette[50]) >= 4.5;

  // Define background contexts and their accessible text colors using semantic tokens
  const accessibleTextUtilities = {
    // For light backgrounds (use dark text)
    '.text-accessible-light': {
      color: semanticColors.ui.text.primary,
      'font-weight': '450', // Slightly heavier than normal for better readability on light backgrounds
    },

    // For dark backgrounds (use light text)
    '.text-accessible-dark': {
      color: 'white',
      'font-weight': '400', // Normal weight for readability on dark backgrounds
      'letter-spacing': '0.01em', // Slightly increased letter spacing for better readability on dark
    },

    // For brand color backgrounds (dynamically choose based on brand color's brightness)
    '.text-accessible-on-brand': {
      color: isDarkBrand ? 'white' : semanticColors.ui.text.primary,
      'font-weight': isDarkBrand ? '400' : '450', // Adaptive font weight
      'letter-spacing': isDarkBrand ? '0.01em' : 'normal', // Adaptive letter spacing
    },

    // For glass elements (general, assumes darkish background)
    '.text-accessible-on-glass': {
      'color': 'white',
      'text-shadow': `0 1px 3px rgba(${hexToRgb(grayPalette[900])}, 0.6)`, // Stronger text shadow for better readability
      'letter-spacing': '0.01em', // Slightly increased letter spacing
    },

    // For dark backgrounds (e.g., .glass-dark, .glass-brand-dark)
    '.text-on-dark': {
      color: semanticColors.ui.text.inverted,
      'font-weight': '400', // Normal weight
      'letter-spacing': '0.01em', // Slightly increased letter spacing
    },

    // For light backgrounds (e.g., .glass, .glass-brand)
    '.text-on-light': {
      color: semanticColors.ui.text.primary,
      'font-weight': '450', // Slightly heavier than normal
    },

    // For primary UI elements
    '.text-primary': {
      color: semanticColors.ui.text.primary,
      'font-weight': '500', // Medium weight for emphasis
    },

    // For secondary/supporting text
    '.text-secondary': {
      color: semanticColors.ui.text.secondary,
      'font-weight': '400', // Normal weight
    },

    // For tertiary/muted text
    '.text-tertiary': {
      color: semanticColors.ui.text.tertiary,
      'font-weight': '400', // Normal weight
    },

    // For links
    '.text-link': {
      color: semanticColors.ui.text.link,
      'font-weight': '500', // Medium weight for emphasis
      'text-decoration': 'none',
      '&:hover': {
        'text-decoration': 'underline',
      },
    },

    // For error text
    '.text-error': {
      color: semanticColors.ui.text.error,
      'font-weight': '500', // Medium weight for emphasis
    },
  };

  return accessibleTextUtilities;
}

module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx,astro,html}',
    './pages/**/*.{js,jsx,ts,tsx,astro,html}',
    './components/**/*.{js,jsx,ts,tsx,astro,html}',
  ],
  theme: {
    extend: {
      fontSize: generateFontSizes(),
      colors: {
        // Core color palettes
        brand: brandPalette,
        gray: grayPalette,

        // Semantic UI colors
        ui: {
          background: {
            page: semanticColors.ui.background.page,
            card: semanticColors.ui.background.card,
            modal: semanticColors.ui.background.modal,
            input: {
              default: semanticColors.ui.background.input.default,
              disabled: semanticColors.ui.background.input.disabled,
            },
            hover: semanticColors.ui.background.hover,
            selected: semanticColors.ui.background.selected,
            disabled: semanticColors.ui.background.disabled,
          },
          border: {
            default: semanticColors.ui.border.default,
            focus: semanticColors.ui.border.focus,
            hover: semanticColors.ui.border.hover,
            error: semanticColors.ui.border.error,
          },
        },

        // Feedback colors
        feedback: {
          success: {
            background: semanticColors.feedback.success.background,
            border: semanticColors.feedback.success.border,
            text: semanticColors.feedback.success.text,
            icon: semanticColors.feedback.success.icon,
          },
          warning: {
            background: semanticColors.feedback.warning.background,
            border: semanticColors.feedback.warning.border,
            text: semanticColors.feedback.warning.text,
            icon: semanticColors.feedback.warning.icon,
          },
          error: {
            background: semanticColors.feedback.error.background,
            border: semanticColors.feedback.error.border,
            text: semanticColors.feedback.error.text,
            icon: semanticColors.feedback.error.icon,
          },
          info: {
            background: semanticColors.feedback.info.background,
            border: semanticColors.feedback.info.border,
            text: semanticColors.feedback.info.text,
            icon: semanticColors.feedback.info.icon,
          },
        },
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
      // Add semantic text colors
      textColor: {
        'primary': semanticColors.ui.text.primary,
        'secondary': semanticColors.ui.text.secondary,
        'tertiary': semanticColors.ui.text.tertiary,
        'inverted': semanticColors.ui.text.inverted,
        'link': semanticColors.ui.text.link,
        'error': semanticColors.ui.text.error,
        'disabled': semanticColors.ui.text.disabled,
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
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),

    // Merged plugin for glass morphism effects with scrollbars
    function ({ addUtilities }) {
      addUtilities(generateMergedGlassClasses(), ['responsive', 'hover']);
    },

    // Global scrollbar styles - FiveM/CEF fix
    function ({ addBase, addUtilities }) {
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
        // Direct global scrollbar styles that generally work better in CEF environments
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

    // New plugin for accessible text utilities
    function ({ addUtilities }) {
      addUtilities(generateAccessibleTextUtilities());
    },

    // Enhanced typography and readability utilities
    function ({ addUtilities }) {
      addUtilities({
        // Resolution-independent text sizing utilities with larger sizes for 4K/extra large screens
        '.text-responsive-xs': {
          'font-size': 'clamp(0.75rem, 0.7rem + 0.25vw, 1rem)',
          'line-height': 'clamp(1.3rem, 1.2rem + 0.5vw, 1.6rem)',
          '@media (min-width: 2560px)': {
            // 4K screens
            'font-size': 'clamp(0.875rem, 0.8rem + 0.3vw, 1.125rem)',
            'line-height': 'clamp(1.4rem, 1.3rem + 0.5vw, 1.7rem)',
          },
        },
        '.text-responsive-sm': {
          'font-size': 'clamp(0.875rem, 0.8rem + 0.375vw, 1.125rem)',
          'line-height': 'clamp(1.5rem, 1.4rem + 0.5vw, 1.8rem)',
          '@media (min-width: 2560px)': {
            // 4K screens
            'font-size': 'clamp(1rem, 0.9rem + 0.4vw, 1.25rem)',
            'line-height': 'clamp(1.6rem, 1.5rem + 0.5vw, 1.9rem)',
          },
        },
        '.text-responsive-base': {
          'font-size': 'clamp(1rem, 0.9rem + 0.5vw, 1.25rem)',
          'line-height': 'clamp(1.65rem, 1.5rem + 0.75vw, 2rem)',
          '@media (min-width: 2560px)': {
            // 4K screens
            'font-size': 'clamp(1.125rem, 1rem + 0.6vw, 1.5rem)',
            'line-height': 'clamp(1.75rem, 1.6rem + 0.75vw, 2.1rem)',
          },
        },
        '.text-responsive-lg': {
          'font-size': 'clamp(1.125rem, 1rem + 0.625vw, 1.375rem)',
          'line-height': 'clamp(1.6rem, 1.5rem + 0.5vw, 1.9rem)',
          '@media (min-width: 2560px)': {
            // 4K screens
            'font-size': 'clamp(1.25rem, 1.1rem + 0.7vw, 1.75rem)',
            'line-height': 'clamp(1.7rem, 1.6rem + 0.5vw, 2rem)',
          },
        },
        '.text-responsive-xl': {
          'font-size': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.625rem)',
          'line-height': 'clamp(1.55rem, 1.4rem + 0.75vw, 1.85rem)',
          '@media (min-width: 2560px)': {
            // 4K screens
            'font-size': 'clamp(1.5rem, 1.3rem + 0.8vw, 2rem)',
            'line-height': 'clamp(1.65rem, 1.5rem + 0.75vw, 2rem)',
          },
        },
        '.text-responsive-2xl': {
          'font-size': 'clamp(1.5rem, 1.3rem + 1vw, 2rem)',
          'line-height': 'clamp(1.4rem, 1.3rem + 0.5vw, 1.6rem)',
          '@media (min-width: 2560px)': {
            // 4K screens
            'font-size': 'clamp(1.875rem, 1.6rem + 1.1vw, 2.5rem)',
            'line-height': 'clamp(1.5rem, 1.4rem + 0.5vw, 1.7rem)',
          },
        },
        '.text-responsive-3xl': {
          'font-size': 'clamp(1.875rem, 1.6rem + 1.375vw, 2.5rem)',
          'line-height': 'clamp(1.3rem, 1.2rem + 0.5vw, 1.5rem)',
          '@media (min-width: 2560px)': {
            // 4K screens
            'font-size': 'clamp(2.25rem, 2rem + 1.5vw, 3rem)',
            'line-height': 'clamp(1.4rem, 1.3rem + 0.5vw, 1.6rem)',
          },
        },

        // Resolution-aware text utilities
        '.text-resolution-aware': {
          'font-size': 'clamp(1rem, 0.9rem + 0.5vmin, 1.2rem)',
          'line-height': '1.65',
          'letter-spacing': '0.01em',
          '@media (min-resolution: 2dppx)': {
            'font-weight': '450', // Slightly bolder on high-DPI displays
          },
          '@media (min-width: 2560px)': {
            // 4K screens
            'font-size': 'clamp(1.125rem, 1rem + 0.6vmin, 1.5rem)',
            'line-height': '1.7',
          },
        },

        // Large screen text utility - applies to all text for 4K displays
        '.text-4k': {
          '@media (min-width: 2560px)': {
            'font-size': '120%', // 20% larger on 4K screens
            'letter-spacing': '0.01em',
          },
        },

        // Global text scaling utility for the entire app
        '.text-scale-with-screen': {
          'font-size': 'clamp(1rem, 0.9rem + 0.5vw, 1.25rem)',
          '@media (min-width: 1920px)': {
            // Full HD and above
            'font-size': 'clamp(1.1rem, 1rem + 0.5vw, 1.35rem)',
          },
          '@media (min-width: 2560px)': {
            // 4K screens
            'font-size': 'clamp(1.2rem, 1.1rem + 0.6vw, 1.5rem)',
          },
          '@media (min-width: 3840px)': {
            // 8K screens
            'font-size': 'clamp(1.3rem, 1.2rem + 0.7vw, 1.75rem)',
          },
        },

        // Viewport-based text sizing with minimum and maximum constraints
        '.min-text-size': {
          'font-size': 'max(1rem, min(1.6vw, 1.25rem))', // Optimized for readability with upper bound
          '@media (min-width: 2560px)': {
            // 4K and above
            'font-size': 'max(1.1rem, min(1vw, 1.4rem))', // Adjusted for 4K
          },
        },

        // High-DPI screen optimizations
        '.text-hd': {
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
          'font-feature-settings': '"kern" 1, "liga" 1',
          '@media (min-resolution: 2dppx)': {
            'letter-spacing': '0.01em', // Slightly increased for 4K
          },
        },

        // Existing utilities
        '.text-shadow-sm': {
          'text-shadow': `0 1px 2px rgba(${hexToRgb(grayPalette[900])}, 0.15)`, // Using theme colors for consistency
        },
        '.text-shadow': {
          'text-shadow': `0 2px 4px rgba(${hexToRgb(grayPalette[900])}, 0.15)`, // Using theme colors for consistency
        },
        '.text-shadow-lg': {
          'text-shadow': `0 4px 6px rgba(${hexToRgb(grayPalette[900])}, 0.2)`, // Using theme colors for consistency
        },
        '.transition-all-fast': {
          'transition': 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)', // Slightly smoother easing
        },
        '.font-smooth': {
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
        },
        '.text-balance': {
          'text-wrap': 'balance', // Modern text balancing for better typography
        },
        '.text-readable': {
          'max-width': '70ch', // Optimal line length for readability
          'word-spacing': '0.05em', // Slightly increased word spacing
        },
      });
    },
  ],
  // Generate safelist for all color palettes
  safelist: generateSafelist(),
};
