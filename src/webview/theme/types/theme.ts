// types/theme.ts (expanded)
import { ColorName } from './colors';

// Extended semantic color roles
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
  primarySubtle: string; // New - for subtle primary backgrounds
  primaryOutline: string; // New - for outlined variants

  secondary: string;
  secondaryHover: string;
  secondaryActive: string;
  secondarySubtle: string; // New - for subtle secondary backgrounds
  secondaryOutline: string; // New - for outlined variants

  // Feedback colors
  success: string;
  successSubtle: string; // New
  error: string;
  errorSubtle: string; // New
  warning: string;
  warningSubtle: string; // New
  info: string;
  infoSubtle: string; // New

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
  category?: string; // Optional category for grouping themes
  description?: string; // Optional description
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
