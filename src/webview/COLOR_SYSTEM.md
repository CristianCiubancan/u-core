# U-Core Color System Documentation

This document explains the color system used in the U-Core project, including the structure, usage, and best practices.

## Overview

The U-Core color system follows a modern approach using both core tokens (raw color values) and semantic tokens (contextual usage). This structure provides flexibility, maintainability, and consistency across the application.

## Core Tokens

Core tokens are the raw color values organized in palettes with consistent shade numbers:
- **50-300**: Light shades
- **400-600**: Medium shades
- **700-950**: Dark shades

### Primary Brand Colors

- **Indigo**: Our primary brand color, providing a modern, professional look
- **Violet**: Our secondary brand color, complementing indigo well

### Neutral Colors

- **Slate**: Our default gray palette with a cool tone
- **Gray**: An alternative neutral gray palette
- **Zinc**: An alternative warm-toned gray palette

### Functional Colors

- **Green**: Success states and positive actions
- **Amber**: Warning states and cautionary actions
- **Red**: Error states and destructive actions

## Semantic Tokens

Semantic tokens define how colors are used in specific contexts. They reference core tokens to ensure consistency while providing meaningful names that describe their purpose.

### UI Element Colors

```
ui.background.page: 'slate.50'
ui.background.card: 'white'
ui.background.modal: 'white'
ui.background.input.default: 'white'
ui.background.input.disabled: 'slate.100'
ui.background.hover: 'slate.100'
ui.background.selected: 'indigo.50'
ui.background.disabled: 'slate.100'

ui.border.default: 'slate.200'
ui.border.focus: 'indigo.300'
ui.border.hover: 'slate.300'
ui.border.error: 'red.300'

ui.text.primary: 'slate.900'
ui.text.secondary: 'slate.600'
ui.text.tertiary: 'slate.400'
ui.text.inverted: 'white'
ui.text.link: 'indigo.600'
ui.text.error: 'red.600'
ui.text.disabled: 'slate.400'
```

### Feedback Colors

```
feedback.success.background: 'green.50'
feedback.success.border: 'green.200'
feedback.success.text: 'green.800'
feedback.success.icon: 'green.500'

feedback.warning.background: 'amber.50'
feedback.warning.border: 'amber.200'
feedback.warning.text: 'amber.800'
feedback.warning.icon: 'amber.500'

feedback.error.background: 'red.50'
feedback.error.border: 'red.200'
feedback.error.text: 'red.800'
feedback.error.icon: 'red.500'

feedback.info.background: 'indigo.50'
feedback.info.border: 'indigo.200'
feedback.info.text: 'indigo.800'
feedback.info.icon: 'indigo.500'
```

### Button Colors

```
button.primary.background.default: 'indigo.600'
button.primary.background.hover: 'indigo.700'
button.primary.background.active: 'indigo.800'
button.primary.background.disabled: 'slate.300'
button.primary.text.default: 'white'
button.primary.text.disabled: 'slate.400'

button.secondary.background.default: 'slate.100'
button.secondary.background.hover: 'slate.200'
button.secondary.background.active: 'slate.300'
button.secondary.background.disabled: 'slate.50'
button.secondary.text.default: 'slate.800'
button.secondary.text.disabled: 'slate.400'

button.danger.background.default: 'red.600'
button.danger.background.hover: 'red.700'
button.danger.background.active: 'red.800'
button.danger.background.disabled: 'slate.300'
button.danger.text.default: 'white'
button.danger.text.disabled: 'slate.400'
```

### Glass Effect Colors

```
glass.light.background: 'rgba(255, 255, 255, 0.7)'
glass.light.border: 'rgba(255, 255, 255, 0.2)'
glass.light.text: 'slate.800'

glass.dark.background: 'rgba(15, 23, 42, 0.8)'
glass.dark.border: 'rgba(51, 65, 85, 0.2)'
glass.dark.text: 'white'

glass.brand.light.background: 'rgba(224, 231, 255, 0.7)'
glass.brand.light.border: 'rgba(165, 180, 252, 0.3)'
glass.brand.light.text: 'indigo.900'

glass.brand.dark.background: 'rgba(55, 48, 163, 0.8)'
glass.brand.dark.border: 'rgba(79, 70, 229, 0.3)'
glass.brand.dark.text: 'white'
```

## Usage in Tailwind CSS

The color system is integrated with Tailwind CSS, allowing you to use both core and semantic tokens in your classes.

### Core Token Usage

```html
<div class="bg-indigo-600 text-white">Primary Button</div>
<div class="bg-slate-100 text-slate-800">Secondary Button</div>
```

### Semantic Token Usage

```html
<div class="bg-ui-background-page">Page Background</div>
<div class="text-ui-text-primary">Primary Text</div>
<div class="border-ui-border-focus">Focused Input</div>
<div class="bg-feedback-success-background text-feedback-success-text">Success Message</div>
```

### Glass Effect Usage

```html
<div class="glass">Light Glass Container</div>
<div class="glass-dark">Dark Glass Container</div>
<div class="glass-brand">Light Brand Glass Container</div>
<div class="glass-brand-dark">Dark Brand Glass Container</div>
```

## Best Practices

1. **Use semantic tokens whenever possible** - They provide context and meaning to your colors
2. **Avoid hardcoding color values** - Always reference the color system
3. **Maintain contrast ratios** - Ensure text has sufficient contrast with its background
4. **Be consistent** - Use the same colors for similar UI elements
5. **Use the appropriate color for the context** - Success for positive actions, error for destructive actions, etc.

## Customization

To change the brand colors or gray palette, modify the configuration in `tailwind.config.js`:

```js
const config = {
  brandColor: 'indigo', // Change to any available color palette
  grayColor: 'slate',   // Change to 'gray' or 'zinc' for different tones
};
```

## Accessibility

The color system includes utilities for ensuring accessible text on different backgrounds:

```html
<div class="text-accessible-light">Accessible text on light backgrounds</div>
<div class="text-accessible-dark">Accessible text on dark backgrounds</div>
<div class="text-accessible-on-brand">Accessible text on brand color backgrounds</div>
<div class="text-accessible-on-glass">Accessible text on glass backgrounds</div>
```

These utilities automatically adjust font weight and letter spacing for optimal readability.
