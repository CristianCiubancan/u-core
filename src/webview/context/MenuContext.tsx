// src/context/MenuContext.tsx
import React, { createContext } from 'react';

// Define menu types
export type MenuPosition = 'left' | 'right' | 'central' | 'toast';

export interface MenuState {
  left: {
    isOpen: boolean;
    content: React.ReactNode | null;
  };
  right: {
    isOpen: boolean;
    content: React.ReactNode | null;
  };
  central: {
    isOpen: boolean;
    content: React.ReactNode | null;
  };
  toast: {
    isOpen: boolean;
    content: React.ReactNode | null;
    duration?: number;
  };
}

export type MenuAction =
  | { type: 'OPEN_MENU'; position: MenuPosition; content: React.ReactNode }
  | { type: 'CLOSE_MENU'; position: MenuPosition }
  | { type: 'SHOW_TOAST'; content: React.ReactNode; duration?: number }
  | { type: 'HIDE_TOAST' };

// Initial state
export const initialState: MenuState = {
  left: { isOpen: false, content: null },
  right: { isOpen: false, content: null },
  central: { isOpen: false, content: null },
  toast: { isOpen: false, content: null },
};

// Reducer function
export const menuReducer = (
  state: MenuState,
  action: MenuAction
): MenuState => {
  switch (action.type) {
    case 'OPEN_MENU':
      return {
        ...state,
        [action.position]: {
          isOpen: true,
          content: action.content,
        },
      };
    case 'CLOSE_MENU':
      return {
        ...state,
        [action.position]: {
          ...state[action.position],
          isOpen: false,
          content: null,
        },
      };
    case 'SHOW_TOAST':
      return {
        ...state,
        toast: {
          isOpen: true,
          content: action.content,
          duration: action.duration || 3000,
        },
      };
    case 'HIDE_TOAST':
      return {
        ...state,
        toast: {
          ...state.toast,
          isOpen: false,
          content: null,
        },
      };
    default:
      return state;
  }
};

// Create the context
export interface MenuContextType {
  state: MenuState;
  showMenu: (position: MenuPosition, content: React.ReactNode) => void;
  closeMenu: (position: MenuPosition) => void;
  showToast: (content: React.ReactNode, duration?: number) => void;
  hideToast: () => void;
}

export const MenuContext = createContext<MenuContextType | undefined>(
  undefined
);
