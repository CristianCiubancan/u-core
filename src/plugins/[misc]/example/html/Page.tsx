import { useCallback, useState, useEffect } from 'react';
import { useNuiEvent } from '../../../../webview/hooks/useNuiEvent';
import { fetchNui } from '../../../../utils/fetchNui';
import { isEnvBrowser } from '../../../../utils/misc';

export default function Page() {
  const [isOpen, setIsOpen] = useState(false);

  // Log when component mounts
  useEffect(() => {
    console.log('[example:ui] Page component mounted');

    // For browser testing, automatically show UI
    if (isEnvBrowser()) {
      console.log(
        '[example:ui] Browser environment detected, showing UI for development'
      );
      setIsOpen(true);
    }
  }, []);

  // Listen for toggle events from the client script
  useNuiEvent('example:toggle-ui', (data) => {
    console.log('[example:ui] Received toggle event with data:', data);
    setIsOpen(!!data); // Convert to boolean
  });

  // Handle close button click
  const handleCloseUi = useCallback(async () => {
    console.log('[example:ui] Close button clicked, sending NUI message');
    try {
      const resp = await fetchNui('example:toggle-ui', { close: true });
      setIsOpen(false);
      console.log('[example:ui] Response from NUI callback:', resp);
    } catch (error) {
      console.error('[example:ui] Error sending NUI message:', error);
    }
  }, []);

  // Log state changes
  useEffect(() => {
    console.log(`[example:ui] UI is now ${isOpen ? 'open' : 'closed'}`);
  }, [isOpen]);

  // Render UI
  return isOpen ? (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '20px',
        borderRadius: '5px',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
      }}
    >
      <h1>Example UI</h1>
      <p>
        This UI is now visible! Press F2 or click the button below to close it.
      </p>
      <button
        onClick={handleCloseUi}
        style={{
          backgroundColor: '#f44336',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '10px',
        }}
      >
        Close UI
      </button>
    </div>
  ) : null;
}
