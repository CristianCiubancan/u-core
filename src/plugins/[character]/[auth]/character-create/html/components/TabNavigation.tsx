import React from 'react';
import { Button } from './Button';
import { CameraControls } from './CameraControls';

export type TabType = 'model' | 'face' | 'hair' | 'appearance' | 'clothing';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onRotateCamera: (direction: 'left' | 'right') => void;
  onZoomCamera: (direction: 'in' | 'out') => void;
  onFocusCamera: (focus: 'head' | 'body' | 'legs') => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  onRotateCamera,
  onZoomCamera,
  onFocusCamera,
}) => {
  const tabs: { id: TabType; label: string }[] = [
    { id: 'model', label: 'Character Model' },
    { id: 'face', label: 'Face' },
    { id: 'hair', label: 'Hair' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'clothing', label: 'Clothing' },
  ];

  return (
    <div className="w-[30%] min-w-[100px] max-w-[140px] glass-brand-dark p-2 border-r border-brand-800">
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

      <div className="mt-8">
        <CameraControls
          onRotate={onRotateCamera}
          onZoom={onZoomCamera}
          onFocus={onFocusCamera}
        />
      </div>
    </div>
  );
};
