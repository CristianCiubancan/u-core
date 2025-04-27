// types/accessibility.ts

import { Theme } from './theme';

export interface AccessibilityChecks {
  // WCAG 2.1 AA Standard
  minimumTextContrast: number; // 4.5:1 for normal text
  minimumLargeTextContrast: number; // 3:1 for large text
  minimumUIContrast: number; // 3:1 for UI components
}

// Default accessibility requirements
export const defaultAccessibilityChecks: AccessibilityChecks = {
  minimumTextContrast: 4.5,
  minimumLargeTextContrast: 3.0,
  minimumUIContrast: 3.0,
};

// Calculate relative luminance for a color (WCAG formula)
export function getLuminance(hexColor: string): number {
  // Remove # if present
  const hex = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;

  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;

  // Calculate RGB values
  const R = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const G = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const B = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate luminance
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

// Calculate contrast ratio between two colors
export function getContrastRatio(color1: string, color2: string): number {
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);

  // Calculate contrast ratio
  const brightest = Math.max(luminance1, luminance2);
  const darkest = Math.min(luminance1, luminance2);

  return (brightest + 0.05) / (darkest + 0.05);
}

// Check if a theme meets accessibility standards
export function validateThemeAccessibility(
  theme: Theme,
  checks: AccessibilityChecks = defaultAccessibilityChecks
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check text contrast against backgrounds
  const textContrastBg = getContrastRatio(
    theme.colors.text,
    theme.colors.background
  );
  if (textContrastBg < checks.minimumTextContrast) {
    issues.push(
      `Text contrast ratio (${textContrastBg.toFixed(
        2
      )}) with background is below ${checks.minimumTextContrast}`
    );
  }

  const textSecondaryContrastBg = getContrastRatio(
    theme.colors.textSecondary,
    theme.colors.background
  );
  if (textSecondaryContrastBg < checks.minimumTextContrast) {
    issues.push(
      `Secondary text contrast ratio (${textSecondaryContrastBg.toFixed(
        2
      )}) with background is below ${checks.minimumTextContrast}`
    );
  }

  // Check interactive elements
  const primaryContrastBg = getContrastRatio(
    theme.colors.primary,
    theme.colors.background
  );
  if (primaryContrastBg < checks.minimumUIContrast) {
    issues.push(
      `Primary button contrast ratio (${primaryContrastBg.toFixed(
        2
      )}) with background is below ${checks.minimumUIContrast}`
    );
  }

  // Add more checks as needed for other combinations

  return {
    valid: issues.length === 0,
    issues,
  };
}
