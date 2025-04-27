import { useCallback, useEffect, useState } from 'react';
import { useNuiEvent } from '../../../../webview/hooks/useNuiEvent';
import { fetchNui } from '../../../../webview/utils/fetchNui';
import Container from '../../../../webview/components/ui/Container';

// Constants
const NUI_EVENT = 'example:toggle-ui';

export default function Page() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  // Listen for toggle events from the client script
  useNuiEvent(NUI_EVENT, (data) => {
    console.log(`${NUI_EVENT} event received: ${data}`);
    setIsOpen(!!data);
  });

  // Handle close button click
  const handleCloseUi = useCallback(async () => {
    try {
      await fetchNui(NUI_EVENT, { close: true });
      setIsOpen(false);
    } catch (error) {
      console.error('[UI] Failed to close UI:', error);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    console.log('Form submitted:', { name, description, category });
    // Here you would typically send this data to the server
  }, [name, description, category]);

  useEffect(() => {
    // listen for F2 key press
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        handleCloseUi();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseUi]);

  // Category options for the select input
  const categoryOptions = [
    { label: 'Category 1', value: 'category1' },
    { label: 'Category 2', value: 'category2' },
    { label: 'Category 3', value: 'category3' },
  ];

  // Render UI
  return isOpen ? (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1/3 max-w-md">
      <Container>
        <Card
          title="Example UI"
          footerContent={
            <div className="flex justify-between">
              <Button variant="primary" onClick={handleSubmit}>
                Submit
              </Button>
              <Button variant="danger" onClick={handleCloseUi}>
                Close UI
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-responsive-base text-primary">
              This UI demonstrates the use of shared components from the webview
              folder.
            </p>

            <FormInput
              id="name"
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />

            <FormSelect
              id="category"
              label="Category"
              value={category}
              onChange={setCategory}
              options={categoryOptions}
            />

            <FormTextarea
              id="description"
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description"
            />
          </div>
        </Card>
      </Container>
    </div>
  ) : null;
}
