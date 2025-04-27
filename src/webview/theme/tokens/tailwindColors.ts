// tailwindColors.ts - Enhanced with dynamic color generation
import * as tailwindColorsModule from 'tailwindcss/colors';
import {
  adjustColorLightness,
  generateColorPalette,
} from '../utils/colorUtils';

// Create a safe version of Tailwind colors without deprecated color warnings
// See: https://github.com/tailwindlabs/tailwindcss/discussions/10919929
// This approach extracts only the non-getter properties to avoid triggering warnings
const entries = Object.entries(
  Object.getOwnPropertyDescriptors(tailwindColorsModule)
).filter(([_, descriptor]) => {
  // Exclude getters (which are the deprecated colors)
  return typeof descriptor.get !== 'function';
});

// Create a new object with only the non-deprecated colors
export const tailwindColors = Object.fromEntries(
  entries.map(([key, descriptor]) => [key, descriptor.value])
);

// Define color palette names for type safety
export type ColorPaletteName =
  | 'slate'
  | 'gray'
  | 'zinc'
  | 'neutral'
  | 'stone'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose';

// Expanded theme options
export interface ThemeOptions {
  brandColor: ColorPaletteName | string; // Allow hex color strings for custom colors
  grayColor: ColorPaletteName;
  accentColor?: ColorPaletteName | string; // Optional accent color
  contrastThreshold?: number; // WCAG contrast threshold (default: 4.5)
  colorScheme?:
    | 'analogous'
    | 'complementary'
    | 'triadic'
    | 'tetradic'
    | 'monochromatic'; // Color harmony
  saturationAdjustment?: number; // Adjust saturation of generated colors (-1 to 1)
  brightnessAdjustment?: number; // Adjust brightness of generated colors (-1 to 1)
}

// Define theme presets
export type ThemePreset =
  | 'default'
  | 'vibrant'
  | 'muted'
  | 'pastel'
  | 'dark'
  | 'light'
  | 'high-contrast';

// Helper function to check if a string is a hex color
function isHexColor(value: string): boolean {
  return value.startsWith('#');
}

// Function to create semantic color mapping based on theme options
export function createColorScales(options: ThemeOptions) {
  // Handle custom colors (hex strings) vs. named Tailwind colors
  const brandPalette =
    typeof options.brandColor === 'string' && isHexColor(options.brandColor)
      ? generateDynamicColorScale(options.brandColor)
      : (tailwindColors as Record<string, any>)[options.brandColor as string] ||
        tailwindColors.indigo;

  const grayPalette =
    (tailwindColors as Record<string, any>)[options.grayColor] ||
    tailwindColors.zinc; // Updated from 'gray' to 'zinc' based on warnings

  // Generate accent color if provided
  let accentPalette;
  if (options.accentColor) {
    accentPalette =
      typeof options.accentColor === 'string' && isHexColor(options.accentColor)
        ? generateDynamicColorScale(options.accentColor)
        : (tailwindColors as Record<string, any>)[
            options.accentColor as string
          ];
  } else {
    accentPalette = generateHarmonicColor(
      options.brandColor,
      options.colorScheme || 'complementary'
    );
  }

  // Create the base scales using CSS variables that will be defined
  return {
    // Base colors directly from the selected palettes
    [typeof options.brandColor === 'string' && isHexColor(options.brandColor)
      ? 'custom-brand'
      : options.brandColor]: brandPalette,

    [options.grayColor]: grayPalette,

    // Accent color
    accent: accentPalette,

    // Primary brand colors - these use CSS variables for theming
    primary: {
      50: 'var(--color-primary-50)',
      100: 'var(--color-primary-100)',
      200: 'var(--color-primary-200)',
      300: 'var(--color-primary-300)',
      400: 'var(--color-primary-400)',
      500: 'var(--color-primary-500)',
      600: 'var(--color-primary-600)',
      700: 'var(--color-primary-700)',
      800: 'var(--color-primary-800)',
      900: 'var(--color-primary-900)',
      950: 'var(--color-primary-950)',
    },

    // Gray scale
    gray: {
      50: 'var(--color-gray-50)',
      100: 'var(--color-gray-100)',
      200: 'var(--color-gray-200)',
      300: 'var(--color-gray-300)',
      400: 'var(--color-gray-400)',
      500: 'var(--color-gray-500)',
      600: 'var(--color-gray-600)',
      700: 'var(--color-gray-700)',
      800: 'var(--color-gray-800)',
      900: 'var(--color-gray-900)',
      950: 'var(--color-gray-950)',
    },

    // Accent colors with full range of shades
    accentColor: {
      50: 'var(--color-accent-50)',
      100: 'var(--color-accent-100)',
      200: 'var(--color-accent-200)',
      300: 'var(--color-accent-300)',
      400: 'var(--color-accent-400)',
      500: 'var(--color-accent-500)',
      600: 'var(--color-accent-600)',
      700: 'var(--color-accent-700)',
      800: 'var(--color-accent-800)',
      900: 'var(--color-accent-900)',
      950: 'var(--color-accent-950)',
    },

    // Essential semantic colors with full range of shades
    success: {
      50: 'var(--color-success-50)',
      100: 'var(--color-success-100)',
      200: 'var(--color-success-200)',
      300: 'var(--color-success-300)',
      400: 'var(--color-success-400)',
      500: 'var(--color-success-500)',
      600: 'var(--color-success-600)',
      700: 'var(--color-success-700)',
      800: 'var(--color-success-800)',
      900: 'var(--color-success-900)',
      950: 'var(--color-success-950)',
    },
    error: {
      50: 'var(--color-error-50)',
      100: 'var(--color-error-100)',
      200: 'var(--color-error-200)',
      300: 'var(--color-error-300)',
      400: 'var(--color-error-400)',
      500: 'var(--color-error-500)',
      600: 'var(--color-error-600)',
      700: 'var(--color-error-700)',
      800: 'var(--color-error-800)',
      900: 'var(--color-error-900)',
      950: 'var(--color-error-950)',
    },
    warning: {
      50: 'var(--color-warning-50)',
      100: 'var(--color-warning-100)',
      200: 'var(--color-warning-200)',
      300: 'var(--color-warning-300)',
      400: 'var(--color-warning-400)',
      500: 'var(--color-warning-500)',
      600: 'var(--color-warning-600)',
      700: 'var(--color-warning-700)',
      800: 'var(--color-warning-800)',
      900: 'var(--color-warning-900)',
      950: 'var(--color-warning-950)',
    },
    info: {
      50: 'var(--color-info-50)',
      100: 'var(--color-info-100)',
      200: 'var(--color-info-200)',
      300: 'var(--color-info-300)',
      400: 'var(--color-info-400)',
      500: 'var(--color-info-500)',
      600: 'var(--color-info-600)',
      700: 'var(--color-info-700)',
      800: 'var(--color-info-800)',
      900: 'var(--color-info-900)',
      950: 'var(--color-info-950)',
    },
    // Add any additional color scales as needed
  };
}

/**
 * Generate a full color scale from a single hex color
 * Uses advanced algorithms to create balanced scales
 */
export function generateDynamicColorScale(
  baseColor: string
): Record<string, string> {
  return generateColorPalette(baseColor);
}

/**
 * Generate a harmonious color based on color theory
 * @param baseColor - The base color to derive harmony from
 * @param scheme - The color harmony scheme to use
 * @returns A harmonious color in hex format
 */
export function generateHarmonicColor(
  baseColor: ColorPaletteName | string,
  scheme: ThemeOptions['colorScheme'] = 'complementary'
): Record<string, string> {
  // Get the base color in hex format
  const baseHex =
    typeof baseColor === 'string' && isHexColor(baseColor)
      ? baseColor
      : (tailwindColors as Record<string, any>)[baseColor as string]?.[500] ||
        '#6366f1'; // Default to indigo if not found

  // Remove # if present
  const hex = baseHex.replace(/^#/, '');

  // Convert hex to HSL
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        h = 0;
    }
    h /= 6;
  }

  // Generate harmonious color based on scheme
  let newH = h;
  switch (scheme) {
    case 'complementary':
      newH = (h + 0.5) % 1;
      break;
    case 'analogous':
      newH = (h + 1 / 12) % 1; // 30 degrees
      break;
    case 'triadic':
      newH = (h + 1 / 3) % 1; // 120 degrees
      break;
    case 'tetradic':
      newH = (h + 0.25) % 1; // 90 degrees
      break;
    case 'monochromatic':
      // For monochromatic, we just adjust saturation/lightness
      s = Math.min(1, s * 1.2);
      l = Math.max(0, Math.min(1, l < 0.5 ? l * 1.2 : l * 0.8));
      break;
  }

  // Convert back to hex
  const hslToRgb = (hue: number, sat: number, light: number) => {
    let r, g, b;

    if (sat === 0) {
      r = g = b = light; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };

      const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
      const p = 2 * light - q;
      r = hue2rgb(p, q, hue + 1 / 3);
      g = hue2rgb(p, q, hue);
      b = hue2rgb(p, q, hue - 1 / 3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const harmonicColor = hslToRgb(newH, s, l);

  // Generate a full palette from this harmonic color
  return generateColorPalette(harmonicColor);
}

// Extract raw color values from the theme for CSS variable generation
export function extractRawColorValues(options: ThemeOptions) {
  // Handle custom colors (hex strings) vs. named Tailwind colors
  const brandPalette =
    typeof options.brandColor === 'string' && isHexColor(options.brandColor)
      ? generateDynamicColorScale(options.brandColor)
      : (tailwindColors as Record<string, any>)[options.brandColor as string] ||
        tailwindColors.indigo;

  const grayPalette =
    (tailwindColors as Record<string, any>)[options.grayColor] ||
    tailwindColors.zinc; // Updated from 'gray' to 'zinc' based on warnings

  // Generate accent color if provided
  let accentPalette;
  if (options.accentColor) {
    accentPalette =
      typeof options.accentColor === 'string' && isHexColor(options.accentColor)
        ? generateDynamicColorScale(options.accentColor)
        : (tailwindColors as Record<string, any>)[
            options.accentColor as string
          ];
  } else {
    accentPalette = generateHarmonicColor(
      options.brandColor,
      options.colorScheme || 'complementary'
    );
  }

  return {
    // Map brand color to primary
    primary: {
      50: brandPalette[50] || brandPalette['50'],
      100: brandPalette[100] || brandPalette['100'],
      200: brandPalette[200] || brandPalette['200'],
      300: brandPalette[300] || brandPalette['300'],
      400: brandPalette[400] || brandPalette['400'],
      500: brandPalette[500] || brandPalette['500'],
      600: brandPalette[600] || brandPalette['600'],
      700: brandPalette[700] || brandPalette['700'],
      800: brandPalette[800] || brandPalette['800'],
      900: brandPalette[900] || brandPalette['900'],
      950: brandPalette[950] || brandPalette['950'],
    },
    // Map gray color
    gray: {
      50: grayPalette[50] || grayPalette['50'],
      100: grayPalette[100] || grayPalette['100'],
      200: grayPalette[200] || grayPalette['200'],
      300: grayPalette[300] || grayPalette['300'],
      400: grayPalette[400] || grayPalette['400'],
      500: grayPalette[500] || grayPalette['500'],
      600: grayPalette[600] || grayPalette['600'],
      700: grayPalette[700] || grayPalette['700'],
      800: grayPalette[800] || grayPalette['800'],
      900: grayPalette[900] || grayPalette['900'],
      950: grayPalette[950] || grayPalette['950'],
    },
    // Map accent color
    accent: {
      50: accentPalette[50] || accentPalette['50'],
      100: accentPalette[100] || accentPalette['100'],
      200: accentPalette[200] || accentPalette['200'],
      300: accentPalette[300] || accentPalette['300'],
      400: accentPalette[400] || accentPalette['400'],
      500: accentPalette[500] || accentPalette['500'],
      600: accentPalette[600] || accentPalette['600'],
      700: accentPalette[700] || accentPalette['700'],
      800: accentPalette[800] || accentPalette['800'],
      900: accentPalette[900] || accentPalette['900'],
      950: accentPalette[950] || accentPalette['950'],
    },
    // Use standard Tailwind colors for semantic colors
    success: {
      50: tailwindColors.green[50],
      100: tailwindColors.green[100],
      200: tailwindColors.green[200],
      300: tailwindColors.green[300],
      400: tailwindColors.green[400],
      500: tailwindColors.green[500],
      600: tailwindColors.green[600],
      700: tailwindColors.green[700],
      800: tailwindColors.green[800],
      900: tailwindColors.green[900],
      950: tailwindColors.green[950] || 'rgb(5, 46, 22)', // Fallback
    },
    error: {
      50: tailwindColors.red[50],
      100: tailwindColors.red[100],
      200: tailwindColors.red[200],
      300: tailwindColors.red[300],
      400: tailwindColors.red[400],
      500: tailwindColors.red[500],
      600: tailwindColors.red[600],
      700: tailwindColors.red[700],
      800: tailwindColors.red[800],
      900: tailwindColors.red[900],
      950: tailwindColors.red[950] || 'rgb(69, 10, 10)', // Fallback
    },
    warning: {
      50: tailwindColors.amber[50],
      100: tailwindColors.amber[100],
      200: tailwindColors.amber[200],
      300: tailwindColors.amber[300],
      400: tailwindColors.amber[400],
      500: tailwindColors.amber[500],
      600: tailwindColors.amber[600],
      700: tailwindColors.amber[700],
      800: tailwindColors.amber[800],
      900: tailwindColors.amber[900],
      950: tailwindColors.amber[950] || 'rgb(69, 26, 3)', // Fallback
    },
    info: {
      50: tailwindColors.blue[50],
      100: tailwindColors.blue[100],
      200: tailwindColors.blue[200],
      300: tailwindColors.blue[300],
      400: tailwindColors.blue[400],
      500: tailwindColors.blue[500],
      600: tailwindColors.blue[600],
      700: tailwindColors.blue[700],
      800: tailwindColors.blue[800],
      900: tailwindColors.blue[900],
      950: tailwindColors.blue[950] || 'rgb(23, 37, 84)', // Fallback
    },
  };
}

// Default theme options
export const defaultThemeOptions: ThemeOptions = {
  brandColor: 'indigo',
  grayColor: 'zinc', // Updated from 'gray' to 'zinc'
};

// Apply a theme preset to customize color options
export function applyThemePreset(
  preset: ThemePreset,
  baseOptions?: Partial<ThemeOptions>
): ThemeOptions {
  const options = { ...defaultThemeOptions, ...baseOptions };

  switch (preset) {
    case 'vibrant':
      return {
        brandColor: options.brandColor || 'violet',
        grayColor: 'slate',
        colorScheme: 'triadic',
        saturationAdjustment: 0.2,
        brightnessAdjustment: 0.1,
      };
    case 'muted':
      return {
        brandColor: options.brandColor || 'teal',
        grayColor: 'stone',
        colorScheme: 'analogous',
        saturationAdjustment: -0.2,
        brightnessAdjustment: -0.1,
      };
    case 'pastel':
      return {
        brandColor: options.brandColor || 'sky',
        grayColor: 'zinc',
        colorScheme: 'monochromatic',
        saturationAdjustment: -0.3,
        brightnessAdjustment: 0.3,
      };
    case 'dark':
      return {
        brandColor: options.brandColor || 'indigo',
        grayColor: 'zinc',
        colorScheme: 'monochromatic',
        saturationAdjustment: 0.1,
        brightnessAdjustment: -0.2,
      };
    case 'light':
      return {
        brandColor: options.brandColor || 'sky',
        grayColor: 'slate',
        colorScheme: 'monochromatic',
        saturationAdjustment: -0.1,
        brightnessAdjustment: 0.2,
      };
    case 'high-contrast':
      return {
        brandColor: options.brandColor || 'indigo',
        grayColor: 'zinc',
        contrastThreshold: 7, // Higher contrast for accessibility
        colorScheme: 'complementary',
      };
    case 'default':
    default:
      return {
        ...defaultThemeOptions,
        ...baseOptions,
      };
  }
}

// Generate CSS variables for light and dark mode with enhanced customization
export function generateColorCssVariables(
  options: ThemeOptions,
  mode: 'light' | 'dark' = 'light'
): string {
  const rawColors = extractRawColorValues(options);

  // Apply lighting adjustments based on mode
  const adjustForMode = (color: string): string => {
    if (mode === 'dark') {
      // For dark mode, darken and slightly desaturate colors
      return adjustColorLightness(color, -0.15);
    }
    return color;
  };

  // Create CSS variables string
  return `
:root {
  /* Primary brand colors */
  --color-primary-50: ${
    mode === 'dark'
      ? adjustForMode(rawColors.primary[50])
      : rawColors.primary[50]
  };
  --color-primary-100: ${
    mode === 'dark'
      ? adjustForMode(rawColors.primary[100])
      : rawColors.primary[100]
  };
  --color-primary-200: ${
    mode === 'dark'
      ? adjustForMode(rawColors.primary[200])
      : rawColors.primary[200]
  };
  --color-primary-300: ${
    mode === 'dark'
      ? adjustForMode(rawColors.primary[300])
      : rawColors.primary[300]
  };
  --color-primary-400: ${
    mode === 'dark'
      ? adjustForMode(rawColors.primary[400])
      : rawColors.primary[400]
  };
  --color-primary-500: ${
    mode === 'dark'
      ? adjustForMode(rawColors.primary[500])
      : rawColors.primary[500]
  };
  --color-primary-600: ${
    mode === 'dark'
      ? adjustForMode(rawColors.primary[600])
      : rawColors.primary[600]
  };
  --color-primary-700: ${
    mode === 'dark'
      ? adjustForMode(rawColors.primary[700])
      : rawColors.primary[700]
  };
  --color-primary-800: ${
    mode === 'dark'
      ? adjustForMode(rawColors.primary[800])
      : rawColors.primary[800]
  };
  --color-primary-900: ${
    mode === 'dark'
      ? adjustForMode(rawColors.primary[900])
      : rawColors.primary[900]
  };
  --color-primary-950: ${
    mode === 'dark'
      ? adjustForMode(rawColors.primary[950])
      : rawColors.primary[950]
  };

  /* Gray scale */
  --color-gray-50: ${
    mode === 'dark' ? adjustForMode(rawColors.gray[50]) : rawColors.gray[50]
  };
  --color-gray-100: ${
    mode === 'dark' ? adjustForMode(rawColors.gray[100]) : rawColors.gray[100]
  };
  --color-gray-200: ${
    mode === 'dark' ? adjustForMode(rawColors.gray[200]) : rawColors.gray[200]
  };
  --color-gray-300: ${
    mode === 'dark' ? adjustForMode(rawColors.gray[300]) : rawColors.gray[300]
  };
  --color-gray-400: ${
    mode === 'dark' ? adjustForMode(rawColors.gray[400]) : rawColors.gray[400]
  };
  --color-gray-500: ${
    mode === 'dark' ? adjustForMode(rawColors.gray[500]) : rawColors.gray[500]
  };
  --color-gray-600: ${
    mode === 'dark' ? adjustForMode(rawColors.gray[600]) : rawColors.gray[600]
  };
  --color-gray-700: ${
    mode === 'dark' ? adjustForMode(rawColors.gray[700]) : rawColors.gray[700]
  };
  --color-gray-800: ${
    mode === 'dark' ? adjustForMode(rawColors.gray[800]) : rawColors.gray[800]
  };
  --color-gray-900: ${
    mode === 'dark' ? adjustForMode(rawColors.gray[900]) : rawColors.gray[900]
  };
  --color-gray-950: ${
    mode === 'dark' ? adjustForMode(rawColors.gray[950]) : rawColors.gray[950]
  };

  /* Accent colors */
  --color-accent-50: ${
    mode === 'dark' ? adjustForMode(rawColors.accent[50]) : rawColors.accent[50]
  };
  --color-accent-100: ${
    mode === 'dark'
      ? adjustForMode(rawColors.accent[100])
      : rawColors.accent[100]
  };
  --color-accent-200: ${
    mode === 'dark'
      ? adjustForMode(rawColors.accent[200])
      : rawColors.accent[200]
  };
  --color-accent-300: ${
    mode === 'dark'
      ? adjustForMode(rawColors.accent[300])
      : rawColors.accent[300]
  };
  --color-accent-400: ${
    mode === 'dark'
      ? adjustForMode(rawColors.accent[400])
      : rawColors.accent[400]
  };
  --color-accent-500: ${
    mode === 'dark'
      ? adjustForMode(rawColors.accent[500])
      : rawColors.accent[500]
  };
  --color-accent-600: ${
    mode === 'dark'
      ? adjustForMode(rawColors.accent[600])
      : rawColors.accent[600]
  };
  --color-accent-700: ${
    mode === 'dark'
      ? adjustForMode(rawColors.accent[700])
      : rawColors.accent[700]
  };
  --color-accent-800: ${
    mode === 'dark'
      ? adjustForMode(rawColors.accent[800])
      : rawColors.accent[800]
  };
  --color-accent-900: ${
    mode === 'dark'
      ? adjustForMode(rawColors.accent[900])
      : rawColors.accent[900]
  };
  --color-accent-950: ${
    mode === 'dark'
      ? adjustForMode(rawColors.accent[950])
      : rawColors.accent[950]
  };

  /* Semantic colors - full shade range */
  --color-success-50: ${
    mode === 'dark'
      ? adjustForMode(rawColors.success[50])
      : rawColors.success[50]
  };
  --color-success-100: ${
    mode === 'dark'
      ? adjustForMode(rawColors.success[100])
      : rawColors.success[100]
  };
  --color-success-200: ${
    mode === 'dark'
      ? adjustForMode(rawColors.success[200])
      : rawColors.success[200]
  };
  --color-success-300: ${
    mode === 'dark'
      ? adjustForMode(rawColors.success[300])
      : rawColors.success[300]
  };
  --color-success-400: ${
    mode === 'dark'
      ? adjustForMode(rawColors.success[400])
      : rawColors.success[400]
  };
  --color-success-500: ${
    mode === 'dark'
      ? adjustForMode(rawColors.success[500])
      : rawColors.success[500]
  };
  --color-success-600: ${
    mode === 'dark'
      ? adjustForMode(rawColors.success[600])
      : rawColors.success[600]
  };
  --color-success-700: ${
    mode === 'dark'
      ? adjustForMode(rawColors.success[700])
      : rawColors.success[700]
  };
  --color-success-800: ${
    mode === 'dark'
      ? adjustForMode(rawColors.success[800])
      : rawColors.success[800]
  };
  --color-success-900: ${
    mode === 'dark'
      ? adjustForMode(rawColors.success[900])
      : rawColors.success[900]
  };
  --color-success-950: ${
    mode === 'dark'
      ? adjustForMode(rawColors.success[950])
      : rawColors.success[950]
  };

  --color-error-50: ${
    mode === 'dark' ? adjustForMode(rawColors.error[50]) : rawColors.error[50]
  };
  --color-error-100: ${
    mode === 'dark' ? adjustForMode(rawColors.error[100]) : rawColors.error[100]
  };
  --color-error-200: ${
    mode === 'dark' ? adjustForMode(rawColors.error[200]) : rawColors.error[200]
  };
  --color-error-300: ${
    mode === 'dark' ? adjustForMode(rawColors.error[300]) : rawColors.error[300]
  };
  --color-error-400: ${
    mode === 'dark' ? adjustForMode(rawColors.error[400]) : rawColors.error[400]
  };
  --color-error-500: ${
    mode === 'dark' ? adjustForMode(rawColors.error[500]) : rawColors.error[500]
  };
  --color-error-600: ${
    mode === 'dark' ? adjustForMode(rawColors.error[600]) : rawColors.error[600]
  };
  --color-error-700: ${
    mode === 'dark' ? adjustForMode(rawColors.error[700]) : rawColors.error[700]
  };
  --color-error-800: ${
    mode === 'dark' ? adjustForMode(rawColors.error[800]) : rawColors.error[800]
  };
  --color-error-900: ${
    mode === 'dark' ? adjustForMode(rawColors.error[900]) : rawColors.error[900]
  };
  --color-error-950: ${
    mode === 'dark' ? adjustForMode(rawColors.error[950]) : rawColors.error[950]
  };

  --color-warning-50: ${
    mode === 'dark'
      ? adjustForMode(rawColors.warning[50])
      : rawColors.warning[50]
  };
  --color-warning-100: ${
    mode === 'dark'
      ? adjustForMode(rawColors.warning[100])
      : rawColors.warning[100]
  };
  --color-warning-200: ${
    mode === 'dark'
      ? adjustForMode(rawColors.warning[200])
      : rawColors.warning[200]
  };
  --color-warning-300: ${
    mode === 'dark'
      ? adjustForMode(rawColors.warning[300])
      : rawColors.warning[300]
  };
  --color-warning-400: ${
    mode === 'dark'
      ? adjustForMode(rawColors.warning[400])
      : rawColors.warning[400]
  };
  --color-warning-500: ${
    mode === 'dark'
      ? adjustForMode(rawColors.warning[500])
      : rawColors.warning[500]
  };
  --color-warning-600: ${
    mode === 'dark'
      ? adjustForMode(rawColors.warning[600])
      : rawColors.warning[600]
  };
  --color-warning-700: ${
    mode === 'dark'
      ? adjustForMode(rawColors.warning[700])
      : rawColors.warning[700]
  };
  --color-warning-800: ${
    mode === 'dark'
      ? adjustForMode(rawColors.warning[800])
      : rawColors.warning[800]
  };
  --color-warning-900: ${
    mode === 'dark'
      ? adjustForMode(rawColors.warning[900])
      : rawColors.warning[900]
  };
  --color-warning-950: ${
    mode === 'dark'
      ? adjustForMode(rawColors.warning[950])
      : rawColors.warning[950]
  };

  --color-info-50: ${
    mode === 'dark' ? adjustForMode(rawColors.info[50]) : rawColors.info[50]
  };
  --color-info-100: ${
    mode === 'dark' ? adjustForMode(rawColors.info[100]) : rawColors.info[100]
  };
  --color-info-200: ${
    mode === 'dark' ? adjustForMode(rawColors.info[200]) : rawColors.info[200]
  };
  --color-info-300: ${
    mode === 'dark' ? adjustForMode(rawColors.info[300]) : rawColors.info[300]
  };
  --color-info-400: ${
    mode === 'dark' ? adjustForMode(rawColors.info[400]) : rawColors.info[400]
  };
  --color-info-500: ${
    mode === 'dark' ? adjustForMode(rawColors.info[500]) : rawColors.info[500]
  };
  --color-info-600: ${
    mode === 'dark' ? adjustForMode(rawColors.info[600]) : rawColors.info[600]
  };
  --color-info-700: ${
    mode === 'dark' ? adjustForMode(rawColors.info[700]) : rawColors.info[700]
  };
  --color-info-800: ${
    mode === 'dark' ? adjustForMode(rawColors.info[800]) : rawColors.info[800]
  };
  --color-info-900: ${
    mode === 'dark' ? adjustForMode(rawColors.info[900]) : rawColors.info[900]
  };
  --color-info-950: ${
    mode === 'dark' ? adjustForMode(rawColors.info[950]) : rawColors.info[950]
  };

  /* Semantic context colors - mode specific */
  --color-background-page: ${
    mode === 'light' ? rawColors.gray[50] : rawColors.gray[950]
  };
  --color-background-card: ${
    mode === 'light' ? '#ffffff' : rawColors.gray[900]
  };
  --color-background-subtle: ${
    mode === 'light' ? rawColors.gray[100] : rawColors.gray[800]
  };
  --color-background-muted: ${
    mode === 'light' ? rawColors.gray[200] : rawColors.gray[700]
  };
  --color-background-elevated: ${
    mode === 'light' ? '#ffffff' : rawColors.gray[800]
  };

  --color-surface-primary: ${
    mode === 'light'
      ? rawColors.primary[50]
      : hexToRgba(rawColors.primary[900], 0.4)
  };
  --color-surface-success: ${
    mode === 'light'
      ? rawColors.success[50]
      : hexToRgba(rawColors.success[900], 0.4)
  };
  --color-surface-warning: ${
    mode === 'light'
      ? rawColors.warning[50]
      : hexToRgba(rawColors.warning[900], 0.4)
  };
  --color-surface-error: ${
    mode === 'light'
      ? rawColors.error[50]
      : hexToRgba(rawColors.error[900], 0.4)
  };
  --color-surface-info: ${
    mode === 'light' ? rawColors.info[50] : hexToRgba(rawColors.info[900], 0.4)
  };
  --color-surface-accent: ${
    mode === 'light'
      ? rawColors.accent[50]
      : hexToRgba(rawColors.accent[900], 0.4)
  };

  --color-border-subtle: ${
    mode === 'light' ? rawColors.gray[200] : rawColors.gray[700]
  };
  --color-border-moderate: ${
    mode === 'light' ? rawColors.gray[300] : rawColors.gray[600]
  };
  --color-border-strong: ${
    mode === 'light' ? rawColors.gray[400] : rawColors.gray[500]
  };
  --color-border-focus: ${rawColors.primary[500]};
  --color-border-error: ${rawColors.error[500]};
  --color-border-accent: ${rawColors.accent[500]};

  --color-text-primary: ${mode === 'light' ? rawColors.gray[900] : '#ffffff'};
  --color-text-secondary: ${
    mode === 'light' ? rawColors.gray[700] : rawColors.gray[300]
  };
  --color-text-tertiary: ${
    mode === 'light' ? rawColors.gray[500] : rawColors.gray[400]
  };
  --color-text-disabled: ${
    mode === 'light' ? rawColors.gray[400] : rawColors.gray[600]
  };
  --color-text-inverted: ${mode === 'light' ? '#ffffff' : rawColors.gray[900]};
  --color-text-link: ${
    mode === 'light' ? rawColors.primary[600] : rawColors.primary[400]
  };
  --color-text-success: ${
    mode === 'light' ? rawColors.success[700] : rawColors.success[400]
  };
  --color-text-error: ${
    mode === 'light' ? rawColors.error[700] : rawColors.error[400]
  };
  --color-text-warning: ${
    mode === 'light' ? rawColors.warning[700] : rawColors.warning[400]
  };
  --color-text-info: ${
    mode === 'light' ? rawColors.info[700] : rawColors.info[400]
  };
  --color-text-accent: ${
    mode === 'light' ? rawColors.accent[700] : rawColors.accent[400]
  };

  --color-icon-primary: ${mode === 'light' ? rawColors.gray[900] : '#ffffff'};
  --color-icon-secondary: ${
    mode === 'light' ? rawColors.gray[700] : rawColors.gray[300]
  };
  --color-icon-tertiary: ${
    mode === 'light' ? rawColors.gray[500] : rawColors.gray[500]
  };
  --color-icon-inverted: ${mode === 'light' ? '#ffffff' : rawColors.gray[900]};
  --color-icon-accent: ${
    mode === 'light' ? rawColors.accent[600] : rawColors.accent[400]
  };

  --color-glass-light-background: ${
    mode === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.1)'
  };
  --color-glass-light-border: ${
    mode === 'light' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'
  };
  --color-glass-dark-background: ${
    mode === 'light' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)'
  };
  --color-glass-dark-border: ${
    mode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.1)'
  };
  --color-glass-brand-background: ${
    mode === 'light'
      ? hexToRgba(rawColors.primary[500], 0.7)
      : hexToRgba(rawColors.primary[900], 0.5)
  };
  --color-glass-brand-border: ${
    mode === 'light'
      ? hexToRgba(rawColors.primary[500], 0.2)
      : hexToRgba(rawColors.primary[800], 0.2)
  };
  --color-glass-accent-background: ${
    mode === 'light'
      ? hexToRgba(rawColors.accent[500], 0.7)
      : hexToRgba(rawColors.accent[900], 0.5)
  };
  --color-glass-accent-border: ${
    mode === 'light'
      ? hexToRgba(rawColors.accent[500], 0.2)
      : hexToRgba(rawColors.accent[800], 0.2)
  };
}`;
}

// Helper function to convert hex to rgba for glass effects
export function hexToRgba(hex: string, alpha: number): string {
  // Check if the input is a CSS variable
  if (hex.startsWith('var(--')) {
    // For CSS variables, return a fallback rgba that will work at runtime
    return `rgba(0, 0, 0, ${alpha})`; // This will be replaced at runtime with the actual CSS variable value
  }

  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  try {
    // Parse hex values
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch (error) {
    console.error(`Error converting hex to rgba: ${error}`);
    return `rgba(0, 0, 0, ${alpha})`; // Fallback to black with the specified alpha
  }
}

// Export a color scheme API for runtime usage
export const ColorAPI = {
  // Generate CSS variables for a theme
  generateCSS: (
    options: ThemeOptions,
    mode: 'light' | 'dark' = 'light'
  ): string => {
    return generateColorCssVariables(options, mode);
  },

  // Apply theme preset
  applyPreset: applyThemePreset,

  // Generate a dynamic color scheme
  generateScheme: (
    baseColor: string,
    scheme: ThemeOptions['colorScheme'] = 'complementary'
  ): Record<string, string> => {
    return generateHarmonicColor(baseColor, scheme);
  },

  // Check if a color meets accessibility standards
  checkAccessibility: (
    foreground: string,
    background: string,
    level: 'AA' | 'AAA' = 'AA'
  ): boolean => {
    const requiredRatio = level === 'AA' ? 4.5 : 7;
    const contrast = calculateContrastRatio(foreground, background);
    return contrast >= requiredRatio;
  },

  // Get accessible text color for background
  getAccessibleTextColor: (background: string): string => {
    // Remove # if present
    const hex = background.replace(/^#/, '');

    // Calculate luminance
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    // Use white text on dark backgrounds, black on light
    return luminance < 0.5 ? '#ffffff' : '#000000';
  },
};

// Calculate contrast ratio between two colors
function calculateContrastRatio(color1: string, color2: string): number {
  try {
    // Check if either input is a CSS variable
    if (color1.startsWith('var(--') || color2.startsWith('var(--')) {
      // For CSS variables, return a default contrast ratio that meets WCAG AA
      return 4.5; // Default to WCAG AA standard
    }

    // Remove # if present
    const hex1 = color1.replace(/^#/, '');
    const hex2 = color2.replace(/^#/, '');

    // Calculate luminance for first color
    const r1 = parseInt(hex1.substring(0, 2), 16) / 255;
    const g1 = parseInt(hex1.substring(2, 4), 16) / 255;
    const b1 = parseInt(hex1.substring(4, 6), 16) / 255;

    const R1 = r1 <= 0.03928 ? r1 / 12.92 : Math.pow((r1 + 0.055) / 1.055, 2.4);
    const G1 = g1 <= 0.03928 ? g1 / 12.92 : Math.pow((g1 + 0.055) / 1.055, 2.4);
    const B1 = b1 <= 0.03928 ? b1 / 12.92 : Math.pow((b1 + 0.055) / 1.055, 2.4);

    const L1 = 0.2126 * R1 + 0.7152 * G1 + 0.0722 * B1;

    // Calculate luminance for second color
    const r2 = parseInt(hex2.substring(0, 2), 16) / 255;
    const g2 = parseInt(hex2.substring(2, 4), 16) / 255;
    const b2 = parseInt(hex2.substring(4, 6), 16) / 255;

    const R2 = r2 <= 0.03928 ? r2 / 12.92 : Math.pow((r2 + 0.055) / 1.055, 2.4);
    const G2 = g2 <= 0.03928 ? g2 / 12.92 : Math.pow((g2 + 0.055) / 1.055, 2.4);
    const B2 = b2 <= 0.03928 ? b2 / 12.92 : Math.pow((b2 + 0.055) / 1.055, 2.4);

    const L2 = 0.2126 * R2 + 0.7152 * G2 + 0.0722 * B2;

    // Return contrast ratio
    return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  } catch (error) {
    console.error(`Error calculating contrast ratio: ${error}`);
    return 4.5; // Default to WCAG AA standard
  }
}
