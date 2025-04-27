// src/theme/tokens/index.ts
// The root file that exports all design tokens

export * from './colors.js';
export * from './typography.js';
export * from './spacing.js';
export * from './elevation.js';
export * from './radius.js';
export * from './animation.js';

// Re-export the theme resolver for convenience
export { resolveTokens } from './resolver.js';
