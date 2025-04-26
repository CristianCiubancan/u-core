/**
 * Typography configuration for Tailwind CSS
 * Handles font sizes, line heights, and responsive typography
 */

/**
 * Generate font size configuration with optimized readability
 * @param {number} fontSizeMultiplier - Multiplier to adjust base font sizes
 * @returns {Object} Font size configuration for Tailwind
 */
function generateFontSizes(fontSizeMultiplier = 1.15) {
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

/**
 * Generates responsive typography utility classes
 * @returns {Object} Tailwind utility classes for responsive typography
 */
function generateResponsiveTypography() {
  return {
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

    // Additional typography utilities
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
    '.text-4k': {
      '@media (min-width: 2560px)': {
        'font-size': '120%', // 20% larger on 4K screens
        'letter-spacing': '0.01em',
      },
    },
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
    '.min-text-size': {
      'font-size': 'max(1rem, min(1.6vw, 1.25rem))', // Optimized for readability with upper bound
      '@media (min-width: 2560px)': {
        // 4K and above
        'font-size': 'max(1.1rem, min(1vw, 1.4rem))', // Adjusted for 4K
      },
    },
    '.text-hd': {
      '-webkit-font-smoothing': 'antialiased',
      '-moz-osx-font-smoothing': 'grayscale',
      'font-feature-settings': '"kern" 1, "liga" 1',
      '@media (min-resolution: 2dppx)': {
        'letter-spacing': '0.01em', // Slightly increased for 4K
      },
    },
    '.text-shadow-sm': {
      'text-shadow': '0 1px 2px rgba(0, 0, 0, 0.15)',
    },
    '.text-shadow': {
      'text-shadow': '0 2px 4px rgba(0, 0, 0, 0.15)',
    },
    '.text-shadow-lg': {
      'text-shadow': '0 4px 6px rgba(0, 0, 0, 0.2)',
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
  };
}

module.exports = {
  generateFontSizes,
  generateResponsiveTypography,
};
