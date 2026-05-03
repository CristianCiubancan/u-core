import React, { ReactNode } from 'react';

interface TabLayoutProps {
  title: string;
  children: ReactNode;
}

/**
 * Dossier-style tabbed section layout. Title gets the section meta
 * treatment (small mono uppercase). Children fill the remaining
 * vertical space.
 */
const TabLayout: React.FC<TabLayoutProps> = ({ title, children }) => {
  return (
    <div className="flex flex-col h-full">
      <h2 className="dossier-section-title mb-4 flex-shrink-0">{title}</h2>
      <div className="flex-grow min-h-0">{children}</div>
    </div>
  );
};

export default TabLayout;
