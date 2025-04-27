export interface CustomThemeOptions {
  brandColor: string;
  grayColor: string;
  accentColor: string; // Added: For additional theming
  colorScheme: string; // Added: Harmony scheme
  contrastThreshold: number; // Added: WCAG standard
  primaryShade: number; // Added: Default shade for primary color
  enableDarkMode: boolean; // Added: Flag for dark mode support
  customBreakpoints: any; // Added: Reference to imported breakpoints for modularity; adjust type as needed
}

// Then create a variable to hold your theme options
export const themeOptions: CustomThemeOptions = {
  brandColor: 'indigo',
  grayColor: 'gray',
  accentColor: 'violet', // Added: Default value for accent color
  colorScheme: 'analogous', // Added: Default value for color scheme
  contrastThreshold: 4.5, // Added: Default value for contrast threshold
  primaryShade: 500, // Added: Default value for primary shade
  enableDarkMode: true, // Added: Default value for dark mode
  customBreakpoints: {}, // Added: Default empty object for custom breakpoints
};
