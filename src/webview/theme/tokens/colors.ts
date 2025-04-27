// colors.ts
import {
  tailwindColors,
  ColorPaletteName,
  ThemeOptions,
  createColorScales,
  extractRawColorValues,
  generateColorCssVariables,
} from './tailwindColors';

// Default theme configuration
const defaultThemeOptions: ThemeOptions = {
  brandColor: 'indigo',
  grayColor: 'gray',
};

// Export everything needed from this module
export {
  tailwindColors,
  type ColorPaletteName,
  type ThemeOptions,
  createColorScales,
  extractRawColorValues,
  generateColorCssVariables,
  defaultThemeOptions,
};

// Create a theme class for more object-oriented usage if needed
export class Theme {
  options: ThemeOptions;

  constructor(options: Partial<ThemeOptions> = {}) {
    this.options = {
      ...defaultThemeOptions,
      ...options,
    };
  }

  // Get the color scales for this theme
  getColorScales() {
    return createColorScales(this.options);
  }

  // Generate CSS variables for this theme
  generateCssVariables(): string {
    return generateColorCssVariables(this.options);
  }

  // Extract raw color values
  getRawColorValues() {
    return extractRawColorValues(this.options);
  }
}
