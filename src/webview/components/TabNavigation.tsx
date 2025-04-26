import React from 'react';
import Button from './Button';

interface Tab {
  id: string;
  label: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  orientation = 'vertical',
  className = '',
}) => {
  const isVertical = orientation === 'vertical';
  
  const containerClasses = isVertical
    ? `h-full glass-brand-dark p-3 ${className}`
    : `w-full glass-brand-dark p-3 ${className}`;
    
  const navClasses = isVertical
    ? 'space-y-2'
    : 'flex space-x-2';

  return (
    <div className={containerClasses}>
      <nav className={navClasses}>
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            size="base"
            fullWidth={isVertical}
            text={tab.label}
          />
        ))}
      </nav>
    </div>
  );
};

export default TabNavigation;
