import { getContrastRatio } from '../../utils/colorUtils';
import { grayPalettes, colorPalettes } from '../colors';

interface AccessibleTextUtilities {
  [key: string]: {
    color: string;
    'font-weight': string;
    'letter-spacing'?: string;
    'text-shadow'?: string;
  };
}

// Generate accessible color utilities with improved readability focus
function generateAccessibleTextUtilities(
  grayPalette: (typeof grayPalettes)[keyof typeof grayPalettes],
  brandPalette: (typeof colorPalettes)[keyof typeof colorPalettes]
): AccessibleTextUtilities {
  // Determine contrast-optimized text colors for each background context
  const isDarkBrand: boolean =
    getContrastRatio(brandPalette[600], grayPalette[50]) >= 4.5;

  // Using 200 instead of 100 for light text - darker for better contrast
  const lightTextColor: string = grayPalette[200];

  // Using 800 instead of 900 for dark text - slightly lighter for less harsh contrast
  const darkTextColor: string = grayPalette[800];

  // Define background contexts and their accessible text colors
  const accessibleTextUtilities: AccessibleTextUtilities = {
    '.text-accessible-light': {
      color: darkTextColor,
      'font-weight': '450',
    },
    '.text-accessible-dark': {
      color: lightTextColor,
      'font-weight': '400',
      'letter-spacing': '0.01em',
    },
    '.text-accessible-on-brand': {
      color: isDarkBrand ? lightTextColor : darkTextColor,
      'font-weight': isDarkBrand ? '400' : '450',
      'letter-spacing': isDarkBrand ? '0.01em' : 'normal',
    },
    '.text-accessible-on-glass': {
      // Use dark text for high contrast on complex/light backgrounds
      'color': darkTextColor,
      'font-weight': '450', // Slightly bolder for dark text on light/complex bg
    },
    '.text-on-dark': {
      color: grayPalette[200],
      'font-weight': '400',
      'letter-spacing': '0.01em',
    },
    '.text-on-light': {
      color: grayPalette[700],
      'font-weight': '450',
    },
    '.text-primary': {
      color: brandPalette[600],
      'font-weight': '500',
    },
    '.text-secondary': {
      color: grayPalette[500],
      'font-weight': '400',
    },
  };

  return accessibleTextUtilities;
}

export { generateAccessibleTextUtilities };
