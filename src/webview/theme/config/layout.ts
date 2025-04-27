// config/layout.ts
// Implementation of the spacing and layout system

import {
  SpacingScale,
  defaultSpacing,
  SemanticSpacing,
  defaultSemanticSpacing,
  Breakpoints,
  defaultBreakpoints,
  GridSystem,
  defaultGridSystem,
} from '../types/spacing';
import { Theme } from '../types/theme';

// Complete layout configuration that can be customized per theme
export interface LayoutConfig {
  spacing: SpacingScale;
  semanticSpacing: SemanticSpacing;
  breakpoints: Breakpoints;
  grid: GridSystem;
}

// Default layout configuration
export const defaultLayoutConfig: LayoutConfig = {
  spacing: defaultSpacing,
  semanticSpacing: defaultSemanticSpacing,
  breakpoints: defaultBreakpoints,
  grid: defaultGridSystem,
};

// Generate spacing CSS variables from the config
export function generateSpacingCssVars(
  config: LayoutConfig
): Record<string, string> {
  const cssVars: Record<string, string> = {};

  // Convert spacing scale to CSS variables
  Object.entries(config.spacing).forEach(([key, value]) => {
    cssVars[`--spacing-${key.replace('.', '-')}`] = value;
  });

  // Convert semantic spacing to CSS variables
  Object.entries(config.semanticSpacing).forEach(([key, value]) => {
    cssVars[`--${key}`] = config.spacing[value as keyof SpacingScale];
  });

  // Convert breakpoints to CSS variables
  Object.entries(config.breakpoints).forEach(([key, value]) => {
    cssVars[`--breakpoint-${key}`] = value;
  });

  // Convert grid config to CSS variables
  cssVars['--grid-columns'] = config.grid.columns.toString();
  cssVars['--grid-gutter'] = config.spacing[config.grid.gutter];

  // Container max widths and paddings for each breakpoint
  Object.entries(config.grid.containerMaxWidth).forEach(
    ([breakpoint, width]) => {
      cssVars[`--container-max-width-${breakpoint}`] = width;
    }
  );

  Object.entries(config.grid.containerPadding).forEach(
    ([breakpoint, padding]) => {
      cssVars[`--container-padding-${breakpoint}`] = config.spacing[padding];
    }
  );

  return cssVars;
}

// Apply layout CSS variables to an element (similar to theme vars)
export function applyLayoutToCssVars(
  config: LayoutConfig,
  element: HTMLElement = document.documentElement
): void {
  const cssVars = generateSpacingCssVars(config);

  Object.entries(cssVars).forEach(([prop, value]) => {
    element.style.setProperty(prop, value);
  });
}

// Integrate layout with theme system
export function extendThemeWithLayout(
  theme: Theme,
  layoutConfig: LayoutConfig = defaultLayoutConfig
): Theme & { layout: LayoutConfig } {
  return {
    ...theme,
    layout: layoutConfig,
  };
}

// Helper to create a custom layout config
export function createCustomLayout(
  options: Partial<LayoutConfig> = {}
): LayoutConfig {
  return {
    spacing: options.spacing || defaultSpacing,
    semanticSpacing: options.semanticSpacing || defaultSemanticSpacing,
    breakpoints: options.breakpoints || defaultBreakpoints,
    grid: options.grid || defaultGridSystem,
  };
}

// Generate a responsive container class
export function createResponsiveContainer(
  config: LayoutConfig = defaultLayoutConfig
): Record<string, any> {
  const containerStyles: Record<string, any> = {
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
  };

  // Add padding based on the smallest breakpoint
  const smallestBreakpoint = Object.keys(
    config.breakpoints
  )[0] as keyof Breakpoints;
  const basePadding =
    config.spacing[config.grid.containerPadding[smallestBreakpoint]];
  containerStyles.paddingLeft = basePadding;
  containerStyles.paddingRight = basePadding;

  // Add responsive max-widths and paddings
  const mediaQueries: Record<string, any> = {};

  Object.entries(config.breakpoints).forEach(([breakpoint, minWidth]) => {
    const bpKey = breakpoint as keyof Breakpoints;
    const maxWidth = config.grid.containerMaxWidth[bpKey];
    const padding = config.spacing[config.grid.containerPadding[bpKey]];

    mediaQueries[`@media (min-width: ${minWidth})`] = {
      maxWidth,
      paddingLeft: padding,
      paddingRight: padding,
    };
  });

  return { ...containerStyles, ...mediaQueries };
}

// Helper for creating a grid row
export function createGridRow(
  config: LayoutConfig = defaultLayoutConfig
): Record<string, any> {
  return {
    display: 'flex',
    flexWrap: 'wrap',
    marginLeft: `calc(-1 * ${config.spacing[config.grid.gutter]})`,
    marginRight: `calc(-1 * ${config.spacing[config.grid.gutter]})`,
  };
}

// Helper for creating grid columns with responsive widths
export function createGridColumn(
  spans: Record<keyof Breakpoints, number>,
  config: LayoutConfig = defaultLayoutConfig
): Record<string, any> {
  const columnStyles: Record<string, any> = {
    paddingLeft: config.spacing[config.grid.gutter],
    paddingRight: config.spacing[config.grid.gutter],
    width: '100%', // Default for smallest screens
  };

  // Add responsive column spans
  const mediaQueries: Record<string, any> = {};

  Object.entries(config.breakpoints).forEach(([breakpoint, minWidth]) => {
    const bpKey = breakpoint as keyof Breakpoints;
    if (spans[bpKey]) {
      const width = `${(spans[bpKey] / config.grid.columns) * 100}%`;

      if (breakpoint === Object.keys(config.breakpoints)[0]) {
        // For the smallest breakpoint, set directly
        columnStyles.width = width;
      } else {
        // For larger breakpoints, use media queries
        mediaQueries[`@media (min-width: ${minWidth})`] = {
          width,
        };
      }
    }
  });

  return { ...columnStyles, ...mediaQueries };
}

// Helper to create consistent spacing utilities
export function createSpacingUtilities(
  config: LayoutConfig = defaultLayoutConfig
): Record<string, Record<string, string>> {
  const utilities: Record<string, Record<string, string>> = {
    margin: {},
    marginTop: {},
    marginRight: {},
    marginBottom: {},
    marginLeft: {},
    padding: {},
    paddingTop: {},
    paddingRight: {},
    paddingBottom: {},
    paddingLeft: {},
    gap: {},
  };

  // Generate all spacing variations
  Object.entries(config.spacing).forEach(([key, value]) => {
    const safeKey = key.replace('.', '-');

    utilities.margin[`m-${safeKey}`] = value;
    utilities.marginTop[`mt-${safeKey}`] = value;
    utilities.marginRight[`mr-${safeKey}`] = value;
    utilities.marginBottom[`mb-${safeKey}`] = value;
    utilities.marginLeft[`ml-${safeKey}`] = value;
    utilities.padding[`p-${safeKey}`] = value;
    utilities.paddingTop[`pt-${safeKey}`] = value;
    utilities.paddingRight[`pr-${safeKey}`] = value;
    utilities.paddingBottom[`pb-${safeKey}`] = value;
    utilities.paddingLeft[`pl-${safeKey}`] = value;
    utilities.gap[`gap-${safeKey}`] = value;
  });

  return utilities;
}
