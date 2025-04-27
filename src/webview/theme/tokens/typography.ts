// src/theme/tokens/typography.ts

// Font family tokens
export const fontFamily = {
  sans: [
    'Inter var',
    'Inter',
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    'sans-serif',
  ],
  serif: ['ui-serif', 'Georgia', 'Cambria', 'serif'],
  mono: [
    'Fira Code',
    'ui-monospace',
    'SFMono-Regular',
    'Menlo',
    'Monaco',
    'monospace',
  ],
  display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
};

// Font size scale with consistent progression
export const fontSize = {
  '2xs': ['0.625rem', { lineHeight: '1rem' }], // 10px
  'xs': ['0.75rem', { lineHeight: '1rem' }], // 12px
  'sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px
  'base': ['1rem', { lineHeight: '1.5rem' }], // 16px
  'lg': ['1.125rem', { lineHeight: '1.75rem' }], // 18px
  'xl': ['1.25rem', { lineHeight: '1.75rem' }], // 20px
  '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
  '5xl': ['3rem', { lineHeight: '1.16' }], // 48px
  '6xl': ['3.75rem', { lineHeight: '1.08' }], // 60px
  '7xl': ['4.5rem', { lineHeight: '1.05' }], // 72px
  '8xl': ['6rem', { lineHeight: '1' }], // 96px
  '9xl': ['8rem', { lineHeight: '1' }], // 128px
};

// Font weight tokens
export const fontWeight = {
  thin: '100',
  extralight: '200',
  light: '300',
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
};

// Letter spacing tokens
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0em',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
};

// Line height tokens
export const lineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
  // Absolute values for precise control
  '3': '.75rem',
  '4': '1rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '7': '1.75rem',
  '8': '2rem',
  '9': '2.25rem',
  '10': '2.5rem',
};

// Text style presets for reusable combinations
export const textStyles = {
  // Heading styles
  h1: {
    fontSize: fontSize['5xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    lineHeight: lineHeight.tight,
  },
  h2: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tight,
    lineHeight: lineHeight.tight,
  },
  h3: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.tight,
    lineHeight: lineHeight.tight,
  },
  h4: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.tight,
    lineHeight: lineHeight.tight,
  },
  h5: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.tight,
    lineHeight: lineHeight.tight,
  },
  h6: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.tight,
    lineHeight: lineHeight.normal,
  },

  // Body text styles
  bodyLarge: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.normal,
    letterSpacing: letterSpacing.normal,
    lineHeight: lineHeight.relaxed,
  },
  bodyBase: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    letterSpacing: letterSpacing.normal,
    lineHeight: lineHeight.relaxed,
  },
  bodySmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    letterSpacing: letterSpacing.normal,
    lineHeight: lineHeight.relaxed,
  },

  // UI element text styles
  button: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.wide,
    lineHeight: lineHeight.none,
  },
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    letterSpacing: letterSpacing.wide,
    lineHeight: lineHeight.normal,
  },
  overline: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.widest,
    lineHeight: lineHeight.normal,
    textTransform: 'uppercase',
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    letterSpacing: letterSpacing.normal,
    lineHeight: lineHeight.none,
  },
  code: {
    fontFamily: fontFamily.mono,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    letterSpacing: letterSpacing.normal,
    lineHeight: lineHeight.normal,
  },
};

// Responsive typography generator
export function generateResponsiveTypography() {
  return {
    // Generate fluid typography utilities
    '.text-fluid-xs': {
      'fontSize': 'clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)',
      'lineHeight': '1.5',
    },
    '.text-fluid-sm': {
      'fontSize': 'clamp(0.875rem, 0.8rem + 0.375vw, 1rem)',
      'lineHeight': '1.5',
    },
    '.text-fluid-base': {
      'fontSize': 'clamp(1rem, 0.9rem + 0.5vw, 1.125rem)',
      'lineHeight': '1.5',
    },
    '.text-fluid-lg': {
      'fontSize': 'clamp(1.125rem, 1rem + 0.625vw, 1.25rem)',
      'lineHeight': '1.5',
    },
    '.text-fluid-xl': {
      'fontSize': 'clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)',
      'lineHeight': '1.4',
    },
    '.text-fluid-2xl': {
      'fontSize': 'clamp(1.5rem, 1.3rem + 1vw, 1.875rem)',
      'lineHeight': '1.3',
    },
    '.text-fluid-3xl': {
      'fontSize': 'clamp(1.875rem, 1.6rem + 1.375vw, 2.25rem)',
      'lineHeight': '1.2',
    },
    '.text-fluid-4xl': {
      'fontSize': 'clamp(2.25rem, 1.9rem + 1.75vw, 3rem)',
      'lineHeight': '1.1',
    },
    '.text-fluid-5xl': {
      'fontSize': 'clamp(3rem, 2.5rem + 2.5vw, 4rem)',
      'lineHeight': '1',
    },

    // Utilities for high-resolution displays
    '.text-hd': {
      '-webkit-font-smoothing': 'antialiased',
      '-moz-osx-font-smoothing': 'grayscale',
      'font-feature-settings': '"kern" 1, "liga" 1, "calt" 1',
    },

    // Utilities for maximum readability
    '.text-readable': {
      'max-width': '70ch',
      'word-spacing': '0.05em',
      'hyphens': 'auto',
    },

    // Modern CSS properties for typography
    '.text-balance': {
      'text-wrap': 'balance',
    },
    '.text-pretty': {
      'text-wrap': 'pretty',
    },
  };
}
