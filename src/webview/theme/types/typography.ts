// types/typography.ts
export interface FontFamily {
  sans: string[];
  serif: string[];
  mono: string[];
  // Custom font families can be added here
}

export interface FontSize {
  xs: string;
  sm: string;
  base: string;
  lg: string;
  xl: string;
  '2xl': string;
  '3xl': string;
  '4xl': string;
  '5xl': string;
  '6xl': string;
  '7xl': string;
  '8xl': string;
  '9xl': string;
}

export interface FontWeight {
  thin: number;
  extralight: number;
  light: number;
  normal: number;
  medium: number;
  semibold: number;
  bold: number;
  extrabold: number;
  black: number;
}

export interface LineHeight {
  none: string;
  tight: string;
  snug: string;
  normal: string;
  relaxed: string;
  loose: string;
  // Specific line heights
  '3': string;
  '4': string;
  '5': string;
  '6': string;
  '7': string;
  '8': string;
  '9': string;
  '10': string;
}

export interface LetterSpacing {
  tighter: string;
  tight: string;
  normal: string;
  wide: string;
  wider: string;
  widest: string;
}

// Comprehensive typography settings
export interface Typography {
  fontFamily: FontFamily;
  fontSize: FontSize;
  fontWeight: FontWeight;
  lineHeight: LineHeight;
  letterSpacing: LetterSpacing;
}

// Text styles for different purposes (headings, body, etc.)
export interface TextStyles {
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  h4: TextStyle;
  h5: TextStyle;
  h6: TextStyle;
  subtitle1: TextStyle;
  subtitle2: TextStyle;
  body1: TextStyle;
  body2: TextStyle;
  button: TextStyle;
  caption: TextStyle;
  overline: TextStyle;
  code: TextStyle;
}

// Properties of an individual text style
export interface TextStyle {
  fontFamily: keyof FontFamily;
  fontSize: keyof FontSize;
  fontWeight: keyof FontWeight;
  lineHeight: keyof LineHeight;
  letterSpacing?: keyof LetterSpacing;
  textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
  // Optional theme-responsive properties
  color?: string;
  darkColor?: string;
}
