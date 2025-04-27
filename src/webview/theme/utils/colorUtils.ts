// src/theme/utils/colorUtils.ts

import { handleThemeError, ErrorType } from './errorUtils';
import { fallbacks } from '../tokens/constants';

/**
 * Convert hex color to RGB values
 * @param hex - Hex color code (with or without #) or CSS variable
 * @returns RGB values as a comma-separated string
 */
export function hexToRgb(hex: string): string {
  // Safety check for undefined or invalid values
  if (!hex || typeof hex !== 'string') {
    return handleThemeError(
      ErrorType.COLOR,
      `Invalid hex color provided: ${hex}`,
      fallbacks.color.rgb
    );
  }

  try {
    // Check if the input is a CSS variable
    if (hex.startsWith('var(--')) {
      // For CSS variables, return a fallback that will work in runtime
      // but won't cause errors during build time
      return fallbacks.color.rgb;
    }

    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Validate hex format
    if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
      return handleThemeError(
        ErrorType.COLOR,
        `Invalid hex format: ${hex}`,
        fallbacks.color.rgb
      );
    }

    // Handle 3-digit hex codes by duplicating each digit
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // Parse hex values
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return `${r}, ${g}, ${b}`;
  } catch (error) {
    return handleThemeError(
      ErrorType.COLOR,
      'Error converting hex to RGB',
      fallbacks.color.rgb,
      error
    );
  }
}

/**
 * Convert HEX color to RGBA string
 * @param hex - Hex color code
 * @param alpha - Alpha/opacity value (0-1)
 * @returns RGBA string suitable for CSS
 */
export /**
 * Helper function to convert hex to rgba string
 * Convenience function for constants.ts
 */
function hexToRgba(hex: string, alpha: number): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Return rgba string
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Calculate relative luminance of a color
 * @param hex - Hex color code or CSS variable
 * @returns Relative luminance value (0-1)
 */
export function getLuminance(hex: string): number {
  try {
    // Check if the input is a CSS variable
    if (hex.startsWith('var(--')) {
      // For CSS variables, return a middle luminance value as fallback
      return fallbacks.opacity;
    }

    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Validate hex format
    if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
      return fallbacks.opacity; // Return middle luminance as fallback
    }

    // Handle 3-digit hex codes by duplicating each digit
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    // Calculate relative luminance using the formula from WCAG 2.0
    const R = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const G = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const B = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  } catch (error) {
    console.error(`Error calculating luminance: ${error}`);
    return fallbacks.opacity; // Return middle luminance as fallback
  }
}

/**
 * Calculate contrast ratio between two colors according to WCAG 2.0
 * @param color1 - First hex color code
 * @param color2 - Second hex color code
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  try {
    const luminance1 = getLuminance(color1);
    const luminance2 = getLuminance(color2);

    // Calculate contrast ratio using the WCAG 2.0 formula
    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);

    return (lighter + 0.05) / (darker + 0.05);
  } catch (error) {
    console.error(`Error calculating contrast ratio: ${error}`);
    return 1; // Return minimum contrast as fallback
  }
}

/**
 * Determine if a color is dark (for choosing text color)
 * @param hex - Hex color code
 * @returns True if color is dark
 */
export function isDarkColor(hex: string): boolean {
  return getLuminance(hex) < 0.5;
}

/**
 * Get appropriate text color for a given background
 * @param bgColor - Background color hex code
 * @param darkColor - Custom dark color (default: black)
 * @param lightColor - Custom light color (default: white)
 * @returns Either light or dark color depending on contrast
 */
export function getAccessibleTextColor(
  bgColor: string,
  darkColor: string = fallbacks.color.hex,
  lightColor: string = '#ffffff'
): string {
  return isDarkColor(bgColor) ? lightColor : darkColor;
}

/**
 * Adjust color lightness
 * @param hex - Hex color code or CSS variable
 * @param amount - Amount to adjust lightness (-1 to 1)
 * @returns Adjusted hex color or original CSS variable
 */
export function adjustColorLightness(hex: string, amount: number): string {
  try {
    // Check if the input is a CSS variable
    if (hex.startsWith('var(--')) {
      // For CSS variables, return the original variable
      // This will be handled at runtime when the CSS variable is resolved
      return hex;
    }

    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Validate hex format
    if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
      return `#${hex}`; // Return original value with # prefix
    }

    // Handle shorthand hex
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }

    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Convert RGB to HSL
    const rgbToHsl = (r: number, g: number, b: number) => {
      r /= 255;
      g /= 255;
      b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0,
        s = 0,
        l = (max + min) / 2;

      if (max !== min) {
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
        }
        h /= 6;
      }

      return [h, s, l];
    };

    // Convert HSL to RGB
    const hslToRgb = (h: number, s: number, l: number) => {
      let r, g, b;

      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p: number, q: number, t: number) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1 / 6) return p + (q - p) * 6 * t;
          if (t < 1 / 2) return q;
          if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
          return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
      }

      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    // Convert to HSL, adjust lightness, convert back to RGB
    const [h, s, l] = rgbToHsl(r, g, b);
    let newL = l + amount;
    newL = Math.max(0, Math.min(1, newL)); // Clamp to 0-1
    const [newR, newG, newB] = hslToRgb(h, s, newL);

    // Convert back to hex
    const toHex = (c: number) => {
      const hex = c.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
  } catch (error) {
    console.error(`Error adjusting color lightness: ${error}`);
    return hex.startsWith('#') ? hex : `#${hex}`; // Return original color as fallback
  }
}

/**
 * Generate a color palette from a base color
 * @param baseColor - Base color in hex format
 * @returns Object with color palette (50-950)
 */
export function generateColorPalette(
  baseColor: string
): Record<number, string> {
  try {
    const baseLuminance = getLuminance(baseColor);
    const palette: Record<number, string> = {};

    // Find the closest shade for the base color
    const baseShade =
      baseLuminance < 0.2
        ? 800
        : baseLuminance < 0.3
        ? 700
        : baseLuminance < 0.4
        ? 600
        : baseLuminance < 0.5
        ? 500
        : baseLuminance < 0.6
        ? 400
        : baseLuminance < 0.7
        ? 300
        : baseLuminance < 0.8
        ? 200
        : baseLuminance < 0.9
        ? 100
        : 50;

    palette[baseShade] = baseColor;

    // Generate lighter shades
    let currentColor = baseColor;
    for (let i = baseShade - 50; i >= 50; i -= 50) {
      const amount = i <= 200 ? 0.1 : 0.07;
      currentColor = adjustColorLightness(currentColor, amount);
      palette[i] = currentColor;
    }

    // Reset and generate darker shades
    currentColor = baseColor;
    for (let i = baseShade + 50; i <= 950; i += 50) {
      const amount = i >= 800 ? -0.1 : -0.07;
      currentColor = adjustColorLightness(currentColor, amount);
      palette[i] = currentColor;
    }

    return palette;
  } catch (error) {
    console.error(`Error generating color palette: ${error}`);
    return {}; // Return empty object as fallback
  }
}
