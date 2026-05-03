import { config } from '../config/appConfig';

// Define interfaces for color palettes to avoid circular dependency in types
interface ColorPalette {
  [shade: number]: string;
}

interface ColorPalettes {
  [colorName: string]: ColorPalette;
}

interface GrayPalettes {
  [colorName: string]: ColorPalette;
}

// Generate safelist for colors and other dynamic classes
function generateSafelist(
  colorPalettes: ColorPalettes,
  grayPalettes: GrayPalettes
): string[] {
  const colorShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const colorModifiers = [
    'bg',
    'text',
    'hover:bg',
    'hover:text',
    'focus:bg',
    'focus:text',
    'border',
    'hover:border',
  ];

  // Trim to the active palettes only. Previously the safelist iterated
  // every Tailwind color (~25 palettes), generating ~2200 utility classes
  // that no plugin actually used; trimming to `config.brandColor` and
  // `config.grayColor` cuts the emitted CSS roughly in half. If a plugin
  // ever needs another palette it should be added to `appConfig` and
  // referenced here, not silently included via the unused-color firehose.
  const activeBrand = config.brandColor;
  const activeGray = config.grayColor;
  const activeColors = colorPalettes[activeBrand] ? [activeBrand] : [];
  const activeGrays = grayPalettes[activeGray] ? [activeGray] : [];

  const generatedColorClasses = activeColors.flatMap((color) =>
    colorShades.flatMap((shade) =>
      colorModifiers.map((modifier) => `${modifier}-${color}-${shade}`)
    )
  );

  const generatedGrayClasses = activeGrays.flatMap((color) =>
    colorShades.flatMap((shade) =>
      colorModifiers.map((modifier) => `${modifier}-${color}-${shade}`)
    )
  );

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

  const scrollbarClasses = [
    'scrollbar-light',
    'scrollbar-dark',
    'scrollbar-brand',
    'scrollbar-brand-dark',
  ];

  const accessibilityClasses = [
    'text-accessible-light',
    'text-accessible-dark',
    'text-accessible-on-brand',
    'text-accessible-on-glass',
    'text-on-dark',
    'text-on-light',
  ];

  const cursorClasses = [
    'cursor-pointer',
    'cursor-default',
    'cursor-wait',
    'cursor-text',
    'cursor-move',
    'cursor-not-allowed',
  ];

  const staticUtilityClasses = [
    'shadow-sm',
    'shadow',
    'shadow-lg',
    'shadow-xl',
    'shadow-subtle',
    'shadow-elevation-1',
    'shadow-elevation-2',
    'shadow-elevation-3',
    'rounded-xs',
    'rounded-sm',
    'rounded',
    'rounded-md',
    'rounded-lg',
    'rounded-xl',
    'rounded-2xl',
    'opacity-75',
    'opacity-90',
    'opacity-95',
    'transition-all-fast',
    'transition-colors',
    'transition-opacity',
    'transition-transform',
    'ease-smooth',
    'text-shadow-sm',
    'text-shadow',
    'text-shadow-lg',
    'font-smooth',
    'text-balance',
    'text-readable',
    'scale-95',
    'scale-98',
    'scale-100',
    'scale-102',
    'scale-105',
    'hover:scale-102',
    'hover:scale-105',
    'focus:scale-102',
    'focus:scale-105',
    'leading-tighter',
    'leading-relaxed',
    'font-normal',
    'font-medium',
    'font-semibold',
    'tracking-tight',
    'tracking-normal',
    'tracking-wide',
    // Justification utilities — kept safelisted because some plugins
    // build the className string at runtime (e.g. via cva variants
    // resolved per-plugin) and Tailwind can't statically detect them.
    'justify-start',
    'justify-end',
    'justify-center',
  ];

  return [
    ...generatedColorClasses,
    ...generatedGrayClasses,
    ...glassClasses,
    ...scrollbarClasses,
    ...accessibilityClasses,
    ...cursorClasses,
    ...staticUtilityClasses,
  ];
}

export { generateSafelist };
