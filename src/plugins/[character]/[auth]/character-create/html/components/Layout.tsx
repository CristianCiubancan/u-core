import React from 'react';
import { Button } from './Button';
import { CameraControls } from './CameraControls';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
  anchor: 'left' | 'top' | 'bottom' | 'right';
  onRotateCamera: (direction: 'left' | 'right') => void;
  onZoomCamera: (direction: 'in' | 'out') => void;
  onFocusCamera: (focus: 'head' | 'body' | 'legs') => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  title,
  onSave,
  onClose,
  isSaving,
  anchor = 'left',
  onRotateCamera,
  onZoomCamera,
  onFocusCamera,
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
    <div className={`inset-0 h-screen py-8 flex ${getPositionClasses()}`}>
      <div
        className={`glass-dark h-full font-smooth text-on-dark rounded-lg shadow-elevation-3 w-full sm:w-[90%] md:w-[60%] lg:w-[45%] xl:w-[35%] overflow-hidden flex flex-col ${getContainerClasses()}`}
      >
        {/* Header */}
        <div className="glass-brand-dark p-3 flex justify-between items-center border-b border-brand-700">
          <h1 className="text-responsive-xl font-semibold tracking-tight text-accessible-on-glass">
            {title}
          </h1>
          <div className="flex space-x-2">
            <Button
              variant="success"
              onClick={onSave}
              disabled={isSaving}
              className="text-responsive-sm"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="danger"
              onClick={onClose}
              className="text-responsive-sm"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">{children}</div>

        {/* Footer - Camera Controls */}
        <div className="glass-brand-dark p-2 border-t border-brand-700">
          <CameraControls
            onRotate={onRotateCamera}
            onZoom={onZoomCamera}
            onFocus={onFocusCamera}
          />
        </div>
      </div>
    </div>
  );
};
