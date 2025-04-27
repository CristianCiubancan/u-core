import { ColorName } from './colors';

// Semantic color roles that make up our theme
export interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundMuted: string;
  backgroundSubtle: string;

  // Content
  text: string;
  textSecondary: string;
  textMuted: string;

  // Interactive elements
  primary: string;
  primaryHover: string;
  primaryActive: string;

  secondary: string;
  secondaryHover: string;
  secondaryActive: string;

  // Feedback colors
  success: string;
  error: string;
  warning: string;
  info: string;

  // Border colors
  border: string;
  borderFocus: string;

  // Overlay colors
  overlay: string;
}

// Base palette defines what colors we're using for our themes
export interface ThemePalette {
  // Colors from our existing palette to use
  mainColorName: ColorName;
  accentColorName: ColorName;
  neutralColorName: ColorName;

  // Additional custom colors that might not be in the Tailwind palette
  customColors?: Record<string, string>;
}

// Actual theme configuration that combines palette with specific color assignments
export interface Theme {
  id: string;
  name: string;
  palette: ThemePalette;
  colors: ThemeColors;
}

// Theme mode (light, dark, system, etc.)
export type ThemeMode = 'light' | 'dark' | 'system';

// Theme context state
export interface ThemeContextState {
  currentTheme: Theme;
  mode: ThemeMode;
  setTheme: (theme: Theme) => void;
  setMode: (mode: ThemeMode) => void;
  themes: Record<string, Theme>;
}
