import React from 'react';
import { Button } from './Button';

export type TabType = 'model' | 'face' | 'hair' | 'appearance' | 'clothing';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  const tabs: { id: TabType; label: string }[] = [
    { id: 'model', label: 'Character Model' },
    { id: 'face', label: 'Face' },
    { id: 'hair', label: 'Hair' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'clothing', label: 'Clothing' },
  ];

  return (
    <div className="w-[30%] min-w-[140px] max-w-[180px] glass-brand-dark p-3 border-r border-brand-800">
      <nav className="space-y-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant="tab"
            active={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </nav>
    </div>
  );
};
