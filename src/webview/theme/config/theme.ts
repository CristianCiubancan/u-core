// config/themes.ts (expanded)
import { ColorName, ColorShades, TailwindColors } from '../types/colors';
import { Theme, ThemeMode, ThemePalette, ThemeColors } from '../types/theme';
import tailwindColors from '../tailwind-colors.json';

// Type assertion with our well-defined interface
export const colors = tailwindColors as TailwindColors;

export const getColorPalette = (colorName: ColorName): ColorShades => {
  return colors[colorName];
};

// Define our base palettes
const lightPalette: ThemePalette = {
  mainColorName: 'blue',
  accentColorName: 'indigo',
  neutralColorName: 'slate',
};

const darkPalette: ThemePalette = {
  mainColorName: 'blue',
  accentColorName: 'indigo',
  neutralColorName: 'slate',
};

// Enhanced function to create theme colors with all the new color variants
function createThemeColors(
  palette: ThemePalette,
  isDark: boolean
): ThemeColors {
  const { mainColorName, accentColorName, neutralColorName } = palette;

  if (isDark) {
    return {
      // Background colors
      background: getColorPalette(neutralColorName)[950],
      backgroundMuted: getColorPalette(neutralColorName)[900],
      backgroundSubtle: getColorPalette(neutralColorName)[800],

      // Text colors
      text: getColorPalette(neutralColorName)[100],
      textSecondary: getColorPalette(neutralColorName)[300],
      textMuted: getColorPalette(neutralColorName)[400],

      // Interactive element colors - primary
      primary: getColorPalette(mainColorName)[500],
      primaryHover: getColorPalette(mainColorName)[400],
      primaryActive: getColorPalette(mainColorName)[300],
      primarySubtle: getColorPalette(mainColorName)[900], // New
      primaryOutline: getColorPalette(mainColorName)[800], // New

      // Interactive element colors - secondary
      secondary: getColorPalette(accentColorName)[500],
      secondaryHover: getColorPalette(accentColorName)[400],
      secondaryActive: getColorPalette(accentColorName)[300],
      secondarySubtle: getColorPalette(accentColorName)[900], // New
      secondaryOutline: getColorPalette(accentColorName)[800], // New

      // Feedback colors
      success: getColorPalette('green')[500],
      successSubtle: getColorPalette('green')[900], // New
      error: getColorPalette('red')[500],
      errorSubtle: getColorPalette('red')[900], // New
      warning: getColorPalette('amber')[400],
      warningSubtle: getColorPalette('amber')[900], // New
      info: getColorPalette('sky')[400],
      infoSubtle: getColorPalette('sky')[900], // New

      // Border colors
      border: getColorPalette(neutralColorName)[700],
      borderFocus: getColorPalette(mainColorName)[400],

      // Overlay colors
      overlay: 'rgba(0, 0, 0, 0.7)',
    };
  } else {
    // Light theme
    return {
      // Background colors
      background: '#ffffff',
      backgroundMuted: getColorPalette(neutralColorName)[50],
      backgroundSubtle: getColorPalette(neutralColorName)[100],

      // Text colors
      text: getColorPalette(neutralColorName)[900],
      textSecondary: getColorPalette(neutralColorName)[700],
      textMuted: getColorPalette(neutralColorName)[500],

      // Interactive element colors - primary
      primary: getColorPalette(mainColorName)[600],
      primaryHover: getColorPalette(mainColorName)[700],
      primaryActive: getColorPalette(mainColorName)[800],
      primarySubtle: getColorPalette(mainColorName)[50], // New
      primaryOutline: getColorPalette(mainColorName)[100], // New

      // Interactive element colors - secondary
      secondary: getColorPalette(accentColorName)[600],
      secondaryHover: getColorPalette(accentColorName)[700],
      secondaryActive: getColorPalette(accentColorName)[800],
      secondarySubtle: getColorPalette(accentColorName)[50], // New
      secondaryOutline: getColorPalette(accentColorName)[100], // New

      // Feedback colors
      success: getColorPalette('green')[600],
      successSubtle: getColorPalette('green')[50], // New
      error: getColorPalette('red')[600],
      errorSubtle: getColorPalette('red')[50], // New
      warning: getColorPalette('amber')[500],
      warningSubtle: getColorPalette('amber')[50], // New
      info: getColorPalette('sky')[500],
      infoSubtle: getColorPalette('sky')[50], // New

      // Border colors
      border: getColorPalette(neutralColorName)[200],
      borderFocus: getColorPalette(mainColorName)[500],

      // Overlay colors
      overlay: 'rgba(0, 0, 0, 0.5)',
    };
  }
}

// Create the default light theme with enhanced colors
export const lightTheme: Theme = {
  id: 'light',
  name: 'Light',
  palette: lightPalette,
  colors: createThemeColors(lightPalette, false),
  description: 'Default light theme with blue primary color',
};

// Create the default dark theme with enhanced colors
export const darkTheme: Theme = {
  id: 'dark',
  name: 'Dark',
  palette: darkPalette,
  colors: createThemeColors(darkPalette, true),
  description: 'Default dark theme with blue primary color',
};

// Theme customization utility
export function createCustomTheme(
  id: string,
  name: string,
  options: {
    mainColorName: ColorName;
    accentColorName: ColorName;
    neutralColorName: ColorName;
    mode: 'light' | 'dark';
    category?: string;
    description?: string;
  }
): Theme {
  const palette: ThemePalette = {
    mainColorName: options.mainColorName,
    accentColorName: options.accentColorName,
    neutralColorName: options.neutralColorName,
  };

  return {
    id,
    name,
    palette,
    colors: createThemeColors(palette, options.mode === 'dark'),
    category: options.category,
    description: options.description,
  };
}

// Export a map of all available themes (expanded with custom themes)
export const themes: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  // Add some pre-built custom themes
  purple: createCustomTheme('purple', 'Purple', {
    mainColorName: 'purple',
    accentColorName: 'violet',
    neutralColorName: 'slate',
    mode: 'light',
    category: 'Custom',
  }),
  emerald: createCustomTheme('emerald', 'Emerald', {
    mainColorName: 'emerald',
    accentColorName: 'teal',
    neutralColorName: 'gray',
    mode: 'light',
    category: 'Custom',
  }),
  amber: createCustomTheme('amber', 'Amber', {
    mainColorName: 'amber',
    accentColorName: 'orange',
    neutralColorName: 'stone',
    mode: 'light',
    category: 'Custom',
  }),
  // Dark variants
  purpleDark: createCustomTheme('purpleDark', 'Purple Dark', {
    mainColorName: 'purple',
    accentColorName: 'violet',
    neutralColorName: 'slate',
    mode: 'dark',
    category: 'Custom',
  }),
  emeraldDark: createCustomTheme('emeraldDark', 'Emerald Dark', {
    mainColorName: 'emerald',
    accentColorName: 'teal',
    neutralColorName: 'gray',
    mode: 'dark',
    category: 'Custom',
  }),
  amberDark: createCustomTheme('amberDark', 'Amber Dark', {
    mainColorName: 'amber',
    accentColorName: 'orange',
    neutralColorName: 'stone',
    mode: 'dark',
    category: 'Custom',
  }),
};

// Default theme mode
export const defaultThemeMode: ThemeMode = 'system';

// Helper to get the theme based on mode and system preference
export const getThemeByMode = (
  mode: ThemeMode,
  systemPrefersDark: boolean
): Theme => {
  switch (mode) {
    case 'light':
      return lightTheme;
    case 'dark':
      return darkTheme;
    case 'system':
      return systemPrefersDark ? darkTheme : lightTheme;
    default:
      return lightTheme;
  }
};

// Generate color palette for documentation
export function generateColorPalette(theme: Theme): Record<string, string> {
  const { mainColorName, accentColorName, neutralColorName } = theme.palette;
  const mainPalette = getColorPalette(mainColorName);
  const accentPalette = getColorPalette(accentColorName);
  const neutralPalette = getColorPalette(neutralColorName);

  // Creates a flattened map of all colors for documentation
  return {
    // All theme colors with their hex values
    ...theme.colors,

    // Add main palette shades
    [`${mainColorName}50`]: mainPalette[50],
    [`${mainColorName}100`]: mainPalette[100],
    [`${mainColorName}200`]: mainPalette[200],
    [`${mainColorName}300`]: mainPalette[300],
    [`${mainColorName}400`]: mainPalette[400],
    [`${mainColorName}500`]: mainPalette[500],
    [`${mainColorName}600`]: mainPalette[600],
    [`${mainColorName}700`]: mainPalette[700],
    [`${mainColorName}800`]: mainPalette[800],
    [`${mainColorName}900`]: mainPalette[900],
    [`${mainColorName}950`]: mainPalette[950],

    // Add accent palette shades
    [`${accentColorName}50`]: accentPalette[50],
    [`${accentColorName}100`]: accentPalette[100],
    [`${accentColorName}200`]: accentPalette[200],
    [`${accentColorName}300`]: accentPalette[300],
    [`${accentColorName}400`]: accentPalette[400],
    [`${accentColorName}500`]: accentPalette[500],
    [`${accentColorName}600`]: accentPalette[600],
    [`${accentColorName}700`]: accentPalette[700],
    [`${accentColorName}800`]: accentPalette[800],
    [`${accentColorName}900`]: accentPalette[900],
    [`${accentColorName}950`]: accentPalette[950],

    // Add neutral palette shades
    [`${neutralColorName}50`]: neutralPalette[50],
    [`${neutralColorName}100`]: neutralPalette[100],
    [`${neutralColorName}200`]: neutralPalette[200],
    [`${neutralColorName}300`]: neutralPalette[300],
    [`${neutralColorName}400`]: neutralPalette[400],
    [`${neutralColorName}500`]: neutralPalette[500],
    [`${neutralColorName}600`]: neutralPalette[600],
    [`${neutralColorName}700`]: neutralPalette[700],
    [`${neutralColorName}800`]: neutralPalette[800],
    [`${neutralColorName}900`]: neutralPalette[900],
    [`${neutralColorName}950`]: neutralPalette[950],
  };
}

// Helper to generate a color scheme CSS variables object
export function generateThemeCssVars(theme: Theme): Record<string, string> {
  const flatPalette = generateColorPalette(theme);
  const cssVars: Record<string, string> = {};

  // Convert all colors to CSS variables
  Object.entries(flatPalette).forEach(([key, value]) => {
    cssVars[`--color-${key}`] = value;
  });

  return cssVars;
}

// Usage example: Apply theme CSS variables to an element
export function applyThemeToCssVars(
  theme: Theme,
  element: HTMLElement = document.documentElement
): void {
  const cssVars = generateThemeCssVars(theme);

  Object.entries(cssVars).forEach(([prop, value]) => {
    element.style.setProperty(prop, value);
  });
}
