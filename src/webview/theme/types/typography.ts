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

// Default typography implementation
export const defaultFontFamily: FontFamily = {
  sans: ['Inter', 'sans-serif'],
  serif: ['Georgia', 'serif'],
  mono: ['Menlo', 'monospace'],
};

export const defaultFontSize: FontSize = {
  xs: '0.75rem', // 12px
  sm: '0.875rem', // 14px
  base: '1rem', // 16px
  lg: '1.125rem', // 18px
  xl: '1.25rem', // 20px
  '2xl': '1.5rem', // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem', // 48px
  '6xl': '3.75rem', // 60px
  '7xl': '4.5rem', // 72px
  '8xl': '6rem', // 96px
  '9xl': '8rem', // 128px
};

export const defaultFontWeight: FontWeight = {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
};

export const defaultLineHeight: LineHeight = {
  none: '1',
  tight: '1.25',
  snug: '1.375',
  normal: '1.5',
  relaxed: '1.625',
  loose: '2',
  '3': '.75rem',
  '4': '1rem',
  '5': '1.25rem',
  '6': '1.5rem',
  '7': '1.75rem',
  '8': '2rem',
  '9': '2.25rem',
  '10': '2.5rem',
};

export const defaultLetterSpacing: LetterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
};

export const defaultTextStyles: TextStyles = {
  h1: {
    fontFamily: 'sans',
    fontSize: '4xl',
    fontWeight: 'bold',
    lineHeight: 'normal',
  },
  h2: {
    fontFamily: 'sans',
    fontSize: '3xl',
    fontWeight: 'bold',
    lineHeight: 'tight',
  },
  h3: {
    fontFamily: 'sans',
    fontSize: '2xl',
    fontWeight: 'semibold',
    lineHeight: 'tight',
  },
  h4: {
    fontFamily: 'sans',
    fontSize: 'xl',
    fontWeight: 'semibold',
    lineHeight: 'normal',
  },
  h5: {
    fontFamily: 'sans',
    fontSize: 'lg',
    fontWeight: 'medium',
    lineHeight: 'tight',
  },
  h6: {
    fontFamily: 'sans',
    fontSize: 'base',
    fontWeight: 'medium',
    lineHeight: 'tight',
  },
  subtitle1: {
    fontFamily: 'sans',
    fontSize: 'lg',
    fontWeight: 'normal',
    lineHeight: 'normal',
  },
  subtitle2: {
    fontFamily: 'sans',
    fontSize: 'base',
    fontWeight: 'medium',
    lineHeight: 'normal',
  },
  body1: {
    fontFamily: 'sans',
    fontSize: 'base',
    fontWeight: 'normal',
    lineHeight: 'normal',
  },
  body2: {
    fontFamily: 'sans',
    fontSize: 'sm',
    fontWeight: 'normal',
    lineHeight: 'normal',
  },
  button: {
    fontFamily: 'sans',
    fontSize: 'base',
    fontWeight: 'medium',
    lineHeight: 'tight',
    textTransform: 'uppercase',
  },
  caption: {
    fontFamily: 'sans',
    fontSize: 'xs',
    fontWeight: 'normal',
    lineHeight: 'tight',
  },
  overline: {
    fontFamily: 'sans',
    fontSize: 'xs',
    fontWeight: 'normal',
    lineHeight: 'tight',
    textTransform: 'uppercase',
  },
  code: {
    fontFamily: 'mono',
    fontSize: 'sm',
    fontWeight: 'normal',
    lineHeight: 'normal',
  },
};

export const defaultTypography: Typography = {
  fontFamily: defaultFontFamily,
  fontSize: defaultFontSize,
  fontWeight: defaultFontWeight,
  lineHeight: defaultLineHeight,
  letterSpacing: defaultLetterSpacing,
};
