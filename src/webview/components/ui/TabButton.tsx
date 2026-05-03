import { ReactNode } from 'react';
import IconWrapper from './IconWrapper';

interface TabButtonProps<T extends string> {
  tab: T;
  activeTab: T;
  label: string;
  icon?: ReactNode;
  onClick: (tab: T) => void;
}

/**
 * Dossier-style tab button — flat segment with a hairline underline
 * that turns indigo on the active tab. No glass-pill backgrounds.
 * Pair siblings inside a flex container for a horizontal tab row.
 */
const TabButton = <T extends string>({
  tab,
  activeTab,
  label,
  icon,
  onClick,
}: TabButtonProps<T>) => {
  const isActive = activeTab === tab;
  return (
    <button
      type="button"
      onClick={() => onClick(tab)}
      className={`flex-1 flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors border-b ${
        isActive
          ? 'text-brand-200 border-brand-400'
          : 'text-gray-400 border-gray-800 hover:text-gray-200 hover:border-gray-600'
      } font-mono text-[9.5px] tracking-[0.25em] uppercase`}
    >
      {icon && (
        <IconWrapper className="text-base" size="1.25em">
          {icon}
        </IconWrapper>
      )}
      <span>{label}</span>
    </button>
  );
};

export default TabButton;
