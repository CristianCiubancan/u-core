// src/context/MenuProvider.tsx
import React, { useReducer, useRef, useEffect } from 'react';
import {
  MenuContext,
  MenuContextType,
  MenuState,
  initialState,
  menuReducer,
} from './MenuContext';

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(menuReducer, initialState);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showMenu = (position: keyof MenuState, content: React.ReactNode) => {
    dispatch({ type: 'OPEN_MENU', position, content });
  };

  const closeMenu = (position: keyof MenuState) => {
    dispatch({ type: 'CLOSE_MENU', position });
  };

  const showToast = (content: React.ReactNode, duration = 3000) => {
    // Clear existing timeout if there is one
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }

    dispatch({ type: 'SHOW_TOAST', content, duration });

    // Only set timeout if duration is positive
    if (duration > 0) {
      toastTimeoutRef.current = setTimeout(() => {
        hideToast();
        toastTimeoutRef.current = null;
      }, duration);
    }
  };

  const hideToast = () => {
    dispatch({ type: 'HIDE_TOAST' });
  };

  const value: MenuContextType = {
    state,
    showMenu,
    closeMenu,
    showToast,
    hideToast,
  };

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
};
