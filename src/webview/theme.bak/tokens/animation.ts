// src/webview/theme/tokens/animation.ts

/**
 * Animation tokens for consistent motion design
 */
export const animation = {
  // Transition properties
  transitionProperty: {
    none: 'none',
    all: 'all',
    DEFAULT: 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform',
    colors: 'background-color, border-color, color, fill, stroke',
    opacity: 'opacity',
    shadow: 'box-shadow',
    transform: 'transform',
  },
  
  // Timing functions
  transitionTimingFunction: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
    
    // Custom easing functions
    'bounce': 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    'smooth': 'cubic-bezier(0.645, 0.045, 0.355, 1.000)',
  },
  
  // Duration values
  transitionDuration: {
    DEFAULT: '150ms',
    75: '75ms',
    100: '100ms',
    150: '150ms',
    200: '200ms',
    300: '300ms',
    500: '500ms',
    700: '700ms',
    1000: '1000ms',
  },
};
