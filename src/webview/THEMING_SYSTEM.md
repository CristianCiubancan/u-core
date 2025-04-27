# UI Theming System Documentation

## 📚 Introduction

Our theming system provides a comprehensive, token-based approach to styling components consistently across the application. Built on top of Tailwind CSS, it provides powerful customization options while maintaining design consistency and accessibility.

## 🧩 Core Concepts

- **Token-based design**: All visual properties are derived from a centralized set of design tokens
- **Semantic colors**: Colors have semantic meaning beyond just their visual appearance
- **Accessibility-first**: Built-in contrast checking and accessible text utilities
- **Dark mode support**: Seamless switching between light and dark themes
- **CSS Variables**: Runtime theming capabilities through CSS custom properties
- **Tailwind plugins**: Extended utility classes for specialized UI patterns

## 🎨 Theme Tokens

### Colors

```javascript
// Basic usage with theme variables
const primary = theme('colors.primary.500');
const textColor = theme('colors.text.primary');
```

Our color system includes:

- **Base color scales**: Full range (50-950) for primary, gray, and accent colors
- **Semantic colors**: Purpose-based colors like text, background, border, etc.
- **State colors**: Success, error, warning, and info colors
- **Surface colors**: Subtle background variations for different contexts

### Typography

```javascript
// Font families
fontFamily: {
  sans: ['Inter var', 'Inter', 'ui-sans-serif', 'system-ui'],
  serif: ['ui-serif', 'Georgia', 'Cambria', 'serif'],
  mono: ['Fira Code', 'ui-monospace', 'SFMono-Regular'],
  display: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
}

// Font sizes with line heights
fontSize: {
  base: ['1rem', { lineHeight: '1.5rem' }], // 16px
  lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
  // Other sizes from 2xs to 9xl
}
```

Typography includes tokens for:

- Font families
- Font sizes (with appropriate line heights)
- Font weights
- Letter spacing
- Line heights
- Pre-defined text styles

### Spacing

Consistent spacing scale based on 4px (0.25rem) increments:

```javascript
spacing: {
  px: '1px',
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem',    // 4px
  2: '0.5rem',     // 8px
  // ... up to 96: '24rem' (384px)
}
```

### Border Radius

```javascript
borderRadius: {
  none: '0',
  sm: '0.125rem',  // 2px
  base: '0.25rem', // 4px
  md: '0.375rem',  // 6px
  // ... up to full: '9999px'
}
```

### Elevation (Shadows)

```javascript
elevation: {
  none: 'none',
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  // ... up to 2xl and special types
}
```

### Animation

```javascript
animation: {
  transitionProperty: {
    none: 'none',
    all: 'all',
    DEFAULT: 'background-color, border-color, color, fill, stroke, opacity, box-shadow, transform',
    // Other properties
  },
  transitionTimingFunction: {
    DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
    // Other timing functions
  },
  transitionDuration: {
    DEFAULT: '150ms',
    // Other durations
  }
}
```

## 🔌 Tailwind Plugins

### Accessible Text Plugin

Provides utilities for ensuring text is readable on different backgrounds:

```html
<div class="bg-primary-600">
  <p class="text-on-brand">This text will be properly contrasted</p>
</div>

<div class="bg-gray-800">
  <p class="text-on-dark">White text for dark backgrounds</p>
</div>
```

Available utilities:

- `text-on-light`: For light backgrounds
- `text-on-dark`: For dark backgrounds
- `text-on-brand`: Automatically adjusts based on brand color
- `text-on-glass-dark/light`: For glass morphism elements
- `text-primary/secondary/tertiary`: Semantic text styles
- `high-contrast`: Additional contrast enhancement

### Glass Morphism Plugin

Creates modern glass-like UI elements:

```html
<div class="glass p-4">Glass card with light background</div>

<div class="glass-dark p-4">Glass card with dark background</div>

<div class="glass-brand p-4">Brand-colored glass effect</div>
```

Available variants:

- `glass`: Standard light glass effect
- `glass-dark`: Dark glass effect
- `glass-brand`: Brand-colored glass effect
- `glass-brand-dark`: Dark brand-colored glass effect
- `glass-bg/glass-bg-dark`: Just background effect without borders/shadows
- `glass-subtle/glass-subtle-dark`: Subtle glass variants
- Gaming UI variants: `glass-gaming`, `glass-button`, `glass-header`, `glass-sidebar`, `glass-active`

### Scrollbar Plugin

Customizes scrollbars for better visual integration:

```html
<div class="scrollbar-light h-64 overflow-y-auto">
  Content with custom scrollbar
</div>
```

Available variants:

- `scrollbar-light`: Light theme scrollbars
- `scrollbar-dark`: Dark theme scrollbars
- `scrollbar-brand`: Brand-colored scrollbars
- `scrollbar-thin/scrollbar-thin-dark`: Thin scrollbars for compact UI elements
- `scrollbar-hidden`: Hide scrollbars but keep functionality
- `scrollbar-rounded`: Rounded scrollbars
- `scrollbar-subtle`: Subtle scrollbars with shadow
- `scrollbar-glass/scrollbar-glass-dark`: Glass-style scrollbars

## 🛠 Utility Functions

### Color Utilities

```javascript
// Convert hex color to RGB values
hexToRgb('#3b82f6'); // Returns "59, 130, 246"

// Determine contrast ratio between colors
getContrastRatio('#ffffff', '#111827'); // Returns contrast ratio (1-21)

// Get appropriate text color for a background
getAccessibleTextColor('#3b82f6'); // Returns black or white depending on contrast

// Adjust color lightness
adjustColorLightness('#3b82f6', 0.2); // Lightens the color
adjustColorLightness('#3b82f6', -0.2); // Darkens the color

// Generate a full color palette from a base color
generateColorPalette('#3b82f6'); // Returns object with shades 50-950
```

### Style Utilities

```javascript
// Create glass effect styles
createGlassStyles({
  background: 'rgba(255, 255, 255, 0.7)',
  border: 'rgba(255, 255, 255, 0.2)',
  shadowColor: '#111827',
  shadowOpacity: 0.15,
  borderRadius: '0.75rem',
  backdropBlur: '12px',
});

// Create custom scrollbar styles
createScrollbarStyles({
  width: '8px',
  trackColor: 'transparent',
  thumbColor: 'rgba(100, 116, 139, 0.5)',
  thumbHoverColor: 'rgba(100, 116, 139, 0.7)',
  borderRadius: '4px',
});
```

## ⚙️ Theme Configuration

### Basic Configuration

```javascript
// tailwind.config.js
const { resolveTokens } = require('./theme/tokens/resolver');

module.exports = {
  theme: resolveTokens('light', {
    brandColor: 'indigo',
    grayColor: 'zinc',
    accentColor: 'violet',
    colorScheme: 'analogous',
    contrastThreshold: 4.5,
  }),
  plugins: [
    require('./theme/plugins/accessibleText').accessibleTextPlugin,
    require('./theme/plugins/glassMorphism').glassMorphismPlugin,
    require('./theme/plugins/scrollbar').scrollbarPlugin,
  ],
};
```

### Theme Options

```javascript
interface ThemeOptions {
  brandColor: ColorPaletteName | string; // Tailwind color name or hex
  grayColor: ColorPaletteName;
  accentColor?: ColorPaletteName | string; // Optional accent color
  contrastThreshold?: number; // WCAG contrast threshold (default: 4.5)
  colorScheme?:
    | 'analogous'
    | 'complementary'
    | 'triadic'
    | 'tetradic'
    | 'monochromatic';
  saturationAdjustment?: number; // (-1 to 1)
  brightnessAdjustment?: number; // (-1 to 1)
}
```

### Theme Presets

```javascript
// Apply a preset for quick theming
const theme = applyThemePreset('vibrant', {
  brandColor: 'purple',
});

// Available presets:
// 'default', 'vibrant', 'muted', 'pastel', 'dark', 'light', 'high-contrast'
```

## 🔄 Dark Mode Support

Our theming system provides robust dark mode support through CSS variables:

```javascript
// Generate CSS variables for light and dark mode
const lightModeVars = generateColorCssVariables(themeOptions, 'light');
const darkModeVars = generateColorCssVariables(themeOptions, 'dark');

// Apply in your CSS
`:root {
  ${lightModeVars}
}

@media (prefers-color-scheme: dark) {
  :root {
    ${darkModeVars}
  }
}

html[data-theme="dark"] {
  ${darkModeVars}
}
`;
```

## 📱 Responsive Typography

Fluid typography utilities for responsive text sizing:

```html
<h1 class="text-fluid-3xl">
  This heading scales smoothly between viewport sizes
</h1>
<p class="text-fluid-base">This paragraph text also scales fluidly</p>

<!-- Available classes -->
<!-- text-fluid-xs, text-fluid-sm, text-fluid-base, text-fluid-lg, text-fluid-xl -->
<!-- text-fluid-2xl, text-fluid-3xl, text-fluid-4xl, text-fluid-5xl -->
```

## 🔎 Accessibility Features

- **Contrast checking**: `getContrastRatio()` ensures WCAG compliance
- **Accessible text**: `text-on-*` utilities ensure readable text
- **High contrast mode**: `high-contrast` utility for maximum readability
- **Focus indicators**: Proper focus states for interactive elements

## 📋 Best Practices

1. **Use semantic tokens over direct color values**

   ```javascript
   // Good
   <div class="text-primary-600 bg-surface-primary">

   // Avoid
   <div class="text-blue-600 bg-blue-50">
   ```

2. **Leverage predefined text styles**

   ```javascript
   // Good
   <h1 class="text-2xl font-bold text-text-primary">

   // Even better
   <h1 class="text-h1">
   ```

3. **Use glass effects consistently**

   ```html
   <div class="glass-brand p-4 mb-4">
     <h3 class="text-on-brand">Card Title</h3>
   </div>
   ```

4. **Apply custom scrollbars for better integration**

   ```html
   <div class="h-64 overflow-y-auto scrollbar-brand">
     <!-- Long content -->
   </div>
   ```

5. **Use responsive typography for fluid layouts**
   ```html
   <h1 class="text-fluid-4xl">Responsive Heading</h1>
   ```

---

For more information, refer to the source code in the `theme` directory.
