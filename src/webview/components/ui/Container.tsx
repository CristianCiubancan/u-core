import { ReactNode } from 'react';

/**
 * Generic container — uses the dossier-paper translucent surface so
 * any plugin's main panel inherits the framework aesthetic by default.
 * Drop in custom paddings via children, or wrap your own layout.
 */
const Container = ({ children }: { children: ReactNode }) => {
  return (
    <div className="dossier-paper w-full max-h-screen overflow-y-auto p-6">
      {children}
    </div>
  );
};

export default Container;
