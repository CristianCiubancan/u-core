import { useContext } from 'react';
import { MenuContext } from '../context/MenuContext';
import type { MenuContextType } from '../context/MenuContext';

export const useMenuSystem = (): MenuContextType => {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenuSystem must be used within a MenuProvider');
  }
  return context;
};
