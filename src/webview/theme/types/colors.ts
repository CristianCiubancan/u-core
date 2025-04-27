export interface ColorShades {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

// Define the structure of our colors object
export interface TailwindColors {
  black: string;
  white: string;
  transparent: string;
  current: string;
  inherit: string;
  slate: ColorShades;
  gray: ColorShades;
  zinc: ColorShades;
  neutral: ColorShades;
  stone: ColorShades;
  red: ColorShades;
  orange: ColorShades;
  amber: ColorShades;
  yellow: ColorShades;
  lime: ColorShades;
  green: ColorShades;
  emerald: ColorShades;
  teal: ColorShades;
  cyan: ColorShades;
  sky: ColorShades;
  blue: ColorShades;
  indigo: ColorShades;
  violet: ColorShades;
  purple: ColorShades;
  fuchsia: ColorShades;
  pink: ColorShades;
  rose: ColorShades;
}

// Define valid color names
export type ColorName = keyof Omit<
  TailwindColors,
  'black' | 'white' | 'transparent' | 'current' | 'inherit'
>;
