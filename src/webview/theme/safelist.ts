/**
 * Safelist configuration for Tailwind CSS
 * Ensures critical classes are not purged during production builds
 */
import { colorPalettes, grayPalettes } from '../colors';

/**
 * Generate safelist for Tailwind CSS
 * @returns {Array} Array of class names to preserve in production
 */
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

export default generateSafelist();
