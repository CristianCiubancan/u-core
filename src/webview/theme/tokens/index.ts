// src/theme/tokens/index.ts
// The root file that exports all design tokens

export * from './colors';
export * from './typography';
export * from './spacing';
export * from './elevation';
export * from './radius';
export * from './animation';

// Re-export the theme resolver for convenience
export { resolveTokens } from './resolver';
