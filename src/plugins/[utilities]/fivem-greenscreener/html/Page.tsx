import React, { useState } from 'react';
import { useNuiEvent } from '../../../../webview/hooks/useNuiEvent';

// Define interfaces for the expected NUI message structures
interface NuiMessage<T = unknown> {
  action: string;
  data?: T;
}

interface ProgressData {
  type: string;
  value: number;
  max: number;
}

interface ErrorData {
  type: string;
}

const Page: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [progressText, setProgressText] = useState('');

  // Handle progress updates
  useNuiEvent<NuiMessage<ProgressData>>(
    'progressUpdate',
    (message: NuiMessage<ProgressData>) => {
      if (message.data) {
        setProgressText(
          `${message.data.value}/${message.data.max} ${message.data.type}`
        );
        setIsVisible(true); // Ensure container is visible during progress
      }
    }
  );

  // Handle start event
  useNuiEvent<NuiMessage>('start', () => {
    // No data expected, so use NuiMessage without data generic
    setProgressText('Loading up ...');
    setIsVisible(true);
  });

  // Handle end event
  useNuiEvent<NuiMessage>('end', () => {
    // No data expected
    setProgressText('Finished!');
    setTimeout(() => {
      setIsVisible(false);
    }, 2000);
  });

  // Handle error event
  useNuiEvent<NuiMessage<ErrorData>>(
    'error',
    (message: NuiMessage<ErrorData>) => {
      if (message.data?.type === 'weathersync') {
        setProgressText('Disable weathersync resource!');
      } else {
        setProgressText('Error!');
      }
      setIsVisible(true); // Show error message
      setTimeout(() => {
        setIsVisible(false);
      }, 2000);
    }
  );

  if (!isVisible) {
    return null; // Don't render anything if not visible
  }

  // Styling to match our HTML implementation
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '5%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '10px 20px',
    borderRadius: '5px',
    zIndex: 1000, // Ensure it's on top
    textAlign: 'center',
  };

  return (
    <div style={containerStyle}>
      <p>{progressText}</p>
    </div>
  );
};

export default Page;
