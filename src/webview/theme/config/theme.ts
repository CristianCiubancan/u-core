// config/themes.ts
import { ColorName, ColorShades, TailwindColors } from '../types/colors';
import { Theme, ThemeMode, ThemePalette } from '../types/theme';
import tailwindColors from '../tailwind-colors.json';

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

// Type assertion with our well-defined interface
export const colors = tailwindColors as TailwindColors;

export const getColorPalette = (colorName: ColorName): ColorShades => {
  return colors[colorName];
};
// Create the default light theme
export const lightTheme: Theme = {
  id: 'light',
  name: 'Light',
  palette: lightPalette,
  colors: {
    // Background colors
    background: '#ffffff',
    backgroundMuted: getColorPalette(lightPalette.neutralColorName)[50],
    backgroundSubtle: getColorPalette(lightPalette.neutralColorName)[100],

    // Text colors
    text: getColorPalette(lightPalette.neutralColorName)[900],
    textSecondary: getColorPalette(lightPalette.neutralColorName)[700],
    textMuted: getColorPalette(lightPalette.neutralColorName)[500],

    // Interactive element colors
    primary: getColorPalette(lightPalette.mainColorName)[600],
    primaryHover: getColorPalette(lightPalette.mainColorName)[700],
    primaryActive: getColorPalette(lightPalette.mainColorName)[800],

    secondary: getColorPalette(lightPalette.accentColorName)[600],
    secondaryHover: getColorPalette(lightPalette.accentColorName)[700],
    secondaryActive: getColorPalette(lightPalette.accentColorName)[800],

    // Feedback colors
    success: getColorPalette('green')[600],
    error: getColorPalette('red')[600],
    warning: getColorPalette('amber')[500],
    info: getColorPalette('sky')[500],

    // Border colors
    border: getColorPalette(lightPalette.neutralColorName)[200],
    borderFocus: getColorPalette(lightPalette.mainColorName)[500],

    // Overlay colors
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

// Create the default dark theme
export const darkTheme: Theme = {
  id: 'dark',
  name: 'Dark',
  palette: darkPalette,
  colors: {
    // Background colors
    background: getColorPalette(darkPalette.neutralColorName)[950],
    backgroundMuted: getColorPalette(darkPalette.neutralColorName)[900],
    backgroundSubtle: getColorPalette(darkPalette.neutralColorName)[800],

    // Text colors
    text: getColorPalette(darkPalette.neutralColorName)[100],
    textSecondary: getColorPalette(darkPalette.neutralColorName)[300],
    textMuted: getColorPalette(darkPalette.neutralColorName)[400],

    // Interactive element colors
    primary: getColorPalette(darkPalette.mainColorName)[500],
    primaryHover: getColorPalette(darkPalette.mainColorName)[400],
    primaryActive: getColorPalette(darkPalette.mainColorName)[300],

    secondary: getColorPalette(darkPalette.accentColorName)[500],
    secondaryHover: getColorPalette(darkPalette.accentColorName)[400],
    secondaryActive: getColorPalette(darkPalette.accentColorName)[300],

    // Feedback colors
    success: getColorPalette('green')[500],
    error: getColorPalette('red')[500],
    warning: getColorPalette('amber')[400],
    info: getColorPalette('sky')[400],

    // Border colors
    border: getColorPalette(darkPalette.neutralColorName)[700],
    borderFocus: getColorPalette(darkPalette.mainColorName)[400],

    // Overlay colors
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
};

// Custom theme example - brand theme with specific colors
export const brandTheme: Theme = {
  id: 'brand',
  name: 'Brand',
  palette: {
    mainColorName: 'indigo',
    accentColorName: 'purple',
    neutralColorName: 'slate',
  },
  colors: {
    // Background colors
    background: getColorPalette('indigo')[50],
    backgroundMuted: getColorPalette('indigo')[100],
    backgroundSubtle: getColorPalette('indigo')[200],

    // Text colors
    text: getColorPalette('slate')[900],
    textSecondary: getColorPalette('slate')[700],
    textMuted: getColorPalette('slate')[500],

    // Interactive element colors
    primary: getColorPalette('indigo')[600],
    primaryHover: getColorPalette('indigo')[700],
    primaryActive: getColorPalette('indigo')[800],

    secondary: getColorPalette('purple')[600],
    secondaryHover: getColorPalette('purple')[700],
    secondaryActive: getColorPalette('purple')[800],

    // Feedback colors
    success: getColorPalette('green')[600],
    error: getColorPalette('red')[600],
    warning: getColorPalette('amber')[500],
    info: getColorPalette('sky')[500],

    // Border colors
    border: getColorPalette('slate')[200],
    borderFocus: getColorPalette('indigo')[500],

    // Overlay colors
    overlay: 'rgba(79, 70, 229, 0.4)',
  },
};

// Export a map of all available themes
export const themes: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  brand: brandTheme,
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
