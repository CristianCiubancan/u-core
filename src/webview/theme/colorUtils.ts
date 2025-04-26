/**
 * Color utility functions for Tailwind CSS configuration
 * Provides helpers for color manipulation and accessibility
 */

/**
 * Convert hex color to RGB values
 * @param {string} hex - Hex color code (with or without #)
 * @returns {string} RGB values as a comma-separated string
 */
function hexToRgb(hex: string): string {
  // Safety check for undefined or invalid values
  if (!hex || typeof hex !== 'string') {
    console.warn(`Invalid hex color provided: ${hex}, using fallback black`);
    return '0, 0, 0'; // Return black as fallback
  }

  try {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Validate hex format
    if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) {
      console.warn(`Invalid hex format: ${hex}, using fallback black`);
      return '0, 0, 0';
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error converting hex to RGB: ${errorMessage}`);
    return '0, 0, 0'; // Return black as fallback
  }
}

/**
 * Calculate relative luminance of a color
 * @param {string} hex - Hex color code
 * @returns {number} Relative luminance value (0-1)
 */
function getLuminance(hex: string): number {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Calculate relative luminance using the formula from WCAG 2.0
  const R = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const G = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const B = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculate contrast ratio between two colors
 * @param {string} color1 - First hex color code
 * @param {string} color2 - Second hex color code
 * @returns {number} Contrast ratio (1-21)
 */
function getContrastRatio(color1: string, color2: string): number {
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);

  // Calculate contrast ratio using the WCAG 2.0 formula
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Determine if a color is dark (for choosing text color)
 * @param {string} hex - Hex color code
 * @returns {boolean} True if color is dark
 */
function isDarkColor(hex: string): boolean {
  return getLuminance(hex) < 0.5;
}

/**
 * Get accessible text color for a given background
 * @param {string} bgColor - Background color hex code
 * @returns {string} Either white or black depending on contrast
 */
function getAccessibleTextColor(bgColor: string): string {
  return isDarkColor(bgColor) ? '#ffffff' : '#000000';
}

module.exports = {
  hexToRgb,
  getLuminance,
  getContrastRatio,
  isDarkColor,
  getAccessibleTextColor,
};
