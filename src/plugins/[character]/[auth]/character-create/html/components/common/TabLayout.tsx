import React, { ReactNode } from 'react';

interface TabLayoutProps {
  title: string;
  children: ReactNode;
}

/**
 * Reusable tab layout component with consistent styling
 */
export const TabLayout: React.FC<TabLayoutProps> = ({ title, children }) => {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      {children}
    </div>
  );
};
