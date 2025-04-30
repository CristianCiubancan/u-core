import React, { ReactNode } from 'react';
import Button from '../../../../../../../../webview/components/ui/Button';
import { IconWrapper } from '../../common';

// Custom clothing category button component
interface ClothingCategoryButtonProps {
  id: string;
  activeCategory: string;
  label: string;
  icon: ReactNode;
  onClick: (id: string) => void;
}

export const ClothingCategoryButton: React.FC<ClothingCategoryButtonProps> = ({
  id,
  activeCategory,
  label,
  icon,
  onClick,
}) => {
  return (
    <Button
      onClick={() => onClick(id)}
      fullWidth
      className={`${
        activeCategory === id ? 'glass-brand' : 'glass-brand-dark'
      } flex flex-col items-center justify-center py-2`}
    >
      <IconWrapper className="mb-1" size="1.5em">
        {icon}
      </IconWrapper>
      <span className="text-xs">{label}</span>
    </Button>
  );
};
