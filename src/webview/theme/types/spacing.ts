// types/spacing.ts
// Defines the spacing system for consistent margins, padding, and layout

// Basic spacing scale (in rem units)
export interface SpacingScale {
  px: string; // 1px
  0: string; // 0px
  0.5: string; // 2px
  1: string; // 4px
  1.5: string; // 6px
  2: string; // 8px
  2.5: string; // 10px
  3: string; // 12px
  3.5: string; // 14px
  4: string; // 16px
  5: string; // 20px
  6: string; // 24px
  7: string; // 28px
  8: string; // 32px
  9: string; // 36px
  10: string; // 40px
  11: string; // 44px
  12: string; // 48px
  14: string; // 56px
  16: string; // 64px
  20: string; // 80px
  24: string; // 96px
  28: string; // 112px
  32: string; // 128px
  36: string; // 144px
  40: string; // 160px
  44: string; // 176px
  48: string; // 192px
  52: string; // 208px
  56: string; // 224px
  60: string; // 240px
  64: string; // 256px
  72: string; // 288px
  80: string; // 320px
  96: string; // 384px
}

// Default spacing scale values
export const defaultSpacing: SpacingScale = {
  px: '1px',
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
  44: '11rem', // 176px
  48: '12rem', // 192px
  52: '13rem', // 208px
  56: '14rem', // 224px
  60: '15rem', // 240px
  64: '16rem', // 256px
  72: '18rem', // 288px
  80: '20rem', // 320px
  96: '24rem', // 384px
};

// Space between components
export type ComponentSpacing =
  | 'none'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl'
  | '2xl'
  | '3xl'
  | '4xl';

// Mapping of component spacing to spacing scale values
export const componentSpacingValues: Record<
  ComponentSpacing,
  keyof SpacingScale
> = {
  none: 0,
  xs: 1,
  sm: 2,
  md: 4,
  lg: 6,
  xl: 8,
  '2xl': 12,
  '3xl': 16,
  '4xl': 24,
};

// Semantic spacing for specific UI patterns
export interface SemanticSpacing {
  // Inset padding for containers
  containerPadding: keyof SpacingScale;
  // Space between related elements
  elementSpacing: keyof SpacingScale;
  // Space between unrelated element groups
  sectionSpacing: keyof SpacingScale;
  // Space at page/container margins
  pagePadding: keyof SpacingScale;
  // Space between stacked components
  stackSpacing: keyof SpacingScale;
  // Space between inline elements
  inlineSpacing: keyof SpacingScale;
}

// Default semantic spacing
export const defaultSemanticSpacing: SemanticSpacing = {
  containerPadding: 6,
  elementSpacing: 4,
  sectionSpacing: 12,
  pagePadding: 6,
  stackSpacing: 4,
  inlineSpacing: 2,
};

// Layout breakpoints for responsive design
export interface Breakpoints {
  xs: string; // Extra small screens (phones)
  sm: string; // Small screens (large phones, small tablets)
  md: string; // Medium screens (tablets)
  lg: string; // Large screens (desktops)
  xl: string; // Extra large screens (large desktops)
  '2xl': string; // Wide screens
}

// Default breakpoint values
export const defaultBreakpoints: Breakpoints = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Grid system configuration
export interface GridSystem {
  // Number of columns in the grid
  columns: number;
  // Gutter size between columns
  gutter: keyof SpacingScale;
  // Container max width at each breakpoint
  containerMaxWidth: Record<keyof Breakpoints, string>;
  // Container padding at each breakpoint
  containerPadding: Record<keyof Breakpoints, keyof SpacingScale>;
}

// Default grid system
export const defaultGridSystem: GridSystem = {
  columns: 12,
  gutter: 4,
  containerMaxWidth: {
    xs: '100%',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  containerPadding: {
    xs: 4,
    sm: 6,
    md: 6,
    lg: 8,
    xl: 8,
    '2xl': 8,
  },
};

// Aspect ratios for consistent media containers
export type AspectRatio =
  | '1/1'
  | '4/3'
  | '16/9'
  | '21/9'
  | '2/3'
  | '3/2'
  | '3/4'
  | '9/16';
