import React from 'react';
import { Button } from './Button';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
  anchor: 'left' | 'top' | 'bottom' | 'right';
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  onSave,
  onClose,
  isSaving,
  anchor = 'left',
}) => {
  // Determine positioning classes based on anchor
  const getPositionClasses = () => {
    switch (anchor) {
      case 'left':
        return 'items-center justify-start';
      case 'right':
        return 'items-center justify-end';
      case 'top':
        return 'items-start justify-center';
      case 'bottom':
        return 'items-end justify-center';
      default:
        return 'items-center justify-start'; // Default to left positioning
    }
  };

  // Determine container classes based on anchor
  const getContainerClasses = () => {
    switch (anchor) {
      case 'left':
        return 'ml-4';
      case 'right':
        return 'mr-4';
      case 'top':
        return 'mt-4';
      case 'bottom':
        return 'mb-4';
      default:
        return 'ml-4'; // Default to left margin
    }
  };

  return (
    <div
      className={`absolute inset-0 flex bg-black bg-opacity-50 ${getPositionClasses()}`}
    >
      <div
        className={`glass-dark font-smooth text-on-dark rounded-lg shadow-elevation-3 w-full sm:w-[90%] md:w-[60%] lg:w-[45%] xl:w-[35%] overflow-hidden ${getContainerClasses()}`}
      >
        {/* Header */}
        <div className="glass-brand-dark p-3 flex justify-between items-center border-b border-brand-700">
          <h1 className="text-xl font-semibold tracking-tight text-accessible-on-glass">
            {title}
          </h1>
          <div className="flex space-x-2">
            <Button
              variant="success"
              onClick={onSave}
              disabled={isSaving}
              className="text-sm"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="danger" onClick={onClose} className="text-sm">
              Cancel
            </Button>
          </div>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  );
};
