import React, { ReactNode } from 'react';
import Button from '../../../../../../../webview/components/ui/Button';
import { TabType } from '../../../shared/types';
import { IconWrapper } from './IconWrapper';

interface TabButtonProps {
  tab: TabType;
  activeTab: TabType;
  label: string;
  icon?: ReactNode;
  onClick: (tab: TabType) => void;
}

/**
 * Reusable tab button component with consistent styling
 */
export const TabButton: React.FC<TabButtonProps> = ({
  tab,
  activeTab,
  label,
  icon,
  onClick,
}) => {
  return (
    <Button
      onClick={() => onClick(tab)}
      fullWidth
      className={`${
        activeTab === tab ? 'glass-brand' : 'glass-brand-dark'
      } flex flex-col items-center justify-center py-2`}
    >
      {icon && (
        <IconWrapper className="mb-1" size="1.5em">
          {icon}
        </IconWrapper>
      )}
      <span className="text-xs">{label}</span>
    </Button>
  );
};
