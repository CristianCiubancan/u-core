// Flat config — ESLint 9.x.
// Scope is intentionally narrow on first introduction: rules cover obvious
// bugs (no-undef, no-unused-vars) plus React Hooks rules. Style is owned by
// Prettier and not duplicated here.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'txData/**',
      'fivem-binaries/**',
      'asset-server/node_modules/**',
      'asset-server/public/**',
      'asset-server/original/**',
      'dist/**',
      '**/dist/**',
      '**/.tmp.*/**',
      'pnpm-lock.yaml',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        // FXServer natives surfaced by @citizenfx/{server,client} types.
        GetConvar: 'readonly',
        GetConvarInt: 'readonly',
        GetCurrentResourceName: 'readonly',
        GetNumResources: 'readonly',
        GetResourceByFindIndex: 'readonly',
        GetResourceState: 'readonly',
        StartResource: 'readonly',
        StopResource: 'readonly',
        RegisterCommand: 'readonly',
      },
    },
    rules: {
      // Allow underscore-prefixed unused args (the convention this codebase
      // already uses, e.g. `(_, success) => !success`).
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // The codebase still has `any` at the NUI / FXServer boundaries
      // pending PR-05 / PR-06; downgrade to warn so the introductory config
      // surfaces them without blocking CI on day one.
      '@typescript-eslint/no-explicit-any': 'warn',
      // `prefer-const` is real but pre-existing in several files audited
      // for refactor by upcoming PRs. Warn now, ratchet to error after
      // those PRs land.
      'prefer-const': 'warn',
      // `require()` calls live in legacy JS scripts (start-windows.js,
      // asset-server). Migrating them to ESM is out of PR-18's scope.
      '@typescript-eslint/no-require-imports': 'warn',
      // Pre-existing stylistic violations the introductory config should
      // surface but not block CI on.
      'no-useless-escape': 'warn',
      'no-case-declarations': 'warn',
    },
  },
  {
    files: ['**/*.{tsx,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The new JSX transform doesn't require React to be in scope for JSX.
      'react/react-in-jsx-scope': 'off',
      // Default props can be expressed via TypeScript defaults.
      'react/prop-types': 'off',
      // Pre-existing conditional-hook violation in webview/components/forms/
      // ColorPicker.tsx:53 (React.useId inside a callback). Real bug;
      // downgraded to warn here so this PR doesn't pretend to have fixed
      // it. Track as a separate task.
      'react-hooks/rules-of-hooks': 'warn',
    },
  },
];
