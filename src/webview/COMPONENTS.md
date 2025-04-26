# UI Component Library

This document provides an overview of the shared UI component library located in the `src/webview/components` directory. These components are designed to be used across all plugins to ensure a consistent look and feel throughout the application.

## Why Use Shared Components?

- **Consistency**: Ensures UI elements look and behave the same across all plugins
- **Maintainability**: Changes to components only need to be made in one place
- **Efficiency**: Reduces duplicate code and speeds up development
- **Accessibility**: Shared components can implement accessibility best practices once and benefit all plugins

## Available Components

### Basic Input Components

#### Button

A versatile button component with various styles and states.

```tsx
import { Button } from '../../../webview/components';

<Button 
  variant="primary" // 'primary', 'secondary', 'success', 'danger', 'tab'
  size="base" // 'sm', 'base', 'lg'
  onClick={handleClick}
  disabled={isLoading}
  fullWidth={true}
>
  Click Me
</Button>
```

#### FormInput

A text input field with label.

```tsx
import { FormInput } from '../../../webview/components';

<FormInput
  id="username"
  label="Username"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  placeholder="Enter your username"
  type="text" // 'text', 'password', 'email', etc.
/>
```

#### FormSelect

A dropdown select component.

```tsx
import { FormSelect } from '../../../webview/components';

const options = [
  { label: 'Option 1', value: 'option1' },
  { label: 'Option 2', value: 'option2' },
];

<FormSelect
  id="select"
  label="Select an option"
  value={selectedValue}
  onChange={setSelectedValue}
  options={options}
/>
```

#### FormTextarea

A multi-line text input.

```tsx
import { FormTextarea } from '../../../webview/components';

<FormTextarea
  id="description"
  label="Description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={4}
  placeholder="Enter a description"
/>
```

#### SliderInput

A range slider with min/max labels and value display.

```tsx
import { SliderInput } from '../../../webview/components';

<SliderInput
  label="Volume"
  min={0}
  max={100}
  value={volume}
  onChange={setVolume}
  showValue={true}
  valueLabel="Volume"
/>
```

#### DatePicker

A date selection component.

```tsx
import { DatePicker } from '../../../webview/components';

<DatePicker
  id="date"
  label="Select a date"
  selected={selectedDate}
  onChange={setSelectedDate}
  minDate={new Date()}
/>
```

### Layout Components

#### GlassContainer

A container with glass morphism effect.

```tsx
import { GlassContainer } from '../../../webview/components';

<GlassContainer>
  <h1>Content with glass effect</h1>
  <p>This content will have a glass-like appearance.</p>
</GlassContainer>
```

#### Card

A card component with optional header and footer.

```tsx
import { Card } from '../../../webview/components';

<Card 
  title="Card Title"
  footerContent={<Button>Action</Button>}
>
  <p>Card content goes here.</p>
</Card>
```

#### Panel

A simple panel with various glass effect variants.

```tsx
import { Panel } from '../../../webview/components';

<Panel variant="brand-dark">
  <p>Panel content with brand-dark glass effect.</p>
</Panel>
```

#### Layout

A full-page layout with header and content areas.

```tsx
import { Layout } from '../../../webview/components';

<Layout
  title="Page Title"
  position="center"
  width="medium"
  onSave={handleSave}
  onClose={handleClose}
>
  <div>Main content goes here</div>
</Layout>
```

#### TabNavigation

A navigation component for tabbed interfaces.

```tsx
import { TabNavigation } from '../../../webview/components';

const tabs = [
  { id: 'tab1', label: 'Tab 1' },
  { id: 'tab2', label: 'Tab 2' },
];

<TabNavigation
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
  orientation="vertical"
/>
```

### Feedback Components

#### MenuSystem

A system for managing modals, side menus, and toasts.

```tsx
import { useMenuSystem } from '../../../webview/context/MenuContext';

function MyComponent() {
  const { showMenu, showToast } = useMenuSystem();
  
  const handleShowModal = () => {
    showMenu('central', <div>Modal content</div>);
  };
  
  const handleShowToast = () => {
    showToast(<div>Toast message</div>, 3000);
  };
  
  return (
    <div>
      <Button onClick={handleShowModal}>Show Modal</Button>
      <Button onClick={handleShowToast}>Show Toast</Button>
    </div>
  );
}
```

## Best Practices

1. **Always import from the components directory**:
   ```tsx
   // Good
   import { Button } from '../../../webview/components';
   
   // Avoid
   import Button from '../../../webview/components/Button';
   ```

2. **Use semantic variants and classes**:
   ```tsx
   // Good
   <Button variant="success">Save</Button>
   
   // Avoid custom classes when possible
   <button className="bg-green-500 hover:bg-green-600">Save</button>
   ```

3. **Maintain responsive design**:
   ```tsx
   // Good - uses responsive text classes
   <Card title="My Card">
     <p className="text-responsive-base">Content</p>
   </Card>
   
   // Avoid fixed sizes
   <div style={{ width: '500px' }}>Content</div>
   ```

4. **Extend components with composition, not duplication**:
   If you need a specialized version of a component, compose it using existing components rather than duplicating code.

## Contributing to the Component Library

When adding new components or modifying existing ones:

1. Ensure proper TypeScript typing
2. Add appropriate documentation
3. Use existing Tailwind classes and design patterns
4. Update the index.ts file to export the new component
5. Consider backward compatibility
