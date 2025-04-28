import React from 'react';
import Button from '../../../../../../../webview/components/ui/Button';
import { TabType } from '../../../shared/types';

interface TabButtonProps {
  tab: TabType;
  activeTab: TabType;
  label: string;
  onClick: (tab: TabType) => void;
}

/**
 * Reusable tab button component with consistent styling
 */
export const TabButton: React.FC<TabButtonProps> = ({
  tab,
  activeTab,
  label,
  onClick,
}) => {
  return (
    <Button
      onClick={() => onClick(tab)}
      fullWidth
      className={`${
        activeTab === tab ? 'glass-brand' : 'glass-brand-dark'
      }`}
    >
      {label}
    </Button>
  );
};
