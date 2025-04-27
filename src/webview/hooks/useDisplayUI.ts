import { useState, useEffect, useCallback } from 'react';
import { isEnvBrowser } from '../utils/misc';
import { useNuiEvent } from './useNuiEvent';

/**
 * Hook to control UI visibility, ensuring it's always visible in browser environments
 * In the FiveM environment, it manages visibility based on received events
 * @returns Object with boolean for visibility and function to set it
 */
export const useDisplayUI = (): { 
  visible: boolean; 
  setVisible: (value: boolean) => void;
  hide: () => void;
  show: () => void;
  toggle: () => void;
} => {
  const [visible, setVisible] = useState(isEnvBrowser()); // Always visible in browser
  
  // If we're in a browser environment, force visibility to true on mount
  useEffect(() => {
    if (isEnvBrowser()) {
      setVisible(true);
    }
  }, []);

  // Listen for UI visibility events from the game client
  useNuiEvent('ui', (data) => {
    // If toggle property exists, use it, otherwise default to showing UI
    if (data && 'toggle' in data) {
      setVisible(!!data.toggle);
    } else {
      setVisible(true);
    }
  });

  // Listen for UI close events
  useNuiEvent('closeUI', () => {
    if (!isEnvBrowser()) {
      setVisible(false);
    }
  });

  // Memoized helper functions to prevent unnecessary re-renders
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => {
    // Only hide if not in browser environment
    if (!isEnvBrowser()) {
      setVisible(false);
    }
  }, []);
  const toggle = useCallback(() => setVisible(prev => !prev), []);

  return { visible, setVisible, show, hide, toggle };
};