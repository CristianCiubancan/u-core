import React, { ReactNode } from 'react';

interface TabLayoutProps {
  title: string;
  children: ReactNode;
}

/**
 * Reusable tab layout component with consistent styling
 */
const TabLayout: React.FC<TabLayoutProps> = ({ title, children }) => {
  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-bold mb-4 flex-shrink-0">{title}</h2>
      <div className="flex-grow min-h-0">{children}</div>
    </div>
  );
};

export default TabLayout;
