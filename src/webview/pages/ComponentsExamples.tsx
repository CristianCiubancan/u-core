import React, { useState } from 'react';
import Container from '../components/ui/Container';
import Button from '../components/ui/Button';
import FormInput from '../components/forms/FormInput';
import FormSelect from '../components/forms/FormSelect';
import FormTextarea from '../components/forms/FormTextarea';
import DatePicker from '../components/forms/DatePicker'; // Added DatePicker import
import ColorPicker from '../components/forms/ColorPicker'; // Added ColorPicker import
import { useMenuSystem } from '../hooks/useMenuSystem';
import { getImageUrl } from '../utils/file';

const ComponentsExamples: React.FC = () => {
  const { showToast } = useMenuSystem();
  const [inputValue, setInputValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null); // Added state for DatePicker
  const [selectedColor, setSelectedColor] = useState('#ffffff'); // Added state for ColorPicker
  const backgroundImageUrl = getImageUrl('bg');

  return (
    <div
      className="w-full min-h-screen p-8"
      style={{
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <h1 className="text-4xl font-bold mb-8 text-center text-white text-shadow">
        UI Components
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Buttons Section */}
        <Container>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Buttons</h2>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Default Button</h3>
                <Button onClick={() => showToast('Default button clicked')}>
                  Default Button
                </Button>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Full Width Button
                </h3>
                <Button
                  fullWidth
                  onClick={() => showToast('Full width button clicked')}
                >
                  Full Width Button
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Multi-Button Layout
                  </h3>
                  <Button onClick={() => showToast('Button 1 clicked')}>
                    Button 1
                  </Button>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">&nbsp;</h3>
                  <Button onClick={() => showToast('Button 2 clicked')}>
                    Button 2
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Container>

        {/* Form Inputs Section */}
        <Container>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Form Inputs</h2>

            <FormInput
              id="example-input"
              label="Text Input"
              placeholder="Enter some text..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />

            <FormInput
              id="example-input-number"
              label="Number Input"
              type="number"
              placeholder="Enter a number..."
              value=""
              onChange={() => {}}
            />

            <Button
              onClick={() => {
                if (inputValue) {
                  showToast(`Input value: ${inputValue}`);
                } else {
                  showToast('Please enter a value');
                }
              }}
            >
              Submit Input
            </Button>
          </div>
        </Container>

        {/* Select Dropdown Section */}
        <Container>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Select Dropdown</h2>

            <FormSelect
              id="example-select"
              label="Select Option"
              options={[
                { label: 'Option 1', value: '1' },
                { label: 'Option 2', value: '2' },
                { label: 'Option 3', value: '3' },
                { label: 'Option 4', value: '4' },
                { label: 'Option 5', value: '5' },
              ]}
              value={selectValue}
              onChange={setSelectValue}
            />

            <div className="h-6 text-sm">
              {selectValue && <p>Selected value: {selectValue}</p>}
            </div>

            <Button
              onClick={() => {
                if (selectValue) {
                  showToast(`Selected option: ${selectValue}`);
                } else {
                  showToast('Please select an option');
                }
              }}
            >
              Submit Selection
            </Button>
          </div>
        </Container>

        {/* Textarea Section */}
        <Container>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Text Area</h2>

            <FormTextarea
              id="example-textarea"
              label="Text Area"
              placeholder="Enter multi-line text here..."
              value={textareaValue}
              onChange={(e) => setTextareaValue(e.target.value)}
              maxLength={100}
              rows={4}
            />

            <Button
              onClick={() => {
                if (textareaValue) {
                  showToast(`Textarea value: ${textareaValue.slice(0, 20)}...`);
                } else {
                  showToast('Please enter some text');
                }
              }}
            >
              Submit Text
            </Button>
          </div>
        </Container>

        {/* Glass Container Styles */}
        <Container>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Glass Container Styles</h2>

            <div className="space-y-4">
              <div className="glass p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Glass</h3>
                <p>Default glass container with light background</p>
              </div>

              <div className="glass-dark p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Glass Dark</h3>
                <p>Dark version with higher contrast</p>
              </div>

              <div className="glass-brand p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Glass Brand</h3>
                <p>Brand color styled glass effect</p>
              </div>

              <div className="glass-brand-dark p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Glass Brand Dark</h3>
                <p>Dark version of the brand glass style</p>
              </div>
            </div>
          </div>
        </Container>

        {/* Typography & Text Styles */}
        <Container>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">
              Typography & Text Styles
            </h2>

            <div className="space-y-4">
              <div>
                <h1 className="text-4xl font-bold">Heading 1</h1>
              </div>

              <div>
                <h2 className="text-3xl font-bold">Heading 2</h2>
              </div>

              <div>
                <h3 className="text-2xl font-semibold">Heading 3</h3>
              </div>

              <div>
                <h4 className="text-xl font-semibold">Heading 4</h4>
              </div>

              <div>
                <p className="text-base">Regular paragraph text</p>
              </div>

              <div>
                <p className="text-sm">Small text for details</p>
              </div>

              <div>
                <p className="text-shadow">Text with shadow</p>
              </div>
            </div>
          </div>
        </Container>

        {/* Date Picker Section */}
        <Container>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Date Picker</h2>

            <DatePicker
              id="example-datepicker"
              label="Select a Date"
              selected={selectedDate} // Changed prop name from selectedDate to selected
              onChange={setSelectedDate}
            />

            <div className="h-6 text-sm">
              {selectedDate && (
                <p>Selected date: {selectedDate.toLocaleDateString()}</p>
              )}
            </div>

            <Button
              onClick={() => {
                if (selectedDate) {
                  showToast(
                    `Selected date: ${selectedDate.toLocaleDateString()}`
                  );
                } else {
                  showToast('Please select a date');
                }
              }}
            >
              Submit Date
            </Button>
          </div>
        </Container>

        {/* Color Picker Section */}
        <Container>
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-6">Color Picker</h2>

            <ColorPicker
              id="example-colorpicker"
              label="Select a Color"
              value={selectedColor}
              onChange={(color) => setSelectedColor(color)} // Directly use the color string
            />

            <div className="h-6 text-sm flex items-center space-x-2">
              {selectedColor && (
                <>
                  <p>Selected color:</p>
                  <div
                    className="w-4 h-4 rounded border border-gray-400"
                    style={{ backgroundColor: selectedColor }}
                  ></div>
                  <span>{selectedColor}</span>
                </>
              )}
            </div>

            <Button
              onClick={() => {
                if (selectedColor) {
                  showToast(`Selected color: ${selectedColor}`);
                } else {
                  showToast('Please select a color');
                }
              }}
            >
              Submit Color
            </Button>
          </div>
        </Container>
      </div>

      <div className="mt-8 text-center">
        <Button
          onClick={() =>
            showToast('This is a toast notification example', 3000)
          }
        >
          Show Toast Notification
        </Button>
      </div>
    </div>
  );
};

export default ComponentsExamples;
