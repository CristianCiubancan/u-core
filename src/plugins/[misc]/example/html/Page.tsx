import { useCallback, useEffect, useState } from 'react';
import { useNuiEvent } from '../../../../webview/hooks/useNuiEvent';
import { fetchNui } from '../../../../utils/fetchNui';

// Constants
const NUI_EVENT = 'example:toggle-ui';

export default function Page() {
  const [isOpen, setIsOpen] = useState(false);

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

  useEffect(() => {
    // listen for F2 key press
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        handleCloseUi();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Render UI
  return isOpen ? (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 text-white p-5 rounded-md shadow-lg text-center">
      <h1 className="text-xl font-bold">Example UI</h1>
      <p className="my-3">
        This UI is now visible! Press F2 or click the button below to close it.
      </p>
      <button
        onClick={handleCloseUi}
        className="bg-red-500 text-white py-2 px-5 rounded cursor-pointer mt-3 hover:bg-red-600 transition-colors"
      >
        Close UI
      </button>
    </div>
  ) : null;
}
