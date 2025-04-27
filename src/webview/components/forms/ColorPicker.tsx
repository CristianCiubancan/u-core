import React, { useState, useRef, useEffect } from 'react';
import { colorPalettes, grayPalettes } from '../../theme/colors';
import Button from '../ui/Button'; // Assuming a Button component exists

interface ColorPickerProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'value'
  > {
  label?: string;
  containerClassName?: string;
  value?: string; // Controlled component value
  onChange?: (value: string) => void; // Callback for value change
  defaultValue?: string;
}

// Define the predefined colors using the 500 shade
const predefinedColors = [
  colorPalettes.red[500],
  colorPalettes.orange[500],
  colorPalettes.amber[500],
  colorPalettes.yellow[500],
  colorPalettes.lime[500],
  colorPalettes.green[500],
  colorPalettes.emerald[500],
  colorPalettes.teal[500],
  colorPalettes.cyan[500],
  colorPalettes.sky[500],
  colorPalettes.blue[500],
  colorPalettes.indigo[500],
  colorPalettes.violet[500],
  colorPalettes.purple[500],
  colorPalettes.fuchsia[500],
  colorPalettes.pink[500],
  colorPalettes.rose[500],
  grayPalettes.slate[500],
  grayPalettes.gray[500],
  grayPalettes.zinc[500],
  '#ffffff',
  '#000000',
];

const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  id,
  className,
  containerClassName,
  value: controlledValue,
  onChange,
  defaultValue = '#ffffff', // Default to white
  ...props
}) => {
  const inputId = id || `color-picker-${React.useId()}`;
  const nativeColorInputRef = useRef<HTMLInputElement>(null);

  // Internal state to manage uncontrolled component behavior or sync with controlled value
  const [internalValue, setInternalValue] = useState(
    controlledValue ?? defaultValue
  );

  // Effect to update internal state when controlled value changes
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  const handleColorChange = (newColor: string) => {
    setInternalValue(newColor);
    if (onChange) {
      onChange(newColor);
    }
    // Also update the native input value if it exists
    if (nativeColorInputRef.current) {
      nativeColorInputRef.current.value = newColor;
    }
  };

  const handleNativeInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    handleColorChange(event.target.value);
  };

  const openNativePicker = () => {
    nativeColorInputRef.current?.click();
  };

  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={inputId} // Keep label association, though input is hidden
          className="block text-sm font-medium text-on-light mb-1"
        >
          {label}
        </label>
      )}
      {/* Changed to flex-col for vertical layout */}
      <div className="flex flex-col gap-2">
        {/* Predefined Colors Grid */}
        <div className="grid grid-cols-7 gap-1 p-1 rounded glass-dark self-start">
          {' '}
          {/* Added self-start to prevent stretching */}
          {predefinedColors.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-6 h-6 rounded border border-white/10 hover:scale-110 transition-transform ${
                // Adjusted border for better visibility on glass
                internalValue === color
                  ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-blue-500' // Keep ring for selection
                  : ''
              }`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorChange(color)}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>

        {/* Bottom row for Preview and Tweak Button */}
        <div className="flex items-center gap-2">
          {/* Current Color Preview */}
          <div
            className="w-8 h-8 rounded border border-gray-500"
            style={{ backgroundColor: internalValue }}
          />
          {/* Tweak Button */}
          <Button
            onClick={openNativePicker}
            aria-label="Tweak color with system picker"
          >
            Tweak
          </Button>
        </div>

        {/* Hidden Native Color Input - remains outside the layout flow */}
        <input
          ref={nativeColorInputRef}
          type="color"
          id={inputId}
          value={internalValue} // Keep controlled by state
          onChange={handleNativeInputChange}
          className="absolute w-0 h-0 opacity-0 pointer-events-none" // Hide visually and from interaction
          {...props} // Pass remaining props like 'name'
        />
      </div>
    </div>
  );
};

export default ColorPicker;
