import { ReactNode } from 'react';
import Button from './Button';
import IconWrapper from './IconWrapper';

interface TabButtonProps<T extends string> {
  tab: T;
  activeTab: T;
  label: string;
  icon?: ReactNode;
  onClick: (tab: T) => void;
}

/**
 * Reusable tab button component with consistent styling
 */
const TabButton = <T extends string>({
  tab,
  activeTab,
  label,
  icon,
  onClick,
}: TabButtonProps<T>) => {
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

export default TabButton;
