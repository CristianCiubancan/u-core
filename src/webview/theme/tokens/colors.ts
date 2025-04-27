// Enhanced CSS Variables Generator for tailwind.config.ts
// This extends the existing generateColorCssVariables function

import { hexToRgb } from '../utils/colorUtils';
import { shadowOpacity, typography, borders, scrollbars } from './constants';
import { extractRawColorValues, ThemeOptions } from './tailwindColors';

/**
 * Generate enhanced CSS variables for light and dark mode
 * Includes more comprehensive set of theme tokens as CSS variables
 */
export function generateEnhancedCssVariables(
  options: ThemeOptions,
  mode: 'light' | 'dark' = 'light'
): string {
  const rawColors = extractRawColorValues(options);

  // Base color variables from the original function
  let cssVars = `
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
  };`;

  // Add existing semantic color tokens (shortened for brevity)
  cssVars += `
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
  --color-text-inverted: ${
    mode === 'light' ? '#ffffff' : rawColors.gray[900]
  };`;

  // NEW: Add shadow tokens as CSS variables
  cssVars += `
  /* Shadow tokens */
  --shadow-color: ${hexToRgb(
    mode === 'light' ? rawColors.gray[900] : '#000000'
  )};
  --shadow-subtle: 0 1px 2px rgba(var(--shadow-color), ${shadowOpacity.subtle});
  --shadow-light: 0 1px 3px rgba(var(--shadow-color), ${shadowOpacity.light});
  --shadow-medium: 0 4px 6px rgba(var(--shadow-color), ${shadowOpacity.medium});
  --shadow-strong: 0 10px 15px rgba(var(--shadow-color), ${
    shadowOpacity.strong
  });
  --shadow-intense: 0 20px 25px rgba(var(--shadow-color), ${
    shadowOpacity.intense
  });
  
  /* Brand shadow tokens */
  --shadow-brand-color: ${hexToRgb(rawColors.primary[900])};
  --shadow-brand-light: 0 1px 3px rgba(var(--shadow-brand-color), ${
    shadowOpacity.light
  });
  --shadow-brand-medium: 0 4px 8px rgba(var(--shadow-brand-color), ${
    shadowOpacity.medium
  });
  --shadow-brand-strong: 0 8px 16px rgba(var(--shadow-brand-color), ${
    shadowOpacity.strong
  });`;

  // NEW: Add typography tokens as CSS variables
  cssVars += `
  /* Typography tokens */
  --font-weight-light: ${typography.fontWeight.light};
  --font-weight-normal: ${typography.fontWeight.normal};
  --font-weight-medium: ${typography.fontWeight.medium};
  --font-weight-semibold: ${typography.fontWeight.semibold};
  --font-weight-bold: ${typography.fontWeight.bold};
  
  --letter-spacing-tight: ${typography.letterSpacing.tight};
  --letter-spacing-normal: ${typography.letterSpacing.normal};
  --letter-spacing-wide: ${typography.letterSpacing.wide};
  --letter-spacing-wider: ${typography.letterSpacing.wider};
  --letter-spacing-widest: ${typography.letterSpacing.widest};
  
  --line-height-none: ${typography.lineHeight.none};
  --line-height-tight: ${typography.lineHeight.tight};
  --line-height-normal: ${typography.lineHeight.normal};
  --line-height-relaxed: ${typography.lineHeight.relaxed};
  --line-height-loose: ${typography.lineHeight.loose};`;

  // NEW: Add border tokens as CSS variables
  cssVars += `
  /* Border tokens */
  --border-width-thin: ${borders.width.thin};
  --border-width-medium: ${borders.width.medium};
  --border-width-thick: ${borders.width.thick};
  --border-width-heavy: ${borders.width.heavy};
  
  --border-radius-sm: ${borders.radius.sm};
  --border-radius-base: ${borders.radius.base};
  --border-radius-md: ${borders.radius.md};
  --border-radius-lg: ${borders.radius.lg};
  --border-radius-xl: ${borders.radius.xl};
  --border-radius-2xl: ${borders.radius['2xl']};
  --border-radius-3xl: ${borders.radius['3xl']};
  --border-radius-full: ${borders.radius.full};
  
  /* Border colors */
  --border-light: ${
    mode === 'light' ? rawColors.gray[200] : rawColors.gray[700]
  };
  --border-medium: ${
    mode === 'light' ? rawColors.gray[300] : rawColors.gray[600]
  };
  --border-strong: ${
    mode === 'light' ? rawColors.gray[400] : rawColors.gray[500]
  };
  --border-focus: ${rawColors.primary[500]};`;

  // NEW: Add scrollbar tokens as CSS variables
  cssVars += `
  /* Scrollbar tokens */
  --scrollbar-width-thin: ${scrollbars.width.thin};
  --scrollbar-width-default: ${scrollbars.width.default};
  --scrollbar-width-medium: ${scrollbars.width.medium};
  --scrollbar-width-thick: ${scrollbars.width.thick};
  
  --scrollbar-radius-default: ${scrollbars.borderRadius.default};
  --scrollbar-radius-rounded: ${scrollbars.borderRadius.rounded};
  
  --scrollbar-track-light: rgba(${hexToRgb(rawColors.gray[100])}, ${
    mode === 'light' ? opacityLevels.light.low : opacityLevels.dark.low
  });
  --scrollbar-thumb-light: rgba(${hexToRgb(rawColors.gray[300])}, ${
    mode === 'light' ? opacityLevels.light.medium : opacityLevels.dark.medium
  });
  --scrollbar-thumb-hover-light: rgba(${hexToRgb(rawColors.gray[400])}, ${
    mode === 'light' ? opacityLevels.light.high : opacityLevels.dark.high
  });
  
  --scrollbar-track-dark: rgba(${hexToRgb(rawColors.gray[800])}, ${
    mode === 'light' ? opacityLevels.light.low : opacityLevels.dark.low
  });
  --scrollbar-thumb-dark: rgba(${hexToRgb(rawColors.gray[600])}, ${
    mode === 'light' ? opacityLevels.light.medium : opacityLevels.dark.medium
  });
  --scrollbar-thumb-hover-dark: rgba(${hexToRgb(rawColors.gray[500])}, ${
    mode === 'light' ? opacityLevels.light.high : opacityLevels.dark.high
  });`;

  // NEW: Add glass tokens as CSS variables
  cssVars += `
  /* Glass tokens */
  --glass-light-bg: rgba(255, 255, 255, ${opacityLevels.light.high});
  --glass-light-border: rgba(255, 255, 255, ${opacityLevels.light.medium});
  
  --glass-dark-bg: rgba(15, 23, 42, ${opacityLevels.dark.medium});
  --glass-dark-border: rgba(30, 41, 59, ${opacityLevels.light.medium});
  
  --glass-brand-bg: rgba(${hexToRgb(rawColors.primary[500])}, ${
    opacityLevels.brand.low
  });
  --glass-brand-border: rgba(${hexToRgb(rawColors.primary[400])}, ${
    opacityLevels.brand.medium
  });
  
  /* Gaming UI tokens */
  --gaming-bg-dark: rgba(${hexToRgb(rawColors.gray[900])}, ${
    opacityLevels.dark.high
  });
  --gaming-bg-medium: rgba(${hexToRgb(rawColors.gray[800])}, ${
    opacityLevels.dark.high
  });
  --gaming-bg-light: rgba(${hexToRgb(rawColors.gray[700])}, ${
    opacityLevels.dark.high
  });
  
  --gaming-border-dark: rgba(${hexToRgb(rawColors.gray[800])}, ${
    opacityLevels.light.medium
  });
  --gaming-border-light: rgba(${hexToRgb(rawColors.gray[600])}, ${
    opacityLevels.light.low
  });
  
  --gaming-shadow-default: 0 4px 16px rgba(0, 0, 0, ${shadowOpacity.medium});
  --gaming-shadow-hover: 0 4px 12px rgba(0, 0, 0, ${shadowOpacity.medium});
  --gaming-shadow-header: 0 4px 6px rgba(0, 0, 0, ${shadowOpacity.light});`;

  // Close the root selector
  cssVars += `
}`;

  return cssVars;
}

// Helper function to adjust color for dark mode (from the original function)
function adjustForMode(color: string): string {
  // This would be the implementation of your existing adjustColorLightness function
  // For brevity, I've omitted the implementation here
  return color;
}

// For reference: opacity levels (defined in constants.ts)
const opacityLevels = {
  transparent: 0,
  subtle: 0.1,
  light: {
    low: 0.3,
    medium: 0.5,
    high: 0.7,
    opaque: 0.9,
  },
  dark: {
    low: 0.4,
    medium: 0.75,
    high: 0.85,
    opaque: 0.95,
  },
  brand: {
    low: 0.15,
    medium: 0.3,
    high: 0.5,
    opaque: 0.8,
  },
};
