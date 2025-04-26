# UI Component Library

This directory contains reusable UI components for use across all plugins in the application. The goal is to maintain a consistent look and feel throughout the application by using these shared components.

## Available Components

### Basic Input Components

- **Button**: A versatile button component with various sizes, variants, and states.
- **FormInput**: A text input field with label.
- **FormSelect**: A dropdown select component.
- **FormTextarea**: A multi-line text input.
- **SliderInput**: A range slider with min/max labels and value display.
- **DatePicker**: A date selection component.

### Layout Components

- **GlassContainer**: A container with glass morphism effect.
- **Card**: A card component with optional header and footer.
- **Panel**: A simple panel with various glass effect variants.
- **Layout**: A full-page layout with header and content areas.
- **TabNavigation**: A navigation component for tabbed interfaces.

### Feedback Components

- **MenuSystem**: A system for managing modals, side menus, and toasts.

## Usage

Import components directly from the components directory:

```tsx
import { Button, FormInput, Card } from '../../../webview/components';

function MyComponent() {
  return (
    <Card title="My Form">
      <FormInput 
        id="name"
        label="Name"
        value={name}
        onChange={handleNameChange}
      />
      <Button variant="primary" onClick={handleSubmit}>
        Submit
      </Button>
    </Card>
  );
}
```

## Styling

All components use Tailwind CSS classes for styling, with a focus on using the semantic classes defined in the tailwind.config.js file. The components are designed to be responsive and work well on different screen sizes.

Key styling features:
- Glass morphism effects using the `.glass-*` classes
- Responsive text using the `.text-responsive-*` classes
- Semantic color tokens for consistent theming
- Proper focus states for accessibility
